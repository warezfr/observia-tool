import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import litellm

logger = logging.getLogger(__name__)

litellm.drop_params = True


class AIProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    AZURE_OPENAI = "azure"
    AWS_BEDROCK = "bedrock"
    OLLAMA = "ollama"

    @classmethod
    def from_db_value(cls, value: str) -> "AIProviderType":
        """Map persisted provider_type values to orchestrator enum members.

        The DB/API model stores ``azure_openai``/``aws_bedrock`` while the
        orchestrator/LiteLLM use ``azure``/``bedrock``. This bridges both.
        """
        aliases = {
            "azure_openai": cls.AZURE_OPENAI,
            "azure": cls.AZURE_OPENAI,
            "aws_bedrock": cls.AWS_BEDROCK,
            "bedrock": cls.AWS_BEDROCK,
        }
        normalized = (value or "").strip().lower()
        if normalized in aliases:
            return aliases[normalized]
        return cls(normalized)


@dataclass
class AIProviderConfig:
    """Configuration for an AI provider."""
    provider_type: AIProviderType
    model: str
    api_key: str | None = None
    endpoint: str | None = None
    extra_config: dict = field(default_factory=dict)

    def litellm_model(self) -> str:
        """Convert provider type and model to LiteLLM format."""
        prefix_map = {
            # OpenAI-compatible endpoints (incl. custom api_base) must be routed
            # through the "openai/" provider so LiteLLM knows how to call them.
            AIProviderType.OPENAI: "openai/",
            AIProviderType.ANTHROPIC: "",
            AIProviderType.GEMINI: "gemini/",
            AIProviderType.AZURE_OPENAI: "azure/",
            AIProviderType.AWS_BEDROCK: "bedrock/",
            AIProviderType.OLLAMA: "ollama/",
        }
        prefix = prefix_map[self.provider_type]
        # Avoid double-prefixing if the model already includes the provider.
        if prefix and self.model.startswith(prefix):
            return self.model
        return f"{prefix}{self.model}"


@dataclass
class AIOrchestrator:
    """Multi-provider AI orchestrator with automatic fallback."""
    providers: list[AIProviderConfig]

    async def complete(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
    ) -> str:
        """Get completion from AI provider with automatic fallback."""
        last_error: Exception | None = None
        for provider in self.providers:
            try:
                kwargs: dict = {
                    "model": provider.litellm_model(),
                    "messages": messages,
                    "max_tokens": max_tokens,
                }
                if provider.api_key:
                    kwargs["api_key"] = provider.api_key
                if provider.endpoint:
                    kwargs["api_base"] = provider.endpoint
                if tools:
                    kwargs["tools"] = tools
                kwargs.update(provider.extra_config)

                response = await litellm.acompletion(**kwargs)
                return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"Provider {provider.provider_type}/{provider.model} failed: {e}")
                last_error = e

        raise RuntimeError(f"All AI providers failed. Last error: {last_error}")

    async def complete_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        max_tokens: int = 8192,
    ) -> dict:
        """Get completion with tool calls support."""
        last_error: Exception | None = None
        for provider in self.providers:
            try:
                kwargs: dict = {
                    "model": provider.litellm_model(),
                    "messages": messages,
                    "tools": tools,
                    "max_tokens": max_tokens,
                    "timeout": 120,
                }
                if provider.api_key:
                    kwargs["api_key"] = provider.api_key
                if provider.endpoint:
                    kwargs["api_base"] = provider.endpoint

                response = await litellm.acompletion(**kwargs)
                msg = response.choices[0].message
                return {
                    "content": msg.content,
                    "tool_calls": msg.tool_calls or [],
                }
            except Exception as e:
                logger.warning(f"Provider {provider.provider_type}/{provider.model} failed: {e}")
                last_error = e

        raise RuntimeError(f"All AI providers failed. Last error: {last_error}")
