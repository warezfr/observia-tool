from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Literal

from app.db.database import get_db, AnalysisDB, RecommendationDB
from app.db.repositories import AnalysisRepository
from app.models.analysis import AnalysisResponse

router = APIRouter()


# In-memory metrics storage
class Metrics:
    def __init__(self):
        self.analysis_total: int = 0
        self.analysis_completed: int = 0
        self.analysis_failed: int = 0
        self.reports_generated: int = 0

    def increment(self, metric: str) -> None:
        if hasattr(self, metric):
            setattr(self, metric, getattr(self, metric) + 1)


metrics = Metrics()


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
