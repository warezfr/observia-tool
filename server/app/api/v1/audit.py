from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security_auth import require_admin
from app.db.database import get_db
from app.db.repositories import AuditLogRepository

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str | None = None
    entity_id: int | None = None
    actor: str | None = None
    detail: dict = {}
    created_at: datetime | None = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AuditLogResponse], dependencies=[Depends(require_admin)])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    return await AuditLogRepository(db).list()
