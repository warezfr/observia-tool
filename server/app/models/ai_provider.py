from enum import Enum
from pydantic import BaseModel


class AIProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    AZURE_OPENAI = "azure_openai"
    AWS_BEDROCK = "aws_bedrock"
    OLLAMA = "ollama"


class AIProviderBase(BaseModel):
    name: str
    provider_type: AIProviderType
    model: str
    is_default: bool = False
    fallback_order: int = 999


class AIProviderCreate(AIProviderBase):
    api_key: str | None = None
    endpoint: str | None = None
    extra_config: dict = {}


class AIProviderUpdate(BaseModel):
    name: str | None = None
    provider_type: AIProviderType | None = None
    model: str | None = None
    api_key: str | None = None
    endpoint: str | None = None
    extra_config: dict | None = None
    is_default: bool | None = None
    fallback_order: int | None = None


class AIProviderResponse(BaseModel):
    id: int
    name: str
    provider_type: AIProviderType
    model: str
    is_default: bool
    fallback_order: int

    class Config:
        from_attributes = True
