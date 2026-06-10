from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class AnalysisType(str, Enum):
    PERFORMANCE = "performance"
    AVAILABILITY = "availability"
    SECURITY = "security"
    COST = "cost"


class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisCreate(BaseModel):
    environment_id: int
    ai_provider_id: int
    analysis_type: AnalysisType
    time_range_hours: int = 24
    parameters: dict = {}


class AnalysisResponse(BaseModel):
    id: int
    environment_id: int
    ai_provider_id: int
    analysis_type: AnalysisType
    status: AnalysisStatus
    result: dict | None = None
    reasoning_steps: list[dict] = []
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    class Config:
        from_attributes = True
