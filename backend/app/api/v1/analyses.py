from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.repositories import AnalysisRepository
from app.models.analysis import AnalysisCreate, AnalysisResponse

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
async def list_analyses(limit: int = 50, db: AsyncSession = Depends(get_db)):
    repo = AnalysisRepository(db)
    return await repo.get_all(limit=limit)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    repo = AnalysisRepository(db)
    analysis = await repo.get_by_id(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis
