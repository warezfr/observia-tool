import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal, get_db, AnalysisDB
from app.db.repositories import AnalysisRepository, AuditLogRepository, RecommendationRepository, EnvironmentRepository
from app.models.analysis import AnalysisCreate, AnalysisResponse, AnalysisStatus

router = APIRouter()


class CompareBatchRequest(BaseModel):
    ids: list[int] = Field(..., min_length=2, max_length=5)


def _completeness_score(result: dict | None) -> int | None:
    if not isinstance(result, dict):
        return None
    completeness = result.get("completeness")
    if not isinstance(completeness, dict):
        return None
    if completeness.get("complete"):
        return 100
    required = completeness.get("required") or []
    satisfied = completeness.get("satisfied") or []
    if not required:
        return 100 if completeness.get("complete") else 0
    return round(100 * len(satisfied) / len(required))


def _derive_health_status(analysis: AnalysisDB | None) -> str:
    if not analysis:
        return "unknown"
    status = analysis.status
    if status == "failed":
        return "critical"
    if status in ("partial", "queued", "running"):
        return "warning"
    if status == "completed":
        result = analysis.result if isinstance(analysis.result, dict) else {}
        completeness = result.get("completeness")
        if isinstance(completeness, dict) and not completeness.get("complete", True):
            return "warning"
        return "healthy"
    return "unknown"


@router.post("/", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    data: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    repo = AnalysisRepository(db)
    analysis = await repo.create(data)
    await AuditLogRepository(db).log(
        "analysis.create",
        "analysis",
        analysis.id,
        detail={"type": data.analysis_type.value, "environment_id": data.environment_id},
    )
    from app.core.analysis_engine import run_analysis
    background_tasks.add_task(run_analysis, analysis.id)
    return analysis


@router.get("/", response_model=list[AnalysisResponse])
async def list_analyses(
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None, description="Filter by status (queued, running, completed, failed)"),
    type: str | None = Query(None, alias="type", description="Filter by analysis type (performance, availability, security, cost)"),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalysisRepository(db)
    return await repo.get_all(limit=limit, status=status, analysis_type=type)


@router.get("/health-overview")
async def health_overview(db: AsyncSession = Depends(get_db)):
    """Per-environment health snapshot from the latest analysis."""
    env_repo = EnvironmentRepository(db)
    analysis_repo = AnalysisRepository(db)
    latest_by_env = {a.environment_id: a for a in await analysis_repo.get_latest_per_environment()}

    environments = []
    for env in await env_repo.get_all():
        latest = latest_by_env.get(env.id)
        environments.append({
            "environment_id": env.id,
            "environment_name": env.name,
            "status": _derive_health_status(latest),
            "last_analysis_type": latest.analysis_type if latest else None,
            "last_analysis_id": latest.id if latest else None,
            "last_analysis_at": latest.created_at.isoformat() if latest and latest.created_at else None,
            "completeness_pct": _completeness_score(latest.result if latest else None),
        })

    return {"environments": environments}


@router.post("/compare-batch")
async def compare_analyses_batch(
    body: CompareBatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Compare metric signals across 2–5 analyses."""
    from app.api.v1.reports import _extract_metric_signals

    repo = AnalysisRepository(db)
    analyses = []
    for analysis_id in body.ids:
        analysis = await repo.get_by_id(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
        analyses.append(analysis)

    metric_values: dict[str, list[dict]] = {}
    for analysis in analyses:
        for signal in _extract_metric_signals(analysis):
            metric_values.setdefault(signal["metric"], []).append({
                "analysis_id": analysis.id,
                "avg": signal["avg"],
                "latest": signal["latest"],
            })

    return {
        "analyses": [
            {
                "id": analysis.id,
                "environment_id": analysis.environment_id,
                "type": analysis.analysis_type,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
            }
            for analysis in analyses
        ],
        "metrics": [
            {"metric": metric, "values": values}
            for metric, values in sorted(metric_values.items())
        ],
    }


@router.get("/{analysis_id}/stream")
async def stream_analysis(analysis_id: int):
    """Server-Sent Events stream of analysis status + reasoning steps.

    Emits an event whenever the number of reasoning steps or the status changes,
    then closes once the analysis reaches a terminal state.
    """

    async def event_generator():
        last_signature = None
        terminal = {"completed", "partial", "failed"}
        for _ in range(600):  # ~20 min safety cap at 2s interval
            async with AsyncSessionLocal() as db:
                analysis = await AnalysisRepository(db).get_by_id(analysis_id)
            if not analysis:
                yield f"event: error\ndata: {json.dumps({'detail': 'not found'})}\n\n"
                return
            steps = analysis.reasoning_steps or []
            signature = (analysis.status, len(steps))
            if signature != last_signature:
                last_signature = signature
                payload = {
                    "status": analysis.status,
                    "steps": steps,
                    "step_count": len(steps),
                }
                yield f"data: {json.dumps(payload)}\n\n"
            if analysis.status in terminal:
                yield "event: done\ndata: {}\n\n"
                return
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{analysis_id}/comparison")
async def compare_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Compare an analysis to the previous one for the same environment and type.

    Returns per-metric deltas (latest value and average) so regressions in
    latency/errors are easy to spot.
    """
    from app.api.v1.reports import _extract_metric_signals

    repo = AnalysisRepository(db)
    current = await repo.get_by_id(analysis_id)
    if not current:
        raise HTTPException(status_code=404, detail="Analysis not found")

    previous = await repo.get_previous(current)
    if not previous:
        return {"has_baseline": False, "metrics": []}

    cur_signals = {s["metric"]: s for s in _extract_metric_signals(current)}
    prev_signals = {s["metric"]: s for s in _extract_metric_signals(previous)}

    metrics_diff = []
    for metric, cur in cur_signals.items():
        prev = prev_signals.get(metric)
        if not prev:
            continue
        delta_avg = round(cur["avg"] - prev["avg"], 3)
        pct = round((delta_avg / prev["avg"] * 100), 2) if prev["avg"] else None
        metrics_diff.append({
            "metric": metric,
            "current_avg": cur["avg"],
            "previous_avg": prev["avg"],
            "delta_avg": delta_avg,
            "delta_pct": pct,
            "regressed": delta_avg > 0,
        })

    return {
        "has_baseline": True,
        "baseline_analysis_id": previous.id,
        "baseline_created_at": previous.created_at.isoformat() if previous.created_at else None,
        "metrics": metrics_diff,
    }


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    repo = AnalysisRepository(db)
    analysis = await repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an analysis and its associated recommendations."""
    repo = AnalysisRepository(db)
    analysis = await repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Delete associated recommendations first
    rec_repo = RecommendationRepository(db)
    await rec_repo.delete_by_analysis_id(analysis_id)

    # Delete the analysis
    await repo.delete(analysis_id)
    return None
