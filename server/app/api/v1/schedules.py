from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.scheduler import register_schedule, unregister_schedule
from app.db.database import get_db
from app.db.repositories import AuditLogRepository, ScheduleRepository
from app.models.schedule import ScheduleCreate, ScheduleResponse, ScheduleUpdate

router = APIRouter()


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    repo = ScheduleRepository(db)
    schedule = await repo.create(data)
    register_schedule(schedule)
    await AuditLogRepository(db).log("schedule.create", "schedule", schedule.id)
    return schedule


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(db: AsyncSession = Depends(get_db)):
    return await ScheduleRepository(db).get_all()


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)
):
    repo = ScheduleRepository(db)
    schedule = await repo.update(schedule_id, data)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    register_schedule(schedule)
    await AuditLogRepository(db).log("schedule.update", "schedule", schedule_id)
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    repo = ScheduleRepository(db)
    deleted = await repo.delete(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
    unregister_schedule(schedule_id)
    await AuditLogRepository(db).log("schedule.delete", "schedule", schedule_id)
