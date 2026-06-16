"""Unit tests for the AI orchestrator provider-type mapping and model naming."""
import pytest

from app.core.ai_orchestrator import AIProviderConfig, AIProviderType


def test_from_db_value_maps_aliases():
    assert AIProviderType.from_db_value("azure_openai") is AIProviderType.AZURE_OPENAI
    assert AIProviderType.from_db_value("aws_bedrock") is AIProviderType.AWS_BEDROCK
    assert AIProviderType.from_db_value("azure") is AIProviderType.AZURE_OPENAI
    assert AIProviderType.from_db_value("bedrock") is AIProviderType.AWS_BEDROCK
    assert AIProviderType.from_db_value("openai") is AIProviderType.OPENAI


def test_from_db_value_unknown_raises():
    with pytest.raises(ValueError):
        AIProviderType.from_db_value("not-a-provider")


def test_litellm_model_prefixes():
    openai = AIProviderConfig(provider_type=AIProviderType.OPENAI, model="gpt-4o")
    assert openai.litellm_model() == "openai/gpt-4o"

    azure = AIProviderConfig(provider_type=AIProviderType.AZURE_OPENAI, model="gpt-4o")
    assert azure.litellm_model() == "azure/gpt-4o"

    # Avoid double-prefixing.
    bedrock = AIProviderConfig(
        provider_type=AIProviderType.AWS_BEDROCK, model="bedrock/anthropic.claude"
    )
    assert bedrock.litellm_model() == "bedrock/anthropic.claude"
