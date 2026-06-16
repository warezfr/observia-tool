import html as html_lib
import json
import math
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from pydantic import BaseModel
from typing import Literal

from app.core.metrics import metrics
from app.db.database import AIProviderDB, AnalysisDB, RecommendationDB, get_db
from app.db.repositories import AnalysisRepository
from app.models.analysis import AnalysisResponse

router = APIRouter()


class ReportGenerateRequest(BaseModel):
    analysis_id: int
    format: Literal["json", "markdown", "html"]
    include_raw_data: bool = False


class ReportResponse(BaseModel):
    id: int
    analysis_id: int
    format: str
    content: str
    include_raw_data: bool


class ReportSummary(BaseModel):
    total_analyses: int
    completed: int
    failed: int
    success_rate: float
    average_duration: float
    most_common_errors: list[str]
    recommendations_generated: int


class ChartData(BaseModel):
    date: str
    count: int


class ProviderUsage(BaseModel):
    provider: str
    count: int


def generate_json_report(analysis: AnalysisDB, recommendations: list, include_raw_data: bool) -> dict:
    """Generate a JSON format report."""
    report = {
        "analysis_id": analysis.id,
        "analysis_type": analysis.analysis_type,
        "status": analysis.status,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
        "recommendations_count": len(recommendations),
        "recommendations": [
            {
                "title": rec.title,
                "description": rec.description,
                "impact": rec.impact,
                "level": rec.level,
                "severity": rec.severity,
                "status": rec.status,
                "action": rec.action,
                "script": rec.script,
                "script_type": rec.script_type,
            }
            for rec in recommendations
        ],
    }
    if include_raw_data:
        report["result"] = analysis.result
        report["reasoning_steps"] = analysis.reasoning_steps
    return report


def generate_markdown_report(analysis: AnalysisDB, recommendations: list, include_raw_data: bool) -> str:
    """Generate a Markdown format report."""
    lines = [
        f"# Analysis Report #{analysis.id}",
        "",
        f"**Analysis Type:** {analysis.analysis_type}",
        f"**Status:** {analysis.status}",
        f"**Created:** {analysis.created_at.isoformat() if analysis.created_at else 'N/A'}",
        f"**Completed:** {analysis.completed_at.isoformat() if analysis.completed_at else 'In Progress'}",
        "",
        "## Recommendations",
        "",
    ]

    if not recommendations:
        lines.append("*No recommendations available.*")
    else:
        for i, rec in enumerate(recommendations, 1):
            lines.append(f"### {i}. {rec.title}")
            lines.append("")
            lines.append(f"**Severity:** {rec.severity} | **Level:** {rec.level} | **Impact:** {rec.impact}")
            lines.append("")
            lines.append(f"**Description:** {rec.description}")
            if rec.action:
                lines.append("")
                lines.append(f"**Action:** {rec.action}")
            if rec.script:
                lines.append("")
                lines.append(f"**Script ({rec.script_type}):**")
                lines.append("```")
                lines.append(rec.script)
                lines.append("```")
            lines.append("")

    if include_raw_data and analysis.result:
        lines.append("## Raw Results")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(analysis.result, indent=2))
        lines.append("```")

    return "\n".join(lines)


# ----------------------------------------------------------------------------
# HTML report (standalone, self-contained, print-friendly)
# ----------------------------------------------------------------------------

SEVERITY_ORDER = ["critical", "high", "medium", "low"]
SEVERITY_COLORS = {
    "critical": "#DC2626",
    "high": "#EA580C",
    "medium": "#D97706",
    "low": "#16A34A",
}


def _render_markdown_to_html(text: str) -> str:
    """Render markdown to HTML. Uses the `markdown` lib if available, else a
    minimal, safe fallback (escapes input and preserves paragraphs/code)."""
    if not text:
        return ""
    try:
        import markdown as _md  # type: ignore

        return _md.markdown(
            text, extensions=["extra", "sane_lists", "nl2br", "tables", "fenced_code"]
        )
    except Exception:
        # Minimal fallback: escape, keep fenced code blocks, split paragraphs.
        escaped = html_lib.escape(text)

        def _code_repl(m: "re.Match[str]") -> str:
            return f"<pre><code>{m.group(1)}</code></pre>"

        escaped = re.sub(r"```(.*?)```", _code_repl, escaped, flags=re.DOTALL)
        blocks = [b.strip() for b in re.split(r"\n\s*\n", escaped) if b.strip()]
        out = []
        for b in blocks:
            if b.startswith("<pre>"):
                out.append(b)
            else:
                out.append("<p>" + b.replace("\n", "<br>") + "</p>")
        return "\n".join(out)


