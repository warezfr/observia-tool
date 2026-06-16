# Observia — "Clair" SaaS 2026 Redesign + Functional Improvements

Date: 2026-06-16
Status: Approved
Scope: End-to-end UI/UX redesign + functional improvements of the Observia self-hosted
Dynatrace AI-analysis tool. Frontend (React 18 + Vite + TS + Tailwind 3 + recharts +
lucide-react) and backend (FastAPI + SQLite). No NAS deploy.

## 1. Design direction

"Clair" — a Stripe/Vercel-flavoured SaaS look for 2026. Clean, light-first, generous
whitespace, soft layered shadows in light mode, crisp hairline borders in dark mode,
indigo accent. **Light is the default theme.** A light/dark toggle is persisted in
`localStorage` and applied via a `data-theme` attribute on `<html>`.

### Palette (CSS variables, RGB channels for Tailwind `<alpha-value>` support)

LIGHT:
- app `#F6F7F9`, surface `#FFFFFF`, elevated `#FFFFFF`, border `#E7E9EE`
- text primary `#0B1020`, secondary `#475467`, muted `#6B7280`
- accent indigo: base `#4F46E5`, hover `#4338CA`, soft `#EEF2FF`, ring `#C7D2FE`
- semantic: success `#16A34A`, warning `#D97706`, error `#DC2626`, info `#2563EB`

DARK:
- app `#0B0E14`, surface `#11151D`, elevated `#161B26`, border `#1F2430`
- text primary `#E6E8EE`, secondary `#B4BCCB`, muted `#8A93A6`, accent `#818CF8`

SEVERITY (both themes): critical `#DC2626`, high `#EA580C`, medium `#D97706`, low `#16A34A`.

Fonts: Inter (UI), JetBrains Mono (code). Radii: cards 12px (`rounded-xl`), controls 8px
(`rounded-lg`). Soft layered shadows in light, subtle borders in dark.

## 2. Token system architecture

- `frontend/src/index.css`: declares all tokens as space-separated RGB channels under
  `:root` (light) and `[data-theme="dark"]`. Also sets `color-scheme`, base body styles
  using tokens, themed scrollbars, skeleton shimmer, and `prose` styles for Markdown.
- `frontend/tailwind.config.js`: maps semantic Tailwind colors to
  `rgb(var(--token) / <alpha-value>)` so opacity modifiers (`bg-success/10`) keep working.
  Tokens: `app`, `surface`, `elevated`, `border`, `fg`/`fg-secondary`/`fg-muted`,
  `accent`/`accent-hover`/`accent-soft`/`accent-ring`, `success`/`warning`/`error`/`info`,
  `severity-{critical,high,medium,low}`. Adds `boxShadow.soft`/`card` and keeps fade/slide
  animations.
- `frontend/src/contexts/ThemeContext.tsx`: `ThemeProvider` reads `observia-theme` from
  localStorage (default `light`), applies `data-theme`, exposes `{theme, toggleTheme,
  setTheme}`. `useTheme()` hook. A `ThemeToggle` button lives in the topbar.

## 3. UI primitives

Updated to tokens: `Card` (surface + border + soft shadow, 12px radius), `Button`
(primary/secondary/danger/ghost/outline using accent + tokens, 8px radius), `Badge`
(semantic + severity + neutral variants), `Toast`, `Skeleton`.

New shared components (`frontend/src/components/ui` + `frontend/src/components`):
- `ThemeToggle` — sun/moon toggle.
- `Markdown` — `react-markdown` + `remark-gfm` with themed prose (titles, lists, code,
  tables, links). Replaces `whitespace-pre-wrap` summary in AnalysisDetail.
- `DataTable<T>` — reusable client-side table: text search, column sort, pluggable filter
  dropdowns; empty/loading states. Used by Analyses and Reports-adjacent lists.
- `JsonViewer` — collapsible/foldable recursive JSON tree (objects/arrays/primitives).
- `ChartCard` — themed wrapper around recharts (title, subtitle, height, empty state) that
  reads palette via CSS vars for axis/grid/tooltip styling.
- `ReasoningTimeline` — collapsible animated steps for `{type, content, tool}` shape;
  distinguishes `tool_call` / `tool_result` / `thinking`; shows tool name/args/result with
  icons.
- `EmptyState` / `Spinner` — polished empty/loading/error states with inline SVG art.
- `ProgressBar` / live progress block for queued/running analyses.

## 4. Page-by-page changes

- **Shell**: `Layout` becomes app-bg + Sidebar + sticky topbar (page title slot, theme
  toggle). `Sidebar` re-themed (surface, accent active state, collapse).
- **Dashboard**: token stat cards, success-rate + severity donut, analyses-over-time line,
  analyses-by-type bars (via ChartCard), recent list, polished empty/setup states.
- **Analyses (list)**: `DataTable` with search + status/type/environment filters + sort;
  themed "New Analysis" form; live status badges; row → detail.
- **AnalysisDetail**: Markdown summary, `ReasoningTimeline`, `JsonViewer` for raw data,
  recommendations with severity chips + action/script blocks, improved live progress, and
  **Export MD / JSON / HTML** buttons. HTML calls `reportsApi.generate({format:'html'})`
  and downloads `analysis-<id>.html` (`text/html`).
- **Reports**: ChartCard charts (success rate, timeline, severity distribution, provider
  usage, avg duration), stat header, top errors, range selector.
- **Environments / AIProviders**: re-themed forms, preset cards, list rows, CRUD intact.
- **Settings (+ Users/Preferences tabs)**: token tabs; Preferences theme select wired to
  `ThemeContext`.
- **Integrations / Automation**: re-themed cards/editors (mock data preserved).

## 5. Backend — standalone HTML report export (Approved 2A)

`server/app/api/v1/reports.py`:
- `ReportGenerateRequest.format` Literal extended to include `"html"`.
- `generate_html_report(analysis, recommendations, include_raw_data)` returns a COMPLETE
  self-contained HTML doc: inline `<style>` only (no external CSS/JS/CDN), light palette,
  print-friendly `@media print`. Renders the markdown summary server-side to HTML (light
  dependency `markdown` added to `server/requirements.txt`, with a minimal fallback
  converter if unavailable), recommendations with severity color chips + action + script
  blocks, a summary stat header, and an **inline SVG** severity-distribution donut + bars
  generated from the recommendation data. `include_raw_data` appends a collapsed
  `<details>` with pretty JSON.
- `POST /reports/generate` returns the HTML string in `ReportResponse.content` with
  `format="html"`.

## 6. Testing (Approved: automated)

- **Backend**: `server/tests/` with pytest. `test_reports.py` covers json/markdown/html
  generation (structure, severity chips, inline SVG, raw-data details) using lightweight
  stub analysis/recommendation objects (report generators are pure attribute readers).
  `pytest` + `markdown` added to `server/requirements.txt`; config already in `pyproject.toml`.
- **Frontend**: Vitest + @testing-library/react + jsdom. Covers theme toggle persistence,
  DataTable filtering/sorting, Markdown rendering, and HTML/MD export button calls. Adds
  `test` script + `vitest.config.ts` + `src/test/setup.ts`.

## 7. Verification

`cd frontend && npm install && npm run build` (no type errors); `cd server && python -m
compileall app` + `pytest`; `npm test`. Fix all introduced errors and lints. Commit in
logical groups; do not push.

## 8. Intentionally preserved

Analysis creation/polling, providers/environments CRUD, MCP/API tool flow, existing API
contracts, recommendations status updates. Mock-data pages (Integrations/Automation/Users)
keep their mock behaviour, only re-themed.
