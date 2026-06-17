import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Analysis, Recommendation } from '../types';
import { extractMetricSignals, extractRawDataTools } from '../utils/metricSignals';
import { severityVariant, statusVariant, titleCase } from '../lib/status';
import { recommendationsApi } from '../services/api';
import { reportsApi, type AnalysisComparison } from '../services/reports-api';
import { useChartColors } from './Charts/chartTheme';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Card from './ui/Card';
import Markdown from './ui/Markdown';
import JsonViewer from './ui/JsonViewer';
import ReasoningTimeline from './ReasoningTimeline';
import NextBestActions from './NextBestActions';
import CompletenessBanner from './CompletenessBanner';
import InvestigationChecklist from './InvestigationChecklist';
import { Spinner } from './ui/EmptyState';

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ExportFormat = 'markdown' | 'json' | 'html' | 'pdf';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;
type Severity = (typeof SEVERITY_ORDER)[number];

function severityCounts(recs: Recommendation[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of recs) {
    const s = String(r.severity ?? '').toLowerCase() as Severity;
    if (s in out) out[s] += 1;
  }
  return out;
}

export default function AnalysisReportPreview({
  analysisId,
  getAnalysis,
  onClose,
  onOpenDetail,
}: {
  analysisId: number;
  getAnalysis: (id: number) => Promise<Analysis>;
  onClose?: () => void;
  onOpenDetail?: () => void;
}) {
  const colors = useChartColors();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [comparison, setComparison] = useState<AnalysisComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const load = async (id: number) => {
    const a = await getAnalysis(id);
    setAnalysis(a);
    try {
      const rr = await recommendationsApi.list({ analysis_id: id });
      setRecs(rr);
    } catch {
      setRecs([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load(analysisId)
      .catch(() => {
        if (!cancelled) setError('Failed to load analysis preview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  useEffect(() => {
    if (!analysis) return;
    if (!['queued', 'running'].includes(analysis.status)) return;
    const interval = window.setInterval(() => {
      load(analysisId).catch(() => {});
    }, 3000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, analysis?.status]);

  useEffect(() => {
    if (!analysis) return;
    if (!['completed', 'partial'].includes(analysis.status)) return;
    reportsApi
      .getComparison(analysisId)
      .then(setComparison)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, analysis?.status]);

  const metricSignals = useMemo(() => extractMetricSignals(analysis?.result ?? null), [analysis?.result]);
  const rawDataTools = useMemo(
    () => extractRawDataTools(analysis?.result?.raw_data),
    [analysis?.result?.raw_data]
  );
  const counts = useMemo(() => severityCounts(recs), [recs]);
  const severityData = useMemo(
    () =>
      SEVERITY_ORDER.map((sev) => ({
        sev,
        count: counts[sev],
        color:
          sev === 'critical'
            ? colors.severity.critical
            : sev === 'high'
              ? colors.severity.high
              : sev === 'medium'
                ? colors.severity.medium
                : colors.severity.low,
      })).filter((d) => d.count > 0),
    [counts, colors]
  );

  const isLive = analysis ? ['queued', 'running'].includes(analysis.status) : false;
  const statusLabel = analysis ? (analysis.status === 'queued' ? 'Queued' : analysis.status === 'running' ? 'Running' : titleCase(analysis.status)) : '';

  const tooltipStyle = {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    color: colors.tooltipText,
  } as const;

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      if (format === 'pdf') {
        const blob = await reportsApi.downloadPdf(analysisId, true);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-${analysisId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const res = await reportsApi.generate({
        analysis_id: analysisId,
        format: format === 'markdown' ? 'markdown' : format === 'json' ? 'json' : 'html',
        include_raw_data: true,
      });
      if (format === 'json') downloadText(res.content, `analysis-${analysisId}.json`, 'application/json;charset=utf-8');
      if (format === 'markdown') downloadText(res.content, `analysis-${analysisId}.md`, 'text/markdown;charset=utf-8');
      if (format === 'html') downloadText(res.content, `analysis-${analysisId}.html`, 'text/html;charset=utf-8');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <Spinner label="Loading preview…" />;

  if (error || !analysis) {
    return (
      <Card className="py-10 text-center">
        <AlertTriangle className="mx-auto text-error" size={28} />
        <p className="mt-3 text-fg">{error || 'Preview unavailable'}</p>
        <Button variant="secondary" className="mt-4" onClick={() => load(analysisId)}>
          <RefreshCw size={16} /> Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-fg truncate">
              {titleCase(analysis.analysis_type)} report
            </h2>
            <Badge variant={statusVariant[analysis.status] ?? 'warning'} dot={isLive}>
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            #{analysis.id} • Env #{analysis.environment_id} • {new Date(analysis.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onOpenDetail && (
            <Button variant="ghost" size="sm" onClick={onOpenDetail} title="Open full analysis">
              Open <ArrowRight size={15} />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} title="Close preview">
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" loading={exporting === 'markdown'} onClick={() => handleExport('markdown')}>
          <FileCode2 size={15} /> MD
        </Button>
        <Button variant="secondary" size="sm" loading={exporting === 'json'} onClick={() => handleExport('json')}>
          <FileJson size={15} /> JSON
        </Button>
        <Button variant="secondary" size="sm" loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>
          <FileText size={15} /> PDF
        </Button>
        <Button size="sm" loading={exporting === 'html'} onClick={() => handleExport('html')}>
          <Download size={15} /> Export HTML
        </Button>
      </div>

      {isLive && (
        <Card className="border-info/30 bg-info/[0.06]" bodyClassName="p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 shrink-0 animate-spin text-info" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">
                {analysis.status === 'queued' ? 'Queued' : 'In progress'}
              </p>
              <p className="mt-1 text-xs text-fg-secondary">
                Auto-refreshing every 3s. {analysis.reasoning_steps?.length ?? 0} reasoning steps.
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-info/15">
                <div
                  className="h-full w-1/3 animate-slideIn rounded-full bg-info"
                  style={{ animation: 'shimmer 1.5s infinite' }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {analysis.error_message && (
        <Card className="border-error/30 bg-error/[0.06]" bodyClassName="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-error" size={18} />
            <div>
              <p className="text-sm font-medium text-error">Analysis failed</p>
              <p className="mt-1 text-xs text-fg-secondary whitespace-pre-wrap">{analysis.error_message}</p>
            </div>
          </div>
        </Card>
      )}

      <CompletenessBanner completeness={analysis.result?.completeness} />

      {!isLive && recs.length > 0 && <NextBestActions recommendations={recs} />}

      <InvestigationChecklist
        analysisType={analysis.analysis_type}
        metricSignals={metricSignals}
        rawDataTools={rawDataTools}
      />

      <Card title="Summary" bodyClassName="p-4">
        <Markdown>{analysis.result?.summary || 'No summary available yet.'}</Markdown>
      </Card>

      {metricSignals.length > 0 && (
        <Card title="Golden Signals" bodyClassName="p-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                      Metric
                    </th>
                    {['Latest', 'Avg', 'Min', 'Max', 'Points'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-fg-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricSignals.slice(0, 12).map((s) => (
                    <tr key={s.metric} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs font-mono text-fg-secondary">{s.metric}</td>
                      <td className="px-3 py-2 text-right text-xs text-fg tabular-nums">{s.latest}</td>
                      <td className="px-3 py-2 text-right text-xs text-fg-secondary tabular-nums">{s.avg}</td>
                      <td className="px-3 py-2 text-right text-xs text-fg-secondary tabular-nums">{s.min}</td>
                      <td className="px-3 py-2 text-right text-xs text-fg-secondary tabular-nums">{s.max}</td>
                      <td className="px-3 py-2 text-right text-xs text-fg-muted tabular-nums">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-[180px] rounded-lg border border-border bg-surface p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricSignals.slice(0, 10)} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="metric"
                    stroke={colors.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: colors.grid }}
                    interval={0}
                    tickFormatter={(v) => String(v).split('.').slice(-1)[0]}
                  />
                  <YAxis
                    stroke={colors.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="latest" radius={[6, 6, 0, 0]} fill={colors.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Findings (${recs.length})`} bodyClassName="p-4">
        {recs.length === 0 ? (
          <p className="text-sm text-fg-muted">No recommendations yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="h-[180px] rounded-lg border border-border bg-surface p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="count"
                      nameKey="sev"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {severityData.map((d) => (
                        <Cell key={d.sev} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[180px] rounded-lg border border-border bg-surface p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={SEVERITY_ORDER.map((sev) => ({ sev, count: counts[sev] }))}
                    layout="vertical"
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" stroke={colors.axis} fontSize={11} tickLine={false} axisLine={{ stroke: colors.grid }} />
                    <YAxis type="category" dataKey="sev" stroke={colors.axis} fontSize={11} width={80} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {SEVERITY_ORDER.map((sev) => (
                        <Cell
                          key={sev}
                          fill={
                            sev === 'critical'
                              ? colors.severity.critical
                              : sev === 'high'
                                ? colors.severity.high
                                : sev === 'medium'
                                  ? colors.severity.medium
                                  : colors.severity.low
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              {recs.slice(0, 30).map((rec) => (
                <div key={rec.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">{rec.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={severityVariant[rec.severity] ?? 'default'}>{rec.severity}</Badge>
                        <Badge variant="default">{rec.level}</Badge>
                        <span className="text-xs text-fg-muted">{rec.impact}</span>
                      </div>
                    </div>
                  </div>
                  {rec.description && (
                    <div className="mt-2 text-sm text-fg-secondary">
                      <Markdown>{rec.description}</Markdown>
                    </div>
                  )}
                </div>
              ))}
              {recs.length > 30 && (
                <p className="text-xs text-fg-muted">Showing first 30 recommendations. Open full view for the rest.</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {comparison?.has_baseline && comparison.metrics.length > 0 && (
        <Card title={`Comparison vs analysis #${comparison.baseline_analysis_id}`} bodyClassName="p-4">
          <div className="space-y-2">
            {comparison.metrics.slice(0, 8).map((m) => (
              <div
                key={m.metric}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 truncate font-mono text-xs text-fg-secondary">{m.metric}</span>
                <span className="text-xs text-fg-muted tabular-nums">
                  {m.previous_avg} → <span className="text-fg">{m.current_avg}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!!analysis.reasoning_steps?.length && (
        <Card title="Reasoning steps" bodyClassName="p-4">
          <ReasoningTimeline steps={analysis.reasoning_steps} />
        </Card>
      )}

      {analysis.result?.raw_data && Array.isArray(analysis.result.raw_data) && analysis.result.raw_data.length > 0 && (
        <Card title="Raw data" bodyClassName="p-4">
          <button
            onClick={() => setShowRaw((s) => !s)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover"
          >
            {showRaw ? 'Hide' : 'Show'} raw data ({analysis.result.raw_data.length} items)
          </button>
          {showRaw && <JsonViewer data={analysis.result.raw_data} collapsedDepth={1} />}
        </Card>
      )}
    </div>
  );
}

