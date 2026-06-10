from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.repositories import AnalysisRepository, RecommendationRepository
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
