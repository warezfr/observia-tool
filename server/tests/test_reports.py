"""Tests for report generation (json / markdown / html).

The report generators read attributes off analysis/recommendation objects, so
we use lightweight stub objects rather than a live database.
"""
import json
from datetime import datetime, timezone

import pytest

from app.api.v1.reports import (
    SEVERITY_COLORS,
    generate_html_report,
    generate_json_report,
    generate_markdown_report,
    _render_markdown_to_html,
    _severity_counts,
)


class StubRec:
    def __init__(self, **kw):
        self.title = kw.get("title", "Untitled")
        self.description = kw.get("description", "")
        self.impact = kw.get("impact", "")
        self.level = kw.get("level", "descriptive")
        self.severity = kw.get("severity", "medium")
        self.status = kw.get("status", "new")
        self.action = kw.get("action")
        self.script = kw.get("script")
        self.script_type = kw.get("script_type")


class StubAnalysis:
    def __init__(self, **kw):
        self.id = kw.get("id", 42)
        self.analysis_type = kw.get("analysis_type", "performance")
        self.status = kw.get("status", "completed")
        self.created_at = kw.get("created_at", datetime(2026, 6, 16, 9, 0, tzinfo=timezone.utc))
        self.completed_at = kw.get("completed_at", datetime(2026, 6, 16, 9, 5, tzinfo=timezone.utc))
        self.result = kw.get("result", {"summary": "All good.", "raw_data": []})
        self.reasoning_steps = kw.get("reasoning_steps", [])


@pytest.fixture
def analysis():
    return StubAnalysis(
        result={
            "summary": "# Findings\n\nSystem is **healthy**.\n\n- item one\n- item two",
            "raw_data": [{"metric": "cpu", "value": 12}],
        }
    )


@pytest.fixture
def recommendations():
    return [
        StubRec(
            title="Scale the API tier",
            description="Add replicas.",
            severity="critical",
            level="prescriptive",
            impact="High latency",
            action="Increase replicas to 3",
            script="kubectl scale deploy/api --replicas=3",
            script_type="bash",
        ),
        StubRec(title="Tune GC", severity="medium", impact="Minor"),
        StubRec(title="Add cache", severity="low", impact="Minor"),
    ]


# --------------------------------------------------------------------------- #
# JSON
# --------------------------------------------------------------------------- #
def test_generate_json_report_structure(analysis, recommendations):
    report = generate_json_report(analysis, recommendations, include_raw_data=False)
    assert report["analysis_id"] == 42
    assert report["analysis_type"] == "performance"
    assert report["recommendations_count"] == 3
    assert report["recommendations"][0]["title"] == "Scale the API tier"
    assert "result" not in report  # raw data excluded
    # round-trips as JSON
    assert json.loads(json.dumps(report))["status"] == "completed"


def test_generate_json_report_with_raw_data(analysis, recommendations):
    report = generate_json_report(analysis, recommendations, include_raw_data=True)
    assert "result" in report
    assert report["result"]["raw_data"][0]["metric"] == "cpu"


# --------------------------------------------------------------------------- #
# Markdown
# --------------------------------------------------------------------------- #
def test_generate_markdown_report(analysis, recommendations):
    md = generate_markdown_report(analysis, recommendations, include_raw_data=False)
    assert "# Analysis Report #42" in md
    assert "**Analysis Type:** performance" in md
    assert "### 1. Scale the API tier" in md
    assert "kubectl scale" in md
    assert "**Severity:** critical" in md


def test_generate_markdown_report_raw_data(analysis, recommendations):
    md = generate_markdown_report(analysis, recommendations, include_raw_data=True)
    assert "## Raw Results" in md
    assert "```json" in md
    assert '"metric": "cpu"' in md


# --------------------------------------------------------------------------- #
# HTML
# --------------------------------------------------------------------------- #
def test_generate_html_report_is_complete_document(analysis, recommendations):
    html = generate_html_report(analysis, recommendations, include_raw_data=False)
    assert html.lstrip().startswith("<!DOCTYPE html>")
    assert "</html>" in html.rstrip()
    # self-contained: no external assets / CDNs / scripts
    assert "<script" not in html
    assert "http://" not in html and "https://" not in html
    assert "<style>" in html
    assert "@media print" in html


def test_generate_html_renders_markdown_summary(analysis, recommendations):
    html = generate_html_report(analysis, recommendations, include_raw_data=False)
    # markdown heading + bold + list rendered to HTML tags
    assert "<h1" in html and "Findings" in html
    assert "<strong>healthy</strong>" in html
    assert "<li>item one</li>" in html


def test_generate_html_includes_severity_chips_and_svg(analysis, recommendations):
    html = generate_html_report(analysis, recommendations, include_raw_data=False)
    assert "<svg" in html  # inline SVG charts
    assert SEVERITY_COLORS["critical"] in html
    assert "Scale the API tier" in html
    assert "kubectl scale" in html  # script block rendered
    # donut shows total finding count
    assert ">3<" in html


def test_generate_html_raw_data_details(analysis, recommendations):
    without = generate_html_report(analysis, recommendations, include_raw_data=False)
    assert "<details" not in without

    with_raw = generate_html_report(analysis, recommendations, include_raw_data=True)
    assert "<details" in with_raw
    assert "Raw data" in with_raw
    assert "cpu" in with_raw


def test_generate_html_handles_no_recommendations(analysis):
    html = generate_html_report(analysis, [], include_raw_data=False)
    assert "No recommendations available." in html
    assert "<svg" in html  # still renders an (empty) chart


def test_html_escapes_untrusted_content():
    a = StubAnalysis(result={"summary": "plain", "raw_data": []})
    rec = StubRec(title="<script>alert(1)</script>", severity="high")
    html = generate_html_report(a, [rec], include_raw_data=False)
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def test_severity_counts(recommendations):
    counts = _severity_counts(recommendations)
    assert counts == {"critical": 1, "high": 0, "medium": 1, "low": 1}


def test_render_markdown_to_html_basic():
    out = _render_markdown_to_html("**bold** and `code`")
    assert "<strong>bold</strong>" in out
    assert "<code>code</code>" in out
