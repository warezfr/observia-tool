from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security_auth import create_access_token, get_current_user, verify_password
from app.db.database import get_db
from app.db.repositories import UserRepository

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class MeResponse(BaseModel):
    username: str
    role: str
    auth_enabled: bool


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await UserRepository(db).get_by_username(data.username)
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
        )
    token = create_access_token(subject=user.username, role=user.role)
    return TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=MeResponse)
async def me(current=Depends(get_current_user)):
    if current is None:
        return MeResponse(username="anonymous", role="admin", auth_enabled=settings.auth_enabled)
    return MeResponse(username=current.username, role=current.role, auth_enabled=settings.auth_enabled)
