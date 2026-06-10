import base64
from cryptography.fernet import Fernet
from app.config import settings


def _get_fernet() -> Fernet:
    """Get Fernet cipher using secret key from settings."""
    key = base64.urlsafe_b64encode(settings.secret_key.encode().ljust(32)[:32])
    return Fernet(key)


def encrypt_value(value: str) -> str:
    """Encrypt a string value using Fernet symmetric encryption."""
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    """Decrypt a Fernet-encrypted string."""
    return _get_fernet().decrypt(encrypted.encode()).decode()


def mask_token(token: str) -> str:
    """Mask a token for safe logging (show first 4 chars only)."""
    if len(token) <= 8:
        return "****"
    return token[:4] + "****"
