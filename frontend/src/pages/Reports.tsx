import { useEffect, useState } from 'react';
import { Download, BarChart3, CheckCircle2, Clock, Lightbulb } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import AnalyticsCharts from '../components/Charts/AnalyticsCharts';
import { Spinner } from '../components/ui/EmptyState';
import { formatDuration } from '../lib/status';
import type { ChartData, ProviderUsage } from '../services/reports-api';
import { reportsApi, ReportSummary } from '../services/reports-api';

const inputClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent';

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-fg-muted text-sm mb-2">{label}</p>
          {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-semibold text-fg">{value}</p>}
        </div>
        <div className={`p-3 rounded-xl ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

export default function Reports() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<ChartData[]>([]);
  const [providerData, setProviderData] = useState<ProviderUsage[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [summaryData, timeline, providers] = await Promise.all([
          reportsApi.getSummary(days),
          reportsApi.getTimeline(days),
          reportsApi.getProviderUsage(days),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setTimelineData(timeline);
        setProviderData(providers);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const statusData = summary
    ? [
        { name: 'Completed', value: summary.completed },
        { name: 'Failed', value: summary.failed },
        { name: 'In progress', value: Math.max(0, summary.total_analyses - summary.completed - summary.failed) },
      ]
    : [];

  const handleExport = () => {
    if (!summary) return;
    const payload = {
      days,
      generated_at: new Date().toISOString(),
      summary,
      timeline: timelineData,
      providers: providerData,
      status: statusData,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observia-reports-${days}d-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Reports</h1>
          <p className="text-fg-muted text-sm mt-1">Analysis metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className={inputClass}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="secondary" onClick={handleExport} disabled={!summary}>
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total analyses" value={summary?.total_analyses ?? 0} icon={BarChart3} accent="bg-accent-soft text-accent" loading={loading} />
        <StatCard
          label="Success rate"
          value={`${((summary?.success_rate ?? 0) * 100).toFixed(1)}%`}
          icon={CheckCircle2}
          accent="bg-success/10 text-success"
          loading={loading}
        />
        <StatCard label="Avg duration" value={formatDuration(summary?.average_duration ?? 0)} icon={Clock} accent="bg-info/10 text-info" loading={loading} />
        <StatCard label="Recommendations" value={summary?.recommendations_generated ?? 0} icon={Lightbulb} accent="bg-warning/10 text-warning" loading={loading} />
      </div>

      {loading && !summary ? (
        <Spinner label="Loading reports…" />
      ) : (
        <>
          <AnalyticsCharts timelineData={timelineData} providerData={providerData} statusData={statusData} />

          {summary && summary.most_common_errors.length > 0 && (
            <Card title="Top errors">
              <div className="space-y-2">
                {summary.most_common_errors.slice(0, 5).map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-error/[0.04] px-3 py-2"
                  >
                    <span className="text-sm text-fg-secondary truncate">{err}</span>
                    <Badge variant="error" dot>
                      Error
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
