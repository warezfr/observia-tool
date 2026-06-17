import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Code2,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAnalyses } from '../contexts/AnalysesContext';
import { recommendationsApi } from '../services/api';
import { reportsApi, type AnalysisComparison } from '../services/reports-api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Markdown from '../components/ui/Markdown';
import JsonViewer from '../components/ui/JsonViewer';
import ReasoningTimeline from '../components/ReasoningTimeline';
import CompletenessBanner from '../components/CompletenessBanner';
import { Spinner } from '../components/ui/EmptyState';
import { severityVariant, statusVariant, titleCase } from '../lib/status';
import type { Analysis, Recommendation, RecommendationStatus } from '../types';

const REC_STATUSES: { value: RecommendationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Ack' },
  { value: 'resolved', label: 'Resolved' },
];

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnalysis } = useAnalyses();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [comparison, setComparison] = useState<AnalysisComparison | null>(null);

  const analysisId = useMemo(() => (id ? Number(id) : null), [id]);

  const load = async (aid: number) => {
    const a = await getAnalysis(aid);
    setAnalysis(a);
    try {
      const recs = await recommendationsApi.list({ analysis_id: aid });
      setRecommendations(recs);
    } catch {
      /* keep analysis visible even if recs fail */
    }
  };

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    setError('');
    load(analysisId)
      .catch(() => setError('Failed to load analysis'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  useEffect(() => {
    if (!analysisId || !analysis) return;
    if (!['queued', 'running'].includes(analysis.status)) return;
    const interval = window.setInterval(() => {
      load(analysisId).catch(() => {});
    }, 3000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, analysis?.status]);

  const downloadText = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!analysisId || !analysis) return;
    if (!['completed', 'partial'].includes(analysis.status)) return;
    reportsApi
      .getComparison(analysisId)
      .then(setComparison)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, analysis?.status]);

  const handleExportPdf = async () => {
    if (!analysisId) return;
    setExporting('pdf');
    try {
      const blob = await reportsApi.downloadPdf(analysisId, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const handleExport = async (format: 'json' | 'markdown' | 'html') => {
    if (!analysisId) return;
    setExporting(format);
    try {
      const res = await reportsApi.generate({ analysis_id: analysisId, format, include_raw_data: true });
      if (format === 'json') {
        downloadText(res.content, `analysis-${analysisId}.json`, 'application/json;charset=utf-8');
      } else if (format === 'markdown') {
        downloadText(res.content, `analysis-${analysisId}.md`, 'text/markdown;charset=utf-8');
      } else {
        downloadText(res.content, `analysis-${analysisId}.html`, 'text/html;charset=utf-8');
      }
    } finally {
      setExporting(null);
    }
  };

  const handleRecStatus = async (recId: number, newStatus: RecommendationStatus) => {
    await recommendationsApi.updateStatus(recId, newStatus);
    setRecommendations(prev => prev.map(r => (r.id === recId ? { ...r, status: newStatus } : r)));
  };

  if (loading) return <Spinner label="Loading analysis…" />;

  if (error || !analysis) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="mx-auto text-error" size={28} />
        <p className="mt-3 text-fg">{error || 'Analysis not found'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/analyses')}>
          <ArrowLeft size={16} /> Back to Analyses
        </Button>
      </Card>
    );
  }

  const isLive = ['queued', 'running'].includes(analysis.status);
  const steps = analysis.reasoning_steps ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/analyses')}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={16} /> Back to Analyses
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-fg">
              {titleCase(analysis.analysis_type)} Analysis
            </h1>
            <Badge variant={statusVariant[analysis.status] ?? 'warning'} dot={isLive}>
              {analysis.status}
            </Badge>
          </div>
          <p className="text-fg-muted text-sm mt-1">
            Environment #{analysis.environment_id} • Created{' '}
            {new Date(analysis.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" loading={exporting === 'markdown'} onClick={() => handleExport('markdown')}>
            <FileCode2 size={15} /> MD
          </Button>
          <Button variant="secondary" size="sm" loading={exporting === 'json'} onClick={() => handleExport('json')}>
            <FileJson size={15} /> JSON
          </Button>
          <Button variant="secondary" size="sm" loading={exporting === 'pdf'} onClick={handleExportPdf}>
            <FileText size={15} /> PDF
          </Button>
          <Button variant="primary" size="sm" loading={exporting === 'html'} onClick={() => handleExport('html')}>
            <Download size={15} /> Export HTML
          </Button>
        </div>
      </div>

      {isLive && (
        <Card className="border-info/30 bg-info/[0.06]">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 shrink-0 animate-spin text-info" size={20} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-fg">
                  Analysis {analysis.status === 'queued' ? 'queued' : 'in progress'}
                </p>
                <span className="text-xs text-fg-muted">Auto-refreshing every 3s</span>
              </div>
              <p className="text-sm text-fg-secondary mt-1">
                {steps.length > 0
                  ? `${steps.length} reasoning ${steps.length === 1 ? 'step' : 'steps'} so far${
                      steps[steps.length - 1]?.tool ? ` — using ${steps[steps.length - 1].tool}` : ''
                    }.`
                  : 'Waiting for the agent to start reasoning…'}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-info/15">
                <div className="h-full w-1/3 animate-slideIn rounded-full bg-info" style={{ animation: 'shimmer 1.5s infinite' }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {analysis.error_message && (
        <Card className="border-error/30 bg-error/[0.06]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-error" size={20} />
            <div>
              <p className="font-medium text-error">Analysis failed</p>
              <p className="text-sm text-fg-secondary mt-1 whitespace-pre-wrap">{analysis.error_message}</p>
            </div>
          </div>
        </Card>
      )}

      <CompletenessBanner completeness={analysis.result?.completeness} />

      {analysis.result?.summary && (
        <Card title="Result summary">
          <Markdown>{analysis.result.summary}</Markdown>
        </Card>
      )}

      {comparison?.has_baseline && comparison.metrics.length > 0 && (
        <Card title={`Comparison vs analysis #${comparison.baseline_analysis_id}`}>
          <div className="space-y-2">
            {comparison.metrics.map((m) => (
              <div
                key={m.metric}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 truncate font-mono text-xs text-fg-secondary">{m.metric}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-fg-muted">
                    {m.previous_avg} → <span className="text-fg">{m.current_avg}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      m.regressed ? 'text-error' : 'text-success'
                    }`}
                  >
                    {m.regressed ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {m.delta_pct !== null ? `${m.delta_pct > 0 ? '+' : ''}${m.delta_pct}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {steps.length > 0 && (
        <Card title="Reasoning steps">
          <ReasoningTimeline steps={steps} />
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card title={`Recommendations (${recommendations.length})`}>
          <div className="space-y-3">
            {recommendations.map(rec => (
              <div key={rec.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{rec.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant[rec.severity] ?? 'default'}>{rec.severity}</Badge>
                      <Badge variant="default">{rec.level}</Badge>
                      <span className="text-xs text-fg-muted">{rec.impact}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                    {REC_STATUSES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => handleRecStatus(rec.id, s.value)}
                        className={`rounded-md px-2 py-1 text-xs transition-colors ${
                          rec.status === s.value
                            ? 'bg-accent text-accent-fg'
                            : 'text-fg-secondary hover:bg-fg/5'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {rec.description && (
                  <div className="mt-3 text-sm text-fg-secondary">
                    <Markdown>{rec.description}</Markdown>
                  </div>
                )}
                {rec.action && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-fg-muted mb-1">Action</div>
                    <p className="text-sm text-fg-secondary whitespace-pre-wrap">{rec.action}</p>
                  </div>
                )}
                {rec.script && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1">
                      <Code2 size={13} /> Script{rec.script_type ? ` (${rec.script_type})` : ''}
                    </div>
                    <pre className="overflow-x-auto rounded-lg border border-border bg-fg/[0.03] p-3 text-xs text-fg-secondary">
                      {rec.script}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis.result?.raw_data && analysis.result.raw_data.length > 0 && (
        <Card title="Raw data">
          <button
            onClick={() => setShowRaw(s => !s)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover"
          >
            <Code2 size={15} /> {showRaw ? 'Hide' : 'Show'} raw data ({analysis.result.raw_data.length} items)
          </button>
          {showRaw && <JsonViewer data={analysis.result.raw_data} collapsedDepth={1} />}
        </Card>
      )}

      {!analysis.result && steps.length === 0 && !analysis.error_message && !isLive && (
        <Card className="text-center py-10">
          <p className="text-sm text-fg-muted">No results available yet.</p>
        </Card>
      )}
    </div>
  );
}
