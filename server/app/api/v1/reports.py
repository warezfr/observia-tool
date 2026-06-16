from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from pydantic import BaseModel
from typing import Literal

from app.core.metrics import metrics
from app.db.database import AIProviderDB, AnalysisDB, RecommendationDB, get_db
from app.db.repositories import AnalysisRepository
from app.models.analysis import AnalysisResponse

router = APIRouter()


class ReportGenerateRequest(BaseModel):
    analysis_id: int
    format: Literal["json", "markdown"]
    include_raw_data: bool = False


class ReportResponse(BaseModel):
    id: int
    analysis_id: int
    format: str
    content: str
    include_raw_data: bool


class ReportSummary(BaseModel):
    total_analyses: int
    completed: int
    failed: int
    success_rate: float
    average_duration: float
    most_common_errors: list[str]
    recommendations_generated: int


class ChartData(BaseModel):
    date: str
    count: int


class ProviderUsage(BaseModel):
    provider: str
    count: int


def generate_json_report(analysis: AnalysisDB, recommendations: list, include_raw_data: bool) -> dict:
    """Generate a JSON format report."""
    report = {
        "analysis_id": analysis.id,
        "analysis_type": analysis.analysis_type,
        "status": analysis.status,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
        "recommendations_count": len(recommendations),
        "recommendations": [
            {
                "title": rec.title,
                "description": rec.description,
                "impact": rec.impact,
                "level": rec.level,
                "severity": rec.severity,
                "status": rec.status,
                "action": rec.action,
                "script": rec.script,
                "script_type": rec.script_type,
            }
            for rec in recommendations
        ],
    }
    if include_raw_data:
        report["result"] = analysis.result
        report["reasoning_steps"] = analysis.reasoning_steps
    return report


def generate_markdown_report(analysis: AnalysisDB, recommendations: list, include_raw_data: bool) -> str:
    """Generate a Markdown format report."""
    lines = [
        f"# Analysis Report #{analysis.id}",
        "",
        f"**Analysis Type:** {analysis.analysis_type}",
        f"**Status:** {analysis.status}",
        f"**Created:** {analysis.created_at.isoformat() if analysis.created_at else 'N/A'}",
        f"**Completed:** {analysis.completed_at.isoformat() if analysis.completed_at else 'In Progress'}",
        "",
        "## Recommendations",
        "",
    ]

    if not recommendations:
        lines.append("*No recommendations available.*")
    else:
        for i, rec in enumerate(recommendations, 1):
            lines.append(f"### {i}. {rec.title}")
            lines.append("")
            lines.append(f"**Severity:** {rec.severity} | **Level:** {rec.level} | **Impact:** {rec.impact}")
            lines.append("")
            lines.append(f"**Description:** {rec.description}")
            if rec.action:
                lines.append("")
                lines.append(f"**Action:** {rec.action}")
            if rec.script:
                lines.append("")
                lines.append(f"**Script ({rec.script_type}):**")
                lines.append("```")
                lines.append(rec.script)
                lines.append("```")
            lines.append("")

    if include_raw_data and analysis.result:
        lines.append("## Raw Results")
        lines.append("")
        lines.append("```json")
        import json
        lines.append(json.dumps(analysis.result, indent=2))
        lines.append("```")

    return "\n".join(lines)


@router.get("/summary", response_model=ReportSummary)
async def get_reports_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate analysis metrics for the Reports dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total = await db.scalar(
        select(func.count()).select_from(AnalysisDB).where(AnalysisDB.created_at >= since)
    )
    completed = await db.scalar(
        select(func.count())
        .select_from(AnalysisDB)
        .where(AnalysisDB.created_at >= since, AnalysisDB.status == "completed")
    )
    failed = await db.scalar(
        select(func.count())
        .select_from(AnalysisDB)
        .where(AnalysisDB.created_at >= since, AnalysisDB.status == "failed")
    )

    # Avg duration in seconds (SQLite): strftime('%s', completed_at) - strftime('%s', created_at)
    avg_duration = await db.scalar(
        select(
            func.avg(
                func.strftime("%s", AnalysisDB.completed_at)
                - func.strftime("%s", AnalysisDB.created_at)
            )
        )
        .select_from(AnalysisDB)
        .where(
            AnalysisDB.created_at >= since,
            AnalysisDB.completed_at.is_not(None),
            AnalysisDB.status.in_(("completed", "failed")),
        )
    )

    err_rows = await db.execute(
        select(AnalysisDB.error_message, func.count().label("c"))
        .where(AnalysisDB.created_at >= since, AnalysisDB.error_message.is_not(None))
        .group_by(AnalysisDB.error_message)
        .order_by(func.count().desc())
        .limit(10)
    )
    most_common_errors = [row[0] for row in err_rows.all() if row[0]]

    rec_count = await db.scalar(
        select(func.count())
        .select_from(RecommendationDB)
        .where(RecommendationDB.created_at >= since)
    )

    total_i = int(total or 0)
    completed_i = int(completed or 0)
    failed_i = int(failed or 0)
    success_rate = (completed_i / total_i) if total_i else 0.0

    return ReportSummary(
        total_analyses=total_i,
        completed=completed_i,
        failed=failed_i,
        success_rate=float(success_rate),
        average_duration=float(avg_duration or 0.0),
        most_common_errors=most_common_errors,
        recommendations_generated=int(rec_count or 0),
    )


@router.get("/analytics")
async def get_reports_analytics(
    type: str = Query(..., pattern="^(timeline|providers)$"),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Return chart-friendly analytics for the Reports dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    if type == "timeline":
        rows = await db.execute(
            select(func.date(AnalysisDB.created_at).label("d"), func.count().label("c"))
            .where(AnalysisDB.created_at >= since)
            .group_by(func.date(AnalysisDB.created_at))
            .order_by(func.date(AnalysisDB.created_at).asc())
        )
        return [ChartData(date=str(r[0]), count=int(r[1])).model_dump() for r in rows.all()]

    # providers
    rows = await db.execute(
        select(AIProviderDB.name, func.count().label("c"))
        .select_from(AnalysisDB)
        .join(AIProviderDB, AIProviderDB.id == AnalysisDB.ai_provider_id)
        .where(AnalysisDB.created_at >= since)
        .group_by(AIProviderDB.name)
        .order_by(func.count().desc())
    )
    return [
        ProviderUsage(provider=str(r[0]), count=int(r[1])).model_dump() for r in rows.all()
    ]


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a report from an analysis."""
    # Fetch analysis
    analysis_repo = AnalysisRepository(db)
    analysis = await analysis_repo.get_by_id(request.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Fetch recommendations
    result = await db.execute(
        select(RecommendationDB).where(RecommendationDB.analysis_id == request.analysis_id)
    )
    recommendations = list(result.scalars().all())

    # Increment metrics
    metrics.increment("reports_generated")

    # Generate report content
    if request.format == "json":
        content = generate_json_report(analysis, recommendations, request.include_raw_data)
        import json
        content = json.dumps(content, indent=2)
    else:
        content = generate_markdown_report(analysis, recommendations, request.include_raw_data)

    # Create a synthetic report ID (4-digit based on analysis_id)
    report_id = request.analysis_id * 1000 + 1

    return ReportResponse(
        id=report_id,
        analysis_id=request.analysis_id,
        format=request.format,
        content=content,
        include_raw_data=request.include_raw_data,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a generated report by ID."""
    # For now, return 404 as reports are generated on-demand
    raise HTTPException(status_code=404, detail="Report not found. Generate a report first.")
