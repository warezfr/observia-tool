from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import urlparse, urlunparse

from app.db.database import get_db
from app.db.repositories import EnvironmentRepository
from app.models.environment import EnvironmentCreate, EnvironmentResponse, EnvironmentUpdate

router = APIRouter()


@router.post("/", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(data: EnvironmentCreate, db: AsyncSession = Depends(get_db)):
    repo = EnvironmentRepository(db)
    env = await repo.create(data)
    return env


@router.get("/", response_model=list[EnvironmentResponse])
async def list_environments(db: AsyncSession = Depends(get_db)):
    repo = EnvironmentRepository(db)
    return await repo.get_all()


@router.get("/{env_id}", response_model=EnvironmentResponse)
async def get_environment(env_id: int, db: AsyncSession = Depends(get_db)):
    repo = EnvironmentRepository(db)
    env = await repo.get_by_id(env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.patch("/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    env_id: int, data: EnvironmentUpdate, db: AsyncSession = Depends(get_db)
):
    repo = EnvironmentRepository(db)
    env = await repo.update(env_id, data)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(env_id: int, db: AsyncSession = Depends(get_db)):
    repo = EnvironmentRepository(db)
    deleted = await repo.delete(env_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Environment not found")


@router.post("/{env_id}/test-connection")
async def test_connection(env_id: int, db: AsyncSession = Depends(get_db)):
    repo = EnvironmentRepository(db)
    env = await repo.get_by_id(env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    try:
        token = repo.get_token(env)
    except ValueError as e:
        # Token was encrypted with a different SECRET_KEY (or is corrupted).
        raise HTTPException(
            status_code=409,
            detail=str(e),
        )

    # Prefer a direct Dynatrace classic environment API check for connection testing.
    # Dynatrace SaaS users commonly paste platform URLs (*.apps.dynatrace.com) but classic
    # environment APIs live on *.live.dynatrace.com and are accessed with API tokens.
    def _normalize_classic_env_url(url: str) -> str:
        u = url.strip().rstrip("/")
        parsed = urlparse(u)
        if not parsed.scheme:
            parsed = urlparse("https://" + u)

        host = (parsed.hostname or "").lower()
        if host.endswith(".apps.dynatrace.com"):
            host = host.replace(".apps.dynatrace.com", ".live.dynatrace.com")

        netloc = host
        if parsed.port:
            netloc = f"{host}:{parsed.port}"
        return urlunparse((parsed.scheme, netloc, "", "", "", ""))

    import httpx

    classic_url = _normalize_classic_env_url(env.url)
    probe_url = f"{classic_url}/api/v2/problems?relativeTime=hour"
    headers = {"Authorization": f"Api-Token {token}", "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(probe_url, headers=headers)
        if resp.status_code == 200:
            return {"status": "connected", "mode": "classic-api", "endpoint": probe_url}
        if resp.status_code in (401, 403):
            raise HTTPException(
                status_code=403,
                detail="Dynatrace token rejected or missing required scopes for connection test.",
            )
        raise HTTPException(
            status_code=503,
            detail=f"Dynatrace API probe failed with HTTP {resp.status_code}.",
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Dynatrace API probe request failed: {e}") from e
