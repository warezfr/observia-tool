from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security_auth import hash_password, require_admin
from app.db.database import get_db
from app.db.repositories import AuditLogRepository, UserRepository

router = APIRouter()


class UserCreate(BaseModel):
    username: str
    password: str
    role: Literal["admin", "viewer"] = "viewer"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=list[UserResponse], dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    return await UserRepository(db).get_all()


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    if await repo.get_by_username(data.username):
        raise HTTPException(status_code=409, detail="Username already exists")
    user = await repo.create(
        username=data.username, password_hash=hash_password(data.password), role=data.role
    )
    await AuditLogRepository(db).log("user.create", "user", user.id, detail={"role": data.role})
    return user


@router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    deleted = await repo.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    await AuditLogRepository(db).log("user.delete", "user", user_id)
