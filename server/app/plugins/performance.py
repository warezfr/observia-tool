from app.plugins.base import BaseAnalysisPlugin, AnalysisContext

SYSTEM = """You are an expert Dynatrace observability engineer specializing in performance analysis.
Use the available MCP tools to query Dynatrace for:
- Service response times, error rates, and throughput
- Host CPU, memory, and I/O metrics
- Database query performance
- Any latency hotspots or degradation patterns

Provide structured findings with quantified impact. Always cite specific metric values."""


class PerformancePlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "performance"

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Perform a comprehensive performance analysis for the Dynatrace environment "
            f"at {ctx.environment_url} covering the last {ctx.time_range_hours} hours. "
            f"Identify latency hotspots, resource bottlenecks, and throughput degradation. "
            f"Additional parameters: {ctx.parameters}"
        )
        return SYSTEM, user
