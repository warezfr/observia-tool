from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.repositories import EnvironmentRepository
from app.models.environment import EnvironmentCreate, EnvironmentResponse

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
    token = repo.get_token(env)
    from app.core.mcp_client import MCPClient, MCPConnectionError
    client = MCPClient(url=env.url, token=token, env_type=env.env_type)
    try:
        await client.connect()
        tools = await client.list_tools()
        return {"status": "connected", "available_tools": len(tools)}
    except MCPConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