def _severity_counts(recommendations: list) -> dict:
    counts = {s: 0 for s in SEVERITY_ORDER}
    for rec in recommendations:
        sev = (getattr(rec, "severity", "") or "").lower()
        if sev in counts:
            counts[sev] += 1
    return counts


def _severity_donut_svg(counts: dict) -> str:
    """Build an inline SVG donut chart (no JS) from severity counts using
    stroke-dasharray segments on concentric circles."""
    total = sum(counts.values())
    size = 180
    cx = cy = size / 2
    r = 64
    stroke = 22
    circumference = 2 * math.pi * r

    if total == 0:
        return (
            f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" '
            f'role="img" aria-label="No recommendations">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#E7E9EE" '
            f'stroke-width="{stroke}"/>'
            f'<text x="{cx}" y="{cy+5}" text-anchor="middle" font-size="14" '
            f'fill="#6B7280">No data</text></svg>'
        )

    segments = []
    offset = 0.0
    for sev in SEVERITY_ORDER:
        value = counts.get(sev, 0)
        if value <= 0:
            continue
        seg_len = circumference * (value / total)
        segments.append(
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" '
            f'stroke="{SEVERITY_COLORS[sev]}" stroke-width="{stroke}" '
            f'stroke-dasharray="{seg_len:.3f} {circumference - seg_len:.3f}" '
            f'stroke-dashoffset="{-offset:.3f}" transform="rotate(-90 {cx} {cy})"/>'
        )
        offset += seg_len

    inner = "".join(segments)
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" '
        f'role="img" aria-label="Severity distribution">'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#F1F2F5" '
        f'stroke-width="{stroke}"/>{inner}'
        f'<text x="{cx}" y="{cy-2}" text-anchor="middle" font-size="30" '
        f'font-weight="700" fill="#0B1020">{total}</text>'
        f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="12" '
        f'fill="#6B7280">findings</text></svg>'
    )


def _severity_bars_svg(counts: dict) -> str:
    """Build a small inline SVG horizontal bar chart from severity counts."""
    max_count = max(counts.values()) if counts else 0
    rows = []
    row_h = 28
    bar_max = 220
    label_w = 70
    width = label_w + bar_max + 40
    height = row_h * len(SEVERITY_ORDER) + 10
    for i, sev in enumerate(SEVERITY_ORDER):
        value = counts.get(sev, 0)
        y = 10 + i * row_h
        bar_w = (value / max_count * bar_max) if max_count else 0
        rows.append(
            f'<text x="0" y="{y+14}" font-size="12" fill="#475467" '
            f'text-transform="capitalize">{sev}</text>'
            f'<rect x="{label_w}" y="{y+2}" width="{bar_max}" height="16" rx="4" '
            f'fill="#F1F2F5"/>'
            f'<rect x="{label_w}" y="{y+2}" width="{bar_w:.2f}" height="16" rx="4" '
            f'fill="{SEVERITY_COLORS[sev]}"/>'
            f'<text x="{label_w + bar_max + 8}" y="{y+14}" font-size="12" '
            f'fill="#0B1020">{value}</text>'
        )
    return (
        f'<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="Severity bars">{"".join(rows)}</svg>'
    )


def _severity_legend(counts: dict) -> str:
    items = []
    for sev in SEVERITY_ORDER:
        items.append(
            f'<span class="legend-item"><span class="legend-dot" '
            f'style="background:{SEVERITY_COLORS[sev]}"></span>'
            f'{sev.capitalize()} <strong>{counts.get(sev, 0)}</strong></span>'
        )
    return '<div class="legend">' + "".join(items) + "</div>"


