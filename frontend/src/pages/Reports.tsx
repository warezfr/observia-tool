import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AnalyticsCharts from '../components/Charts/AnalyticsCharts';
import type { ChartData, ProviderUsage } from '../services/reports-api';
import { reportsApi, ReportSummary } from '../services/reports-api';
import { Download } from 'lucide-react';

export default function Reports() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<ChartData[]>([]);
  const [providerData, setProviderData] = useState<ProviderUsage[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [summaryData, timeline, providers] = await Promise.all([
          reportsApi.getSummary(days),
          reportsApi.getTimeline(days),
          reportsApi.getProviderUsage(days),
        ]);
        setSummary(summaryData);
        setTimelineData(timeline);
        setProviderData(providers);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [days]);

  if (loading) return <div className="text-slate-400">Loading reports...</div>;
  if (!summary) return <div className="text-slate-400">No data available</div>;

  const statusData = [
    { name: 'Completed', value: summary.completed },
    { name: 'Failed', value: summary.failed },
    { name: 'Running', value: Math.max(0, summary.total_analyses - summary.completed - summary.failed) },
  ];

  const handleExport = () => {
    const payload = {
      days,
      generated_at: new Date().toISOString(),
      summary,
      timeline: timelineData,
      providers: providerData,
      status: statusData,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-slate-400 mt-1">Analysis metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button className="flex items-center gap-2" onClick={handleExport}>
            <Download size={18} />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-slate-400 text-sm mb-2">Total Analyses</p>
          <p className="text-3xl font-bold">{summary.total_analyses}</p>
        </Card>
        <Card>
          <p className="text-slate-400 text-sm mb-2">Success Rate</p>
          <p className="text-3xl font-bold">{(summary.success_rate * 100).toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-slate-400 text-sm mb-2">Avg Duration</p>
          <p className="text-3xl font-bold">{summary.average_duration.toFixed(1)}s</p>
        </Card>
        <Card>
          <p className="text-slate-400 text-sm mb-2">Recommendations</p>
          <p className="text-3xl font-bold">{summary.recommendations_generated}</p>
        </Card>
      </div>

      <AnalyticsCharts timelineData={timelineData} providerData={providerData} statusData={statusData} />

      {summary.most_common_errors.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Top Errors</h3>
          <div className="space-y-2">
            {summary.most_common_errors.slice(0, 5).map((error, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-slate-300">{error}</span>
                <Badge variant="error">Error</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
