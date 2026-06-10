from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class RecommendationLevel(str, Enum):
    DESCRIPTIVE = "descriptive"
    PRESCRIPTIVE = "prescriptive"
    SCRIPT = "script"


class RecommendationSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class RecommendationResponse(BaseModel):
    id: int
    analysis_id: int
    title: str
    description: str
    impact: str
    level: RecommendationLevel
    severity: RecommendationSeverity
    status: RecommendationStatus
    action: str | None = None
    script: str | None = None
    script_type: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
