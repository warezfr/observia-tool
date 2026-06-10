from app.plugins.base import BaseAnalysisPlugin, AnalysisContext

SYSTEM = """You are an expert Dynatrace security analyst.
Use MCP tools to query:
- Security vulnerabilities (CVEs) in monitored processes
- Security events and alerts
- Exposed attack surface
- Compliance posture

Prioritize findings by CVSS score and exploitability."""


class SecurityPlugin(BaseAnalysisPlugin):
    @property
    def plugin_type(self) -> str:
        return "security"

    def build_prompts(self, ctx: AnalysisContext) -> tuple[str, str]:
        user = (
            f"Perform a security audit for the Dynatrace environment at {ctx.environment_url} "
            f"covering the last {ctx.time_range_hours} hours. "
            f"Identify vulnerabilities, security events, and compliance gaps. Parameters: {ctx.parameters}"
        )
        return SYSTEM, user
