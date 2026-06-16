from datetime import datetime

from pydantic import BaseModel

from app.models.analysis import AnalysisType


class ScheduleCreate(BaseModel):
    name: str
    environment_id: int
    ai_provider_id: int
    analysis_type: AnalysisType
    time_range_hours: int = 24
    cron: str
    enabled: bool = True
    parameters: dict = {}


class ScheduleUpdate(BaseModel):
    name: str | None = None
    environment_id: int | None = None
    ai_provider_id: int | None = None
    analysis_type: AnalysisType | None = None
    time_range_hours: int | None = None
    cron: str | None = None
    enabled: bool | None = None
    parameters: dict | None = None


class ScheduleResponse(BaseModel):
    id: int
    name: str
    environment_id: int
    ai_provider_id: int
    analysis_type: AnalysisType
    time_range_hours: int
    cron: str
    enabled: bool
    last_run_at: datetime | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
