from app.plugins.base import AnalysisContext, BaseAnalysisPlugin, MetricPreset

SYSTEM = """You are an expert Site Reliability Engineer using Dynatrace to compute and report on SLOs.

Compute Service Level Indicators (SLIs), compare them to targets, and derive the error budget
and burn rate.

Definitions you must apply:
- SLI (success) = (total_requests - failed_requests) / total_requests * 100
- Error budget = 100% - SLO_target
- Burn rate = (100 - SLI) / (100 - SLO_target)

Always:
- Compute an availability SLI and (where data allows) a latency SLI from real metric values.
- State the assumed SLO target if none is provided (default 99.9%).
- Report remaining error budget and burn rate, and whether the budget is at risk.
- Identify the services consuming the most error budget.

End with a structured SLO report in Markdown (headings and tables)."""

DEFAULT_TARGET = 99.9


class ReliabilityPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "reliability"

    def metric_presets(self) -> list[MetricPreset]:
        return [
            MetricPreset(
                "Total request count",
                "builtin:service.requestCount.total:value:splitBy(\"dt.entity.service\")",
                "denominator for the success SLI",
            ),
            MetricPreset(
                "Failed request count",
                "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")",
                "numerator for the error budget",
            ),
            MetricPreset(
                "Service response time (p95)",
                "builtin:service.response.time:percentile(95)",
                "latency SLI",
            ),
        ]

    def recommended_tools(self) -> list[str]:
        return ["query_metrics", "list_problems"]

    def required_signals(self) -> list[str]:
        return ["query_metrics"]

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        target = ctx.parameters.get("slo_target", DEFAULT_TARGET)
        user = (
            f"Compute SLOs for the Dynatrace environment at {ctx.environment_url} over the last "
            f"{ctx.time_range_hours} hours. Target SLO: {target}%. "
            f"Calculate the availability SLI from total vs failed request counts, then the error "
            f"budget and burn rate. Use a 'from' value of now-{ctx.time_range_hours}h."
            f"{self._format_presets()}\n\n"
            f"Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
