from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AnalysisContext:
    """Context information for an analysis."""
    environment_url: str
    environment_type: str
    time_range_hours: int
    parameters: dict


class BaseAnalysisPlugin(ABC):
    """Base interface for analysis plugins."""

    @property
    @abstractmethod
    def plugin_type(self) -> str:
        """Return the plugin type identifier."""
        pass

    @abstractmethod
    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        """Build system and user prompts for this analysis type.

        Returns:
            (system_prompt, user_prompt)
        """
        pass
