from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.repositories import IntegrationRepository

router = APIRouter()


class IntegrationCreate(BaseModel):
    kind: Literal["slack", "webhook"]
    name: str
    config: dict = {}
    enabled: bool = True


class IntegrationResponse(BaseModel):
    id: int
    kind: str
    name: str
    config: dict
    enabled: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(data: IntegrationCreate, db: AsyncSession = Depends(get_db)):
    repo = IntegrationRepository(db)
    return await repo.create(
        kind=data.kind, name=data.name, config=data.config, enabled=data.enabled
    )


@router.get("/", response_model=list[IntegrationResponse])
async def list_integrations(db: AsyncSession = Depends(get_db)):
    return await IntegrationRepository(db).get_all()


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await IntegrationRepository(db).delete(integration_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Integration not found")