def generate_html_report(analysis, recommendations: list, include_raw_data: bool) -> str:
    """Generate a complete, self-contained HTML report (inline CSS, no external
    assets/JS, print-friendly). Includes a markdown-rendered summary,
    recommendations with severity chips, and inline SVG charts."""
    esc = html_lib.escape
    a_type = esc(str(getattr(analysis, "analysis_type", "") or "analysis"))
    a_status = esc(str(getattr(analysis, "status", "") or "unknown"))
    created = getattr(analysis, "created_at", None)
    completed = getattr(analysis, "completed_at", None)
    created_s = created.isoformat() if created else "N/A"
    completed_s = completed.isoformat() if completed else "In progress"

    result = getattr(analysis, "result", None) or {}
    summary_md = result.get("summary", "") if isinstance(result, dict) else ""
    summary_html = _render_markdown_to_html(summary_md) if summary_md else (
        '<p class="muted">No summary available.</p>'
    )

    counts = _severity_counts(recommendations)

    # Recommendation cards
    rec_blocks = []
    if not recommendations:
        rec_blocks.append('<p class="muted">No recommendations available.</p>')
    for rec in recommendations:
        sev = (getattr(rec, "severity", "") or "").lower()
        color = SEVERITY_COLORS.get(sev, "#6B7280")
        title = esc(str(getattr(rec, "title", "") or "Untitled"))
        level = esc(str(getattr(rec, "level", "") or ""))
        impact = esc(str(getattr(rec, "impact", "") or ""))
        desc = _render_markdown_to_html(str(getattr(rec, "description", "") or ""))
        action = getattr(rec, "action", None)
        script = getattr(rec, "script", None)
        script_type = getattr(rec, "script_type", None)

        parts = [
            '<div class="rec">',
            '<div class="rec-head">',
            f'<span class="chip" style="background:{color}1a;color:{color};'
            f'border:1px solid {color}40">{esc(sev or "n/a")}</span>',
            f'<span class="rec-title">{title}</span>',
            "</div>",
            '<div class="rec-meta">',
            f'<span class="tag">{level}</span>' if level else "",
            f'<span class="muted">{impact}</span>' if impact else "",
            "</div>",
            f'<div class="rec-desc">{desc}</div>',
        ]
        if action:
            parts.append(
                f'<div class="rec-section"><div class="rec-label">Action</div>'
                f'<p>{esc(str(action))}</p></div>'
            )
        if script:
            label = f"Script ({esc(str(script_type))})" if script_type else "Script"
            parts.append(
                f'<div class="rec-section"><div class="rec-label">{label}</div>'
                f'<pre><code>{esc(str(script))}</code></pre></div>'
            )
        parts.append("</div>")
        rec_blocks.append("".join(parts))

    raw_block = ""
    if include_raw_data and result:
        raw_json = esc(json.dumps(result, indent=2, default=str))
        raw_block = (
            '<details class="raw"><summary>Raw data (JSON)</summary>'
            f'<pre><code>{raw_json}</code></pre></details>'
        )

    donut = _severity_donut_svg(counts)
    bars = _severity_bars_svg(counts)
    legend = _severity_legend(counts)

    total_recs = len(recommendations)
    title = f"Observia Report — {a_type.capitalize()} Analysis #{getattr(analysis, 'id', '')}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<style>
  :root {{
    --app:#F6F7F9; --surface:#FFFFFF; --border:#E7E9EE; --fg:#0B1020;
    --fg-secondary:#475467; --fg-muted:#6B7280; --accent:#4F46E5; --accent-soft:#EEF2FF;
  }}
  * {{ box-sizing:border-box; }}
  body {{
    margin:0; background:var(--app); color:var(--fg);
    font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    line-height:1.6; -webkit-font-smoothing:antialiased;
  }}
  .wrap {{ max-width:880px; margin:0 auto; padding:40px 24px; }}
  header.top {{ border-bottom:1px solid var(--border); padding-bottom:20px; margin-bottom:24px; }}
  .brand {{ display:flex; align-items:center; gap:10px; color:var(--accent); font-weight:700; }}
  .brand .mark {{ width:28px; height:28px; border-radius:8px; background:var(--accent); display:inline-block; }}
  h1 {{ font-size:24px; margin:14px 0 4px; }}
  .sub {{ color:var(--fg-muted); font-size:14px; }}
  .card {{ background:var(--surface); border:1px solid var(--border); border-radius:12px;
    padding:20px 24px; margin:18px 0; box-shadow:0 1px 3px rgba(15,23,42,.06); }}
  h2 {{ font-size:18px; margin:0 0 14px; }}
  .muted {{ color:var(--fg-muted); }}
  .stats {{ display:flex; flex-wrap:wrap; gap:24px; }}
  .stat {{ min-width:120px; }}
  .stat .v {{ font-size:24px; font-weight:700; }}
  .stat .l {{ font-size:12px; color:var(--fg-muted); text-transform:uppercase; letter-spacing:.04em; }}
  .charts {{ display:flex; flex-wrap:wrap; gap:28px; align-items:center; }}
  .legend {{ display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; font-size:13px; color:var(--fg-secondary); }}
  .legend-item {{ display:inline-flex; align-items:center; gap:6px; }}
  .legend-dot {{ width:10px; height:10px; border-radius:3px; display:inline-block; }}
  .prose h1,.prose h2,.prose h3 {{ margin:1.1em 0 .5em; }}
  .prose pre {{ background:#0b10200a; border:1px solid var(--border); border-radius:10px;
    padding:14px; overflow:auto; }}
  .prose code {{ font-family:'JetBrains Mono',monospace; font-size:.85em; }}
  .prose table {{ border-collapse:collapse; width:100%; }}
  .prose th,.prose td {{ border:1px solid var(--border); padding:6px 10px; text-align:left; }}
  .rec {{ border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin:12px 0; }}
  .rec-head {{ display:flex; align-items:center; gap:10px; }}
  .rec-title {{ font-weight:600; }}
  .chip {{ font-size:12px; font-weight:600; padding:2px 8px; border-radius:6px; text-transform:capitalize; }}
  .rec-meta {{ display:flex; gap:10px; align-items:center; margin:8px 0; font-size:13px; }}
  .tag {{ background:#0b10200d; border-radius:6px; padding:2px 8px; font-size:12px; text-transform:capitalize; }}
  .rec-section {{ margin-top:10px; }}
  .rec-label {{ font-size:12px; color:var(--fg-muted); margin-bottom:4px; }}
  pre {{ background:#0b10200a; border:1px solid var(--border); border-radius:8px; padding:12px;
    overflow:auto; font-family:'JetBrains Mono',monospace; font-size:12px; }}
  details.raw {{ margin-top:18px; }}
  details.raw summary {{ cursor:pointer; font-weight:600; color:var(--accent); }}
  footer {{ margin-top:28px; padding-top:16px; border-top:1px solid var(--border);
    font-size:12px; color:var(--fg-muted); text-align:center; }}
  @media print {{
    body {{ background:#fff; }}
    .card {{ box-shadow:none; break-inside:avoid; }}
    .rec {{ break-inside:avoid; }}
    .no-print {{ display:none; }}
  }}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand"><span class="mark"></span> Observia</div>
    <h1>{a_type.capitalize()} Analysis Report</h1>
    <div class="sub">Analysis #{esc(str(getattr(analysis, 'id', '')))} &middot; Status: {a_status}
      &middot; Created: {esc(created_s)} &middot; Completed: {esc(completed_s)}</div>
  </header>

  <section class="card">
    <h2>Overview</h2>
    <div class="stats">
      <div class="stat"><div class="v">{total_recs}</div><div class="l">Recommendations</div></div>
      <div class="stat"><div class="v" style="color:{SEVERITY_COLORS['critical']}">{counts['critical']}</div><div class="l">Critical</div></div>
      <div class="stat"><div class="v" style="color:{SEVERITY_COLORS['high']}">{counts['high']}</div><div class="l">High</div></div>
      <div class="stat"><div class="v">{a_status}</div><div class="l">Status</div></div>
    </div>
  </section>

  <section class="card">
    <h2>Severity distribution</h2>
    <div class="charts">{donut}{bars}</div>
    {legend}
  </section>

  <section class="card">
    <h2>Summary</h2>
    <div class="prose">{summary_html}</div>
  </section>

  <section class="card">
    <h2>Recommendations</h2>
    {''.join(rec_blocks)}
  </section>

  {f'<section class="card">{raw_block}</section>' if raw_block else ''}

  <footer>Generated by Observia &middot; {esc(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}</footer>
</div>
</body>
</html>"""


@router.get("/summary", response_model=ReportSummary)
async def get_reports_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate analysis metrics for the Reports dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total = await db.scalar(
        select(func.count()).select_from(AnalysisDB).where(AnalysisDB.created_at >= since)
    )
    completed = await db.scalar(
        select(func.count())
        .select_from(AnalysisDB)
        .where(AnalysisDB.created_at >= since, AnalysisDB.status == "completed")
    )
    failed = await db.scalar(
        select(func.count())
        .select_from(AnalysisDB)
        .where(AnalysisDB.created_at >= since, AnalysisDB.status == "failed")
    )

    # Avg duration in seconds (SQLite): strftime('%s', completed_at) - strftime('%s', created_at)
    avg_duration = await db.scalar(
        select(
            func.avg(
                func.strftime("%s", AnalysisDB.completed_at)
                - func.strftime("%s", AnalysisDB.created_at)
            )
        )
        .select_from(AnalysisDB)
        .where(
            AnalysisDB.created_at >= since,
            AnalysisDB.completed_at.is_not(None),
            AnalysisDB.status.in_(("completed", "failed")),
        )
    )

    err_rows = await db.execute(
        select(AnalysisDB.error_message, func.count().label("c"))
        .where(AnalysisDB.created_at >= since, AnalysisDB.error_message.is_not(None))
        .group_by(AnalysisDB.error_message)
        .order_by(func.count().desc())
        .limit(10)
    )
    most_common_errors = [row[0] for row in err_rows.all() if row[0]]

    rec_count = await db.scalar(
        select(func.count())
        .select_from(RecommendationDB)
        .where(RecommendationDB.created_at >= since)
    )

    total_i = int(total or 0)
    completed_i = int(completed or 0)
    failed_i = int(failed or 0)
    success_rate = (completed_i / total_i) if total_i else 0.0

    return ReportSummary(
        total_analyses=total_i,
        completed=completed_i,
        failed=failed_i,
        success_rate=float(success_rate),
        average_duration=float(avg_duration or 0.0),
        most_common_errors=most_common_errors,
        recommendations_generated=int(rec_count or 0),
    )


@router.get("/analytics")
async def get_reports_analytics(
    type: str = Query(..., pattern="^(timeline|providers)$"),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Return chart-friendly analytics for the Reports dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    if type == "timeline":
        rows = await db.execute(
            select(func.date(AnalysisDB.created_at).label("d"), func.count().label("c"))
            .where(AnalysisDB.created_at >= since)
            .group_by(func.date(AnalysisDB.created_at))
            .order_by(func.date(AnalysisDB.created_at).asc())
        )
        return [ChartData(date=str(r[0]), count=int(r[1])).model_dump() for r in rows.all()]

    # providers
    rows = await db.execute(
        select(AIProviderDB.name, func.count().label("c"))
        .select_from(AnalysisDB)
        .join(AIProviderDB, AIProviderDB.id == AnalysisDB.ai_provider_id)
        .where(AnalysisDB.created_at >= since)
        .group_by(AIProviderDB.name)
        .order_by(func.count().desc())
    )
    return [
        ProviderUsage(provider=str(r[0]), count=int(r[1])).model_dump() for r in rows.all()
    ]


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a report from an analysis."""
    # Fetch analysis
    analysis_repo = AnalysisRepository(db)
    analysis = await analysis_repo.get_by_id(request.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Fetch recommendations
    result = await db.execute(
        select(RecommendationDB).where(RecommendationDB.analysis_id == request.analysis_id)
    )
    recommendations = list(result.scalars().all())

    # Increment metrics
    metrics.increment("reports_generated")

    # Generate report content
    if request.format == "json":
        content = generate_json_report(analysis, recommendations, request.include_raw_data)
        content = json.dumps(content, indent=2)
    elif request.format == "html":
        content = generate_html_report(analysis, recommendations, request.include_raw_data)
    else:
        content = generate_markdown_report(analysis, recommendations, request.include_raw_data)

    # Create a synthetic report ID (4-digit based on analysis_id)
    report_id = request.analysis_id * 1000 + 1

    return ReportResponse(
        id=report_id,
        analysis_id=request.analysis_id,
        format=request.format,
        content=content,
        include_raw_data=request.include_raw_data,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a generated report by ID."""
    # For now, return 404 as reports are generated on-demand
    raise HTTPException(status_code=404, detail="Report not found. Generate a report first.")
