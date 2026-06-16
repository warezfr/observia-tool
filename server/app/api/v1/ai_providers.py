from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sql_delete
from urllib.parse import urlparse

from app.db.database import get_db, AIProviderDB
from app.db.repositories import AIProviderRepository
from app.models.ai_provider import (
    AIProviderCreate,
    AIProviderResponse,
    AIProviderType,
    AIProviderUpdate,
)

router = APIRouter()

class DetectModelsRequest(BaseModel):
    endpoint: str
    api_key: str


class DetectModelsResponse(BaseModel):
    models: list[str]


def _normalize_openai_base_url(endpoint: str) -> str:
    u = endpoint.strip().rstrip("/")
    parsed = urlparse(u)
    if not parsed.scheme:
        # Allow users to paste host only
        u = "https://" + u
        parsed = urlparse(u)

    # Most OpenAI-compatible APIs expose /v1; add if missing.
    if not parsed.path or parsed.path == "/":
        return u + "/v1"
    if parsed.path.endswith("/v1"):
        return u
    # If user already provided something like /v1/..., keep as-is.
    return u


@router.post("/detect-models", response_model=DetectModelsResponse)
async def detect_models(req: DetectModelsRequest):
    """Detect available models for OpenAI-compatible endpoints."""
    import httpx

    base_url = _normalize_openai_base_url(req.endpoint)
    url = f"{base_url}/models"
    headers = {"Authorization": f"Bearer {req.api_key}", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=headers)
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Model detection request failed: {e}") from e

    if resp.status_code in (401, 403):
        raise HTTPException(status_code=403, detail="Invalid API key or not authorized to list models.")
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail=f"Model detection failed with HTTP {resp.status_code}.")

    try:
        payload = resp.json()
        models = [m.get("id") for m in payload.get("data", []) if isinstance(m, dict) and m.get("id")]
        models = sorted(set(models))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model detection returned invalid JSON: {e}") from e

    if not models:
        raise HTTPException(status_code=503, detail="No models returned by the endpoint.")
    return DetectModelsResponse(models=models)


@router.post("/", response_model=AIProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_provider(data: AIProviderCreate, db: AsyncSession = Depends(get_db)):
    repo = AIProviderRepository(db)
    return await repo.create(data)


@router.get("/", response_model=list[AIProviderResponse])
async def list_ai_providers(db: AsyncSession = Depends(get_db)):
    repo = AIProviderRepository(db)
    return await repo.get_all()


@router.patch("/{provider_id}", response_model=AIProviderResponse)
async def update_ai_provider(
    provider_id: int, data: AIProviderUpdate, db: AsyncSession = Depends(get_db)
):
    repo = AIProviderRepository(db)
    provider = await repo.update(provider_id, data)
    if not provider:
        raise HTTPException(status_code=404, detail="AI provider not found")
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(sql_delete(AIProviderDB).where(AIProviderDB.id == provider_id))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="AI provider not found")
