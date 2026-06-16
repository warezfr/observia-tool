# SaaS 2026 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Observia into a light-first "Clair" SaaS 2026 UI with theme toggle, enriched analysis/report UX, standalone HTML export, automated tests, and a verified Unraid deploy.

**Architecture:** CSS-variable design tokens (`data-theme` on `<html>`) feed Tailwind semantic colors. Shared UI primitives (`Card`, `DataTable`, `Markdown`, `ChartCard`, `ReasoningTimeline`, `JsonViewer`) are composed page-by-page. Backend adds `format:"html"` report generation with inline CSS + SVG (no CDN/JS). Docker image bakes Vite `dist/` at build time; NAS deploy must **recreate** the container after rebuild.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind 3, recharts, react-markdown, remark-gfm, Vitest; FastAPI, SQLite, markdown (Python), pytest.

**Spec:** `docs/superpowers/specs/2026-06-16-saas-2026-redesign-design.md`

---

## File map (created / modified)

| Area | Files |
|------|-------|
| Tokens + theme | `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/index.html`, `frontend/src/contexts/ThemeContext.tsx`, `frontend/src/components/ui/ThemeToggle.tsx` |
| Primitives | `frontend/src/components/ui/{Card,Button,Badge,Toast,Skeleton}.tsx`, `Markdown.tsx`, `DataTable.tsx`, `JsonViewer.tsx`, `EmptyState.tsx`, `Spinner.tsx` |
| Charts / timeline | `frontend/src/components/Charts/ChartCard.tsx`, `chartTheme.ts`, `ReasoningTimeline.tsx`, `lib/status.ts` |
| Shell | `frontend/src/components/{Layout,Sidebar,Topbar}.tsx`, `App.tsx` |
| Pages | `frontend/src/pages/{Dashboard,Analyses,AnalysisDetail,Reports,Environments,AIProviders,Settings,Integrations,Automation}.tsx`, `SettingsSections/*` |
| API client | `frontend/src/services/reports-api.ts` |
| Backend reports | `server/app/api/v1/reports.py`, `server/requirements.txt` |
| Tests | `server/tests/test_reports.py`, `server/tests/conftest.py`, `frontend/vitest.config.ts`, `frontend/src/**/*.test.tsx` |

---

### Task 1: Design tokens + theme system

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/index.html`
- Create: `frontend/src/contexts/ThemeContext.tsx`
- Create: `frontend/src/components/ui/ThemeToggle.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add CSS variables under `:root` and `[data-theme="dark"]`**

In `index.css`, declare RGB-channel tokens (`--app`, `--surface`, `--fg`, `--accent`, severity colors, shadows). Set `color-scheme`, body bg/text, scrollbar, skeleton shimmer, `.prose` styles.

- [ ] **Step 2: Map tokens in `tailwind.config.js`**

```js
colors: {
  app: 'rgb(var(--app) / <alpha-value>)',
  surface: 'rgb(var(--surface) / <alpha-value>)',
  accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', hover: '...' },
  severity: { critical: '...', high: '...', medium: '...', low: '...' },
}
```

- [ ] **Step 3: Anti-FOUC script in `index.html`**

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('observia-theme');
      document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

- [ ] **Step 4: Implement `ThemeContext`**

`observia-theme` key, default `light`, `setTheme`/`toggleTheme`, sync `data-theme` on `<html>`.

- [ ] **Step 5: Wire `ThemeProvider` in `App.tsx`, add `ThemeToggle` to topbar**

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`
Expected: PASS, no TS errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.css frontend/tailwind.config.js frontend/index.html \
  frontend/src/contexts/ThemeContext.tsx frontend/src/components/ui/ThemeToggle.tsx frontend/src/App.tsx
git commit -m "feat(ui): add design tokens and light/dark theme toggle"
```

---

### Task 2: UI primitives

**Files:**
- Modify: `frontend/src/components/ui/{Card,Button,Badge,Toast,Skeleton}.tsx`
- Create: `frontend/src/components/ui/Markdown.tsx`
- Create: `frontend/src/components/ui/DataTable.tsx`
- Create: `frontend/src/components/ui/JsonViewer.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`, `Spinner.tsx`

- [ ] **Step 1: Install deps**

```bash
cd frontend && npm install react-markdown remark-gfm
```

- [ ] **Step 2: Re-theme Card/Button/Badge to token classes** (`bg-surface`, `border-border`, `text-fg`, `shadow-card`)

