import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal

from app.db.database import get_db
from app.db.repositories import AnalysisRepository, AuditLogRepository, RecommendationRepository
from app.models.analysis import AnalysisCreate, AnalysisResponse, AnalysisStatus

router = APIRouter()


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
