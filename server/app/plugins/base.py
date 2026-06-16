from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class AnalysisContext:
    """Context information for an analysis."""
    environment_url: str
    environment_type: str
    time_range_hours: int
    parameters: dict


@dataclass(frozen=True)
class MetricPreset:
    """A concrete Dynatrace metric the agent is expected to query."""
    label: str
    selector: str
    why: str


class BaseAnalysisPlugin(ABC):
    """Base interface for analysis plugins.

    Plugins now expose concrete Dynatrace metric selectors and a recommended
    tool allowlist so prompts are deterministic and report quality is
    consistent (see docs/superpowers/knowledge playbook).
    """

    @property
    @abstractmethod
    def plugin_type(self) -> str:
        """Return the plugin type identifier."""
        ...

    def metric_presets(self) -> list[MetricPreset]:
        """Concrete metric selectors the agent should query. Override per type."""
        return []

    def recommended_tools(self) -> list[str]:
        """Tool names the agent should prefer for this analysis type."""
        return ["query_metrics", "list_problems", "list_entities"]

    def required_signals(self) -> list[str]:
        """Tool names that MUST return data for the report to be complete.

        Used by the completeness validation in the analysis engine; if none of
        these tools produced usable data the report is flagged as partial.
        """
        return ["query_metrics"]

    def _format_presets(self) -> str:
        presets = self.metric_presets()
        if not presets:
            return ""
        lines = ["", "Query at least these metrics via the query_metrics tool:"]
        for p in presets:
            lines.append(f"- {p.label}: `{p.selector}` ({p.why})")
        return "\n".join(lines)

    @abstractmethod
    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        """Build system and user prompts for this analysis type.

        Returns:
            (system_prompt, user_prompt)
        """
        ...
