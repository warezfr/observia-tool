from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sql_delete

from app.db.database import get_db, AIProviderDB
from app.db.repositories import AIProviderRepository
from app.models.ai_provider import AIProviderCreate, AIProviderResponse

router = APIRouter()


@router.post("/", response_model=AIProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_provider(data: AIProviderCreate, db: AsyncSession = Depends(get_db)):
    repo = AIProviderRepository(db)
    return await repo.create(data)


@router.get("/", response_model=list[AIProviderResponse])
async def list_ai_providers(db: AsyncSession = Depends(get_db)):
    repo = AIProviderRepository(db)
    return await repo.get_all()


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(sql_delete(AIProviderDB).where(AIProviderDB.id == provider_id))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="AI provider not found")
