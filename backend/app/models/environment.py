from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class EnvironmentType(str, Enum):
    SAAS = "saas"
    MANAGED = "managed"


class EnvironmentBase(BaseModel):
    name: str
    url: str
    env_type: EnvironmentType


class EnvironmentCreate(EnvironmentBase):
    token: str


class EnvironmentUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    token: str | None = None
    env_type: EnvironmentType | None = None


class EnvironmentResponse(BaseModel):
    id: int
    name: str
    url: str
    env_type: EnvironmentType

    class Config:
        from_attributes = True
