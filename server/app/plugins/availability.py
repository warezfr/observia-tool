from app.plugins.base import AnalysisContext, BaseAnalysisPlugin, MetricPreset

SYSTEM = """You are an expert Dynatrace observability engineer specializing in availability and reliability.

Investigate using SRE principles: availability %, incident frequency, MTTR, and error budget impact.
Use the available tools to query problems (incidents) and error-rate metrics.

Always:
- Build a timeline of incidents (problems) with start time, duration, and impacted entities.
- Quantify availability and 5xx/error rates with specific values.
- Estimate MTTR from resolved problems where possible.
- Relate findings to SLO/error-budget consequences.

End with a structured findings summary in Markdown (headings and tables)."""


class AvailabilityPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "availability"

    def metric_presets(self) -> list[MetricPreset]:
        return [
            MetricPreset(
                "Service error rate",
                "builtin:service.errors.total.rate:avg:splitBy(\"dt.entity.service\"):sort(value(avg,descending)):limit(10)",
                "error signal per service",
            ),
            MetricPreset(
                "Server-side error rate (5xx)",
                "builtin:service.errors.server.rate:avg",
                "5xx trend",
            ),
            MetricPreset(
                "Service request count",
                "builtin:service.requestCount.total:value",
                "traffic context for error ratios",
            ),
        ]

    def recommended_tools(self) -> list[str]:
        return ["list_problems", "get_problem_details", "query_metrics"]

    def required_signals(self) -> list[str]:
        return ["list_problems", "query_metrics"]

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        rel = "day" if ctx.time_range_hours > 1 else "hour"
        user = (
            f"Analyze the availability and reliability of services in the Dynatrace environment "
            f"at {ctx.environment_url} for the last {ctx.time_range_hours} hours. "
            f"First call list_problems with relativeTime='{rel}' to enumerate incidents, then "
            f"get_problem_details for the most severe ones. Identify SLO breaches and error spikes."
            f"{self._format_presets()}\n\n"
            f"Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