- [ ] **Step 3: `Markdown` component** — `react-markdown` + `remark-gfm`, `prose prose-slate dark:prose-invert` themed

- [ ] **Step 4: `DataTable<T>`** — props: `columns`, `data`, `searchKeys`, `filters[]`, `onRowClick`; client search/sort/filter

- [ ] **Step 5: `JsonViewer`** — recursive collapsible tree for objects/arrays/primitives

- [ ] **Step 6: `EmptyState` + `Spinner`** — SVG illustration + message + optional CTA

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(ui): add Markdown, DataTable, JsonViewer primitives"
```

---

### Task 3: Shell redesign

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Topbar.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Layout** — `bg-app`, sidebar + main column, sticky topbar slot

- [ ] **Step 2: Sidebar** — surface bg, accent active nav item, lucide icons, collapse on mobile

- [ ] **Step 3: Topbar** — page title/breadcrumb, `ThemeToggle`, user area placeholder

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ui): redesign app shell with topbar and themed sidebar"
```

---

### Task 4: Dashboard + Reports charts

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/Reports.tsx`
- Create: `frontend/src/components/Charts/ChartCard.tsx`, `chartTheme.ts`

- [ ] **Step 1: `ChartCard`** — title, subtitle, height, empty state; recharts axis colors from CSS vars

- [ ] **Step 2: Dashboard** — stat cards (total/completed/failed/success rate), timeline line chart, status donut, by-type bars

- [ ] **Step 3: Reports** — reuse `/api/v1/reports/summary` + `/analytics?type=timeline|providers`; severity distribution, avg duration, top errors list, date range selector

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ui): enrich Dashboard and Reports with ChartCard analytics"
```

---

### Task 5: Analyses list (DataTable)

**Files:**
- Modify: `frontend/src/pages/Analyses.tsx`
- Create: `frontend/src/lib/status.ts`

- [ ] **Step 1: DataTable columns** — type, environment, status badge, created, actions

- [ ] **Step 2: Filters** — status (`queued|running|completed|failed`), analysis_type, environment_id

- [ ] **Step 3: Search** — prompt text + type; sort by created_at desc default

