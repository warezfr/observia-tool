from app.plugins.base import BaseAnalysisPlugin, AnalysisContext

SYSTEM = """You are an expert Dynatrace cloud cost optimization analyst.
Use MCP tools to query:
- Host and container resource utilization
- Over-provisioned or idle resources
- Process efficiency and scaling opportunities

Quantify potential cost savings and prioritize by ROI."""


class CostPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "cost"

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Analyze resource utilization and cost optimization opportunities in the Dynatrace "
            f"environment at {ctx.environment_url} for the last {ctx.time_range_hours} hours. "
            f"Identify idle or over-provisioned resources. Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
