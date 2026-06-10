from app.plugins.performance import PerformancePlugin
from app.plugins.availability import AvailabilityPlugin
from app.plugins.security import SecurityPlugin
from app.plugins.cost import CostPlugin
from app.plugins.base import BaseAnalysisPlugin

PLUGIN_REGISTRY: dict[str, BaseAnalysisPlugin] = {
    "performance": PerformancePlugin(),
    "availability": AvailabilityPlugin(),
    "security": SecurityPlugin(),
    "cost": CostPlugin(),
}


def get_plugin(analysis_type: str) -> BaseAnalysisPlugin:
    """Get plugin by analysis type."""
    plugin = PLUGIN_REGISTRY.get(analysis_type)
    if not plugin:
        raise ValueError(
            f"Unknown analysis type: {analysis_type}. Available: {list(PLUGIN_REGISTRY)}"
        )
    return plugin
