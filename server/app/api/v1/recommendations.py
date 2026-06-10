from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.database import get_db, RecommendationDB
from app.models.recommendation import RecommendationResponse, RecommendationSeverity, RecommendationStatus

router = APIRouter()


@router.get("/", response_model=list[RecommendationResponse])
async def list_recommendations(
    analysis_id: int | None = None,
    severity: RecommendationSeverity | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(RecommendationDB)
    if analysis_id:
        q = q.where(RecommendationDB.analysis_id == analysis_id)
    if severity:
        q = q.where(RecommendationDB.severity == severity.value)
    q = q.order_by(RecommendationDB.created_at.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


@router.patch("/{rec_id}/status")
async def update_recommendation_status(
    rec_id: int,
    new_status: RecommendationStatus,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        update(RecommendationDB)
        .where(RecommendationDB.id == rec_id)
        .values(status=new_status.value)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return {"status": "updated"}
