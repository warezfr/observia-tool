"""Tests for analysis plugins and completeness assessment."""
from app.core.analysis_engine import _assess_completeness
from app.plugins import PLUGIN_REGISTRY, get_plugin
from app.plugins.base import AnalysisContext


def test_all_types_registered():
    for t in ("performance", "availability", "security", "cost", "reliability"):
        assert t in PLUGIN_REGISTRY


def test_prompts_include_metric_selectors():
    ctx = AnalysisContext(
        environment_url="https://x.live.dynatrace.com",
        environment_type="saas",
        time_range_hours=24,
        parameters={},
    )
    system, user = get_plugin("performance").build_prompts(ctx)
    assert "builtin:service.response.time" in user
    assert "Golden Signals" in system


def test_reliability_prompt_has_slo_math():
    ctx = AnalysisContext(
        environment_url="https://x.live.dynatrace.com",
        environment_type="saas",
        time_range_hours=24,
        parameters={"slo_target": 99.95},
    )
    system, user = get_plugin("reliability").build_prompts(ctx)
    assert "Error budget" in system
    assert "99.95" in user


def test_completeness_partial_when_missing_signal():
    plugin = get_plugin("performance")  # requires query_metrics
    result = _assess_completeness(plugin, raw_data=[{"tool": "list_problems", "result": [1]}])
    assert result["complete"] is False
    assert "query_metrics" in result["missing"]


def test_completeness_complete_when_signal_present():
    plugin = get_plugin("performance")
    result = _assess_completeness(
        plugin,
        raw_data=[{"tool": "query_metrics", "result": {"result": [{"metricId": "m"}]}}],
    )
    assert result["complete"] is True
