"""Authentication & RBAC helpers: password hashing, JWT, current-user deps.

Authentication is gated behind ``settings.auth_enabled`` so existing
deployments keep working until they opt in. When enabled, protected routes
require a valid Bearer JWT; admin-only routes additionally require role=admin.
"""
import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import AsyncSessionLocal, get_db

logger = logging.getLogger(__name__)

_PBKDF2_ITERATIONS = 200_000
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, hash_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def create_access_token(subject: str, role: str, expires_hours: int = 12) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])


async def ensure_default_admin() -> None:
    """Create an initial admin from env vars if no users exist yet."""
    from app.db.repositories import UserRepository

    async with AsyncSessionLocal() as db:
        repo = UserRepository(db)
        if await repo.count() > 0:
            return
        username = settings.default_admin_username
        password = settings.default_admin_password
        await repo.create(username=username, password_hash=hash_password(password), role="admin")
        logger.info("Created default admin user '%s'", username)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated user, or None when auth is disabled.

    Raises 401 when auth is enabled and the token is missing/invalid.
    """
    if not settings.auth_enabled:
        return None
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc
    from app.db.repositories import UserRepository

    user = await UserRepository(db).get_by_username(payload.get("sub", ""))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_admin(current=Depends(get_current_user)):
    """Allow when auth disabled, otherwise require an admin role."""
    if not settings.auth_enabled:
        return current
    if current is None or current.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current
