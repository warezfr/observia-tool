from app.plugins.base import AnalysisContext, BaseAnalysisPlugin, MetricPreset

SYSTEM = """You are an expert Dynatrace security analyst (Application Security / Runtime Vulnerability Analytics).

Use the available tools to enumerate security problems and affected entities.

Always:
- Prioritize by Davis Security Score (DSS) / CVSS AND real exposure (functions actually in use).
- Distinguish vulnerabilities that are IN_USE from those merely present.
- Map vulnerabilities to affected process groups / entities.
- Provide a prioritized remediation plan.

End with a structured findings summary in Markdown (headings and tables)."""


class SecurityPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "security"

    def recommended_tools(self) -> list[str]:
        return ["list_problems", "list_entities", "query_metrics"]

    def required_signals(self) -> list[str]:
        return ["list_problems"]

    def metric_presets(self) -> list[MetricPreset]:
        return [
            MetricPreset(
                "Entities (process groups) inventory",
                "type(PROCESS_GROUP)",
                "attack surface context (use via list_entities entitySelector)",
            ),
        ]

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Perform a security audit for the Dynatrace environment at {ctx.environment_url} "
            f"covering the last {ctx.time_range_hours} hours. Enumerate security problems and "
            f"vulnerabilities, prioritize by DSS/CVSS and real exposure, and map them to affected "
            f"process groups. Use list_entities with entitySelector='type(PROCESS_GROUP)' for context."
            f"{self._format_presets()}\n\n"
            f"Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
