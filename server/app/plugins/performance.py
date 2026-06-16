from app.plugins.base import AnalysisContext, BaseAnalysisPlugin, MetricPreset

SYSTEM = """You are an expert Dynatrace observability engineer specializing in performance analysis.

Structure your investigation around the Golden Signals (latency, traffic, errors, saturation)
and the RED method for services (Rate, Errors, Duration). Use the available tools to query
Dynatrace Environment API v2 metrics and problems.

Always:
- Cite specific metric values with units (ms, req/min, %).
- Report latency as p50/p90/p95/p99 where possible, not just averages.
- Identify the top slow services and the most saturated hosts.
- Tie each finding to quantified impact.

End with a structured findings summary in Markdown (use headings and tables)."""


class PerformancePlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "performance"

    def metric_presets(self) -> list[MetricPreset]:
        return [
            MetricPreset(
                "Service response time (p95)",
                "builtin:service.response.time:percentile(95):splitBy(\"dt.entity.service\"):sort(value(percentile(95),descending)):limit(10)",
                "latency hotspots",
            ),
            MetricPreset(
                "Service response time (avg)",
                "builtin:service.response.time:avg",
                "baseline latency",
            ),
            MetricPreset(
                "Service request count",
                "builtin:service.requestCount.total:value",
                "traffic / throughput",
            ),
            MetricPreset(
                "Service error rate",
                "builtin:service.errors.total.rate:avg",
                "errors signal",
            ),
            MetricPreset(
                "Host CPU usage",
                "builtin:host.cpu.usage:avg:sort(value(avg,descending)):limit(10)",
                "saturation",
            ),
            MetricPreset(
                "Host memory usage",
                "builtin:host.mem.usage:avg",
                "saturation",
            ),
        ]

    def required_signals(self) -> list[str]:
        return ["query_metrics"]

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Perform a comprehensive performance analysis for the Dynatrace environment "
            f"at {ctx.environment_url} covering the last {ctx.time_range_hours} hours. "
            f"Identify latency hotspots, resource bottlenecks, and throughput degradation. "
            f"Use a 'from' value of now-{ctx.time_range_hours}h in metric queries."
            f"{self._format_presets()}\n\n"
            f"Additional parameters: {ctx.parameters}"
        )
        return SYSTEM, user
