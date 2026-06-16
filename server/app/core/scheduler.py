"""Recurring analysis scheduler built on APScheduler.

Schedules are persisted in the ``schedules`` table. On startup we load all
enabled schedules and register a cron job for each. When a job fires it creates
a new analysis row and runs the standard analysis workflow.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.database import AsyncSessionLocal, ScheduleDB
from app.db.repositories import AnalysisRepository
from app.models.analysis import AnalysisCreate, AnalysisType

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def _job_id(schedule_id: int) -> str:
    return f"schedule-{schedule_id}"


async def _run_scheduled(schedule_id: int) -> None:
    """Create and execute an analysis from a schedule definition."""
    from datetime import datetime, timezone

    from sqlalchemy import update

    from app.core.analysis_engine import run_analysis

    async with AsyncSessionLocal() as db:
        schedule = await db.get(ScheduleDB, schedule_id)
        if not schedule or not schedule.enabled:
            return
        analysis_repo = AnalysisRepository(db)
        analysis = await analysis_repo.create(
            AnalysisCreate(
                environment_id=schedule.environment_id,
                ai_provider_id=schedule.ai_provider_id,
                analysis_type=AnalysisType(schedule.analysis_type),
                time_range_hours=schedule.time_range_hours,
                parameters=schedule.parameters or {},
            )
        )
        await db.execute(
            update(ScheduleDB)
            .where(ScheduleDB.id == schedule_id)
            .values(last_run_at=datetime.now(timezone.utc))
        )
        await db.commit()
        analysis_id = analysis.id

    logger.info("Schedule %s triggered analysis %s", schedule_id, analysis_id)
    await run_analysis(analysis_id)


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


def register_schedule(schedule: ScheduleDB) -> None:
    """Add or replace the cron job for a schedule."""
    scheduler = get_scheduler()
    job_id = _job_id(schedule.id)
    try:
        scheduler.remove_job(job_id)
    except Exception:  # noqa: BLE001 - job may not exist
        pass
    if not schedule.enabled:
        return
    try:
        trigger = CronTrigger.from_crontab(schedule.cron)
    except ValueError as exc:
        logger.warning("Invalid cron '%s' for schedule %s: %s", schedule.cron, schedule.id, exc)
        return
    scheduler.add_job(_run_scheduled, trigger=trigger, args=[schedule.id], id=job_id)
    logger.info("Registered schedule %s (%s)", schedule.id, schedule.cron)


def unregister_schedule(schedule_id: int) -> None:
    try:
        get_scheduler().remove_job(_job_id(schedule_id))
    except Exception:  # noqa: BLE001
        pass


async def start_scheduler() -> None:
    """Start the scheduler and load enabled schedules from the database."""
    from sqlalchemy import select

    scheduler = get_scheduler()
    if not scheduler.running:
        scheduler.start()
    async with AsyncSessionLocal() as db:
        rows = await db.execute(select(ScheduleDB).where(ScheduleDB.enabled == True))  # noqa: E712
        for schedule in rows.scalars().all():
            register_schedule(schedule)


def shutdown_scheduler() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
