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


class AIProviderResponse(BaseModel):
    id: int
    name: str
    provider_type: AIProviderType
    model: str
    is_default: bool
    fallback_order: int

    class Config:
        from_attributes = True
