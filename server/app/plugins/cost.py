from app.plugins.base import AnalysisContext, BaseAnalysisPlugin, MetricPreset

SYSTEM = """You are an expert Dynatrace cloud cost optimization analyst.

Use the USE method (Utilization, Saturation, Errors) on infrastructure to find waste.

Always:
- Identify idle (sustained low utilization) and over-provisioned resources with specific values.
- Quantify potential savings and prioritize by ROI.
- Recommend right-sizing or consolidation actions.

End with a structured findings summary in Markdown (headings and tables)."""


class CostPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "cost"

    def metric_presets(self) -> list[MetricPreset]:
        return [
            MetricPreset(
                "Host CPU usage (lowest = idle candidates)",
                "builtin:host.cpu.usage:avg:sort(value(avg,ascending)):limit(15)",
                "idle / over-provisioned hosts",
            ),
            MetricPreset(
                "Host memory usage",
                "builtin:host.mem.usage:avg",
                "right-sizing memory",
            ),
            MetricPreset(
                "Host disk used %",
                "builtin:host.disk.usedPct:avg",
                "storage utilization",
            ),
        ]

    def required_signals(self) -> list[str]:
        return ["query_metrics"]

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Analyze resource utilization and cost optimization opportunities in the Dynatrace "
            f"environment at {ctx.environment_url} for the last {ctx.time_range_hours} hours. "
            f"Identify idle or over-provisioned resources and quantify savings. "
            f"Use a 'from' value of now-{ctx.time_range_hours}h in metric queries."
            f"{self._format_presets()}\n\n"
            f"Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
