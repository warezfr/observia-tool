from app.plugins.base import BaseAnalysisPlugin, AnalysisContext

SYSTEM = """You are an expert Dynatrace observability engineer specializing in availability and reliability.
Use MCP tools to query:
- Problem/incident history and MTTR
- Error rates and HTTP 5xx trends
- SLO/SLA compliance status
- Service availability percentages

Provide clear impact statements and timeline of incidents."""


class AvailabilityPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "availability"

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Analyze the availability and reliability of services in the Dynatrace environment "
            f"at {ctx.environment_url} for the last {ctx.time_range_hours} hours. "
            f"Identify incidents, SLO breaches, and error spikes. Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
