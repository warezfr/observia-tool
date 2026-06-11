import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Bot,
  CheckCircle2,
  XCircle,
  Gauge,
  ShieldCheck,
  DollarSign,
  Activity,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import { useAnalyses } from '../contexts/AnalysesContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import type { Analysis, AnalysisType, AnalysisStatus } from '../types';

const typeIcon: Record<AnalysisType, ReactIcon> = {
  performance: Gauge,
  availability: Activity,
  security: ShieldCheck,
  cost: DollarSign,
};

type ReactIcon = typeof Gauge;

const statusBadge: Record<AnalysisStatus, { variant: 'success' | 'error' | 'info' | 'warning'; pulse?: boolean }> = {
  completed: { variant: 'success' },
  failed: { variant: 'error' },
  running: { variant: 'info', pulse: true },
  queued: { variant: 'warning' },
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: ReactIcon;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Card hoverable>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-400 text-sm mb-2">{label}</div>
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-3xl font-bold text-white">{value}</div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { environments, fetchEnvironments, loading: envLoading } = useEnvironments();
  const { providers, fetchProviders } = useAIProviders();
  const { analyses, fetchAnalyses, loading: analysesLoading } = useAnalyses();

  useEffect(() => {
    fetchEnvironments();
    fetchProviders();
    fetchAnalyses({ limit: 5 });
  }, [fetchEnvironments, fetchProviders, fetchAnalyses]);

  const stats = useMemo(() => {
    const completed = analyses.filter(a => a.status === 'completed').length;
    const failed = analyses.filter(a => a.status === 'failed').length;
    return { completed, failed };
  }, [analyses]);

  const chartData = useMemo(() => {
    const counts: Record<AnalysisType, number> = {
      performance: 0,
      availability: 0,
      security: 0,
      cost: 0,
    };
    analyses.forEach(a => {
      if (a.analysis_type in counts) counts[a.analysis_type] += 1;
    });
    return (Object.keys(counts) as AnalysisType[]).map(type => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: counts[type],
    }));
  }, [analyses]);

  const barColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'];
  const needsSetup = !envLoading && (environments.length === 0 || providers.length === 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          Overview of your Dynatrace AI analyses
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Environments"
          value={environments.length}
          icon={Database}
          accent="bg-primary-500/15 text-primary-400"
          loading={envLoading}
        />
        <StatCard
          label="AI Providers"
          value={providers.length}
          icon={Bot}
          accent="bg-secondary/15 text-secondary"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          accent="bg-success/15 text-success"
          loading={analysesLoading}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          accent="bg-error/15 text-error"
          loading={analysesLoading}
        />
      </div>

      {needsSetup && (
        <Card className="border-warning/30 bg-warning/10">
          <div className="flex items-start gap-3">
            <Inbox className="text-warning shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-warning font-medium">Get started</p>
              <p className="text-slate-300 text-sm mt-1">
                Configure at least one Dynatrace environment and one AI provider to
                begin analyzing.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  to="/environments"
                  className="inline-flex items-center gap-1 text-sm bg-primary-500 hover:bg-primary-400 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Add environment <ArrowRight size={14} />
                </Link>
                <Link
                  to="/ai-providers"
                  className="inline-flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Add AI provider <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Analyses by type">
          {analysesLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : analyses.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <BarChart3Empty />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Recent analyses">
          {analysesLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center text-slate-500">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">No analyses yet.</p>
              <Link
                to="/analyses"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
              >
                Start your first analysis <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map(analysis => (
                <RecentRow key={analysis.id} analysis={analysis} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BarChart3Empty() {
  return (
    <div className="flex flex-col items-center">
      <Activity size={32} className="mb-2" />
      <p className="text-sm">No data to display yet.</p>
    </div>
  );
}

function RecentRow({ analysis }: { analysis: Analysis }) {
  const Icon = typeIcon[analysis.analysis_type] ?? Activity;
  const status = statusBadge[analysis.status] ?? { variant: 'warning' as const };
  return (
    <Link
      to={`/analyses/${analysis.id}`}
      className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg hover:bg-slate-700/60 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-slate-800 text-primary-400 shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-slate-100 capitalize truncate">
            {analysis.analysis_type} analysis
          </div>
          <div className="text-xs text-slate-400">
            #{analysis.id} • {new Date(analysis.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-2 shrink-0">
        {status.pulse && (
          <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
        )}
        <Badge variant={status.variant}>{analysis.status}</Badge>
      </span>
    </Link>
  );
}