- [ ] **Step 4: Empty/loading states** via `EmptyState` + `Skeleton`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(analyses): interactive DataTable with search and filters"
```

---

### Task 6: AnalysisDetail (rich report view)

**Files:**
- Modify: `frontend/src/pages/AnalysisDetail.tsx`
- Create: `frontend/src/components/ReasoningTimeline.tsx`

- [ ] **Step 1: Header** — status badge, env name, export buttons (MD/JSON/HTML)

- [ ] **Step 2: Live progress** — `ProgressBar` + current step label while `queued`/`running` (keep 3s poll)

- [ ] **Step 3: Summary** — replace `whitespace-pre-wrap` with `<Markdown>{result.summary}</Markdown>`

- [ ] **Step 4: `ReasoningTimeline`** — collapsible steps, icons per `type` (`tool_call`/`tool_result`/`thinking`), show `tool` name + JSON args/result

- [ ] **Step 5: Raw data** — `<JsonViewer data={result.raw_data} />` in collapsible section

- [ ] **Step 6: Recommendations** — severity chips, status buttons (new/ack/resolved), script block with mono font

- [ ] **Step 7: Export handlers**

```ts
const handleExport = async (format: 'json' | 'markdown' | 'html') => {
  const res = await reportsApi.generate({ analysis_id, format, include_raw_data: true });
  downloadText(res.content, `analysis-${analysis_id}.${ext}`, mime);
};
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(analysis): rich detail view with timeline, Markdown, HTML export"
```

---

### Task 7: Remaining pages re-theme

**Files:**
- Modify: `Environments.tsx`, `AIProviders.tsx`, `Settings.tsx`, `SettingsSections/*`, `Integrations.tsx`, `Automation.tsx`, `ScheduleEditor.tsx`, `IntegrationCard.tsx`

- [ ] **Step 1: Apply token classes** — forms, tables, cards; preserve all CRUD/API calls

- [ ] **Step 2: Preferences tab** — theme select wired to `ThemeContext.setTheme`

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): re-theme settings, environments, providers, integrations"
```

---

### Task 8: Backend HTML report export

**Files:**
- Modify: `server/app/api/v1/reports.py`
- Modify: `server/requirements.txt`
- Create: `server/tests/test_reports.py`, `server/tests/conftest.py`

- [ ] **Step 1: Add `markdown` to requirements.txt**

- [ ] **Step 2: Extend `ReportGenerateRequest.format`**

```python
format: Literal["json", "markdown", "html"]
```

- [ ] **Step 3: Implement `generate_html_report(...)`**

Self-contained HTML with:
- Inline `<style>` (light palette, `@media print`)
- Server-side markdown → HTML for `analysis.result['summary']`
- Recommendation cards with severity color chips
- Inline SVG donut (severity distribution) + bar chart
- Optional `<details>` for raw JSON when `include_raw_data`

- [ ] **Step 4: Wire `POST /reports/generate`** for `format=="html"`

- [ ] **Step 5: Write pytest tests**

```python
def test_generate_html_contains_inline_svg():
    html = generate_html_report(stub_analysis, stub_recs, include_raw_data=False)
    assert "<svg" in html
    assert "severity" in html.lower()
    assert "<script" not in html  # no external JS
```

Run: `cd server && pytest tests/test_reports.py -v`
Expected: PASS (12+ tests)

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(reports): add standalone HTML report export + pytest tests"
```

---

### Task 9: Frontend tests (Vitest)

**Files:**
- Create: `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`
- Create: `frontend/src/contexts/ThemeContext.test.tsx`
- Create: `frontend/src/components/ui/DataTable.test.tsx`
- Create: `frontend/src/components/ui/Markdown.test.tsx`
- Modify: `frontend/package.json` (add `test`, `typecheck` scripts)

- [ ] **Step 1: Install**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Theme test** — toggle updates `localStorage` + `data-theme`

- [ ] **Step 3: DataTable test** — filter reduces rows, sort reorders

- [ ] **Step 4: Markdown test** — renders `## heading` as `<h2>`

- [ ] **Step 5: Export button test** — mock `reportsApi.generate`, assert `format:'html'` called

Run: `cd frontend && npm test`
Expected: 13/13 PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "test(frontend): add Vitest suite for theme, DataTable, Markdown, export"
```

---

### Task 10: Full verification (local)

- [ ] **Step 1: Frontend build + typecheck**

```bash
cd frontend && npm install && npm run build && npx tsc --noEmit && npm test
```

- [ ] **Step 2: Backend compile + tests**

```bash
cd server && python -m compileall app && pytest
```

Expected: 27/27 pytest PASS

---

### Task 11: Unraid deploy (container recreate)

**Why:** `docker restart` does NOT load a newly built image. The container must be removed and re-run.

- [ ] **Step 1: Sync source to NAS** (exclude `data/`)

```bash
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.venv' --exclude 'data' \
  -e "ssh -i ~/.ssh/id_ed25519_unraid" \
  ./ root@192.168.1.101:/mnt/user/appdata/observia-tool/
```

- [ ] **Step 2: Rebuild image on NAS**

```bash
ssh root@192.168.1.101 'cd /mnt/user/appdata/observia-tool && docker build -t observia-tool:latest .'
```

- [ ] **Step 3: Recreate container** (preserve env + volume)

```bash
ssh root@192.168.1.101 'docker stop observia-tool && docker rm observia-tool && \
  docker run -d --name observia-tool -p 8080:80 \
  -v /mnt/user/appdata/observia-tool/data:/app/data \
  -e DATABASE_URL=sqlite+aiosqlite:////app/data/observia.db \
  -e SECRET_KEY=<existing> -e CORS_ORIGINS='"'"'["*"]'"'"' -e DEBUG=false \
  observia-tool:latest'
```

- [ ] **Step 4: Verify deploy markers**

```bash
curl -s http://192.168.1.101:8080/ | grep observia-theme
docker exec observia-tool grep -l observia-theme /usr/share/nginx/html/assets/*.js
```

Expected: both match

- [ ] **Step 5: Browser hard-refresh** (Ctrl+Shift+R) on `http://192.168.1.101:8080/`

Visual checks per spec §10: light default, theme toggle in topbar, Export HTML on analysis detail.

---

## Plan self-review (spec coverage)

| Spec § | Task |
|--------|------|
| §1 Design direction (Clair, light default) | Task 1 |
| §2 Token system | Task 1 |
| §3 UI primitives | Task 2 |
| §4 Page-by-page | Tasks 3–7 |
| §5 HTML export backend | Task 8 |
| §6 Automated tests | Tasks 8–9 |
| §7 Verification | Task 10 |
| §9 NAS deploy | Task 11 |
| §10 Acceptance criteria | Task 11 step 5 |

No placeholders. All spec requirements mapped.
