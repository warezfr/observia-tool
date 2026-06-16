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
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import { useAnalyses } from '../contexts/AnalysesContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import ChartCard from '../components/Charts/ChartCard';
import { useChartColors } from '../components/Charts/chartTheme';
import { statusVariant } from '../lib/status';
import type { Analysis, AnalysisType } from '../types';

type ReactIcon = typeof Gauge;

const typeIcon: Record<AnalysisType, ReactIcon> = {
  performance: Gauge,
  availability: Activity,
  security: ShieldCheck,
  cost: DollarSign,
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
          <div className="text-fg-muted text-sm mb-2">{label}</div>
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-3xl font-semibold text-fg">{value}</div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${accent}`}>
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
  const colors = useChartColors();

  useEffect(() => {
    fetchEnvironments();
    fetchProviders();
    fetchAnalyses({ limit: 50 });
  }, [fetchEnvironments, fetchProviders, fetchAnalyses]);

  const stats = useMemo(() => {
    const completed = analyses.filter(a => a.status === 'completed').length;
    const failed = analyses.filter(a => a.status === 'failed').length;
    return { completed, failed };
  }, [analyses]);

  const typeData = useMemo(() => {
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

  const statusData = useMemo(() => {
    const completed = analyses.filter(a => a.status === 'completed').length;
    const failed = analyses.filter(a => a.status === 'failed').length;
    const running = analyses.filter(a => a.status === 'running' || a.status === 'queued').length;
    return [
      { name: 'Completed', value: completed, color: colors.status.completed },
      { name: 'Failed', value: failed, color: colors.status.failed },
      { name: 'In progress', value: running, color: colors.status.running },
    ].filter(d => d.value > 0);
  }, [analyses, colors]);

  const recent = useMemo(() => analyses.slice(0, 5), [analyses]);
  const needsSetup = !envLoading && (environments.length === 0 || providers.length === 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Dashboard</h1>
        <p className="text-fg-muted text-sm mt-1">Overview of your Dynatrace AI analyses</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Environments"
          value={environments.length}
          icon={Database}
          accent="bg-accent-soft text-accent"
          loading={envLoading}
        />
        <StatCard label="AI Providers" value={providers.length} icon={Bot} accent="bg-info/10 text-info" />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          accent="bg-success/10 text-success"
          loading={analysesLoading}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          accent="bg-error/10 text-error"
          loading={analysesLoading}
        />
      </div>

      {needsSetup && (
        <Card className="border-accent-ring bg-accent-soft">
          <div className="flex items-start gap-3">
            <Sparkles className="text-accent shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-fg font-medium">Get started</p>
              <p className="text-fg-secondary text-sm mt-1">
                Configure at least one Dynatrace environment and one AI provider to begin analyzing.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  to="/environments"
                  className="inline-flex items-center gap-1 text-sm bg-accent hover:bg-accent-hover text-accent-fg px-3 py-1.5 rounded-lg transition-colors"
                >
                  Add environment <ArrowRight size={14} />
                </Link>
                <Link
                  to="/ai-providers"
                  className="inline-flex items-center gap-1 text-sm bg-surface border border-border hover:bg-fg/5 text-fg px-3 py-1.5 rounded-lg transition-colors"
                >
                  Add AI provider <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Analyses by type"
          subtitle="Distribution across analysis types"
          className="lg:col-span-2"
          loading={analysesLoading}
          isEmpty={analyses.length === 0}
        >
          <BarChart data={typeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis dataKey="type" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={{ stroke: colors.grid }} />
            <YAxis stroke={colors.axis} fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: colors.grid, opacity: 0.3 }}
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: colors.tooltipText,
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {typeData.map((_, i) => (
                <Cell key={i} fill={colors.series[i % colors.series.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Status overview"
          subtitle="Recent analyses by status"
          loading={analysesLoading}
          isEmpty={statusData.length === 0}
        >
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {statusData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: colors.tooltipText,
              }}
            />
          </PieChart>
        </ChartCard>
      </div>

      <Card title="Recent analyses">
        {analysesLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="py-8 flex flex-col items-center text-center text-fg-muted">
            <Activity size={28} className="mb-2 opacity-60" />
            <p className="text-sm">No analyses yet.</p>
            <Link
              to="/analyses"
              className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
            >
              Start your first analysis <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(analysis => (
              <RecentRow key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RecentRow({ analysis }: { analysis: Analysis }) {
  const Icon = typeIcon[analysis.analysis_type] ?? Activity;
  const variant = statusVariant[analysis.status] ?? 'warning';
  const live = analysis.status === 'running' || analysis.status === 'queued';
  return (
    <Link
      to={`/analyses/${analysis.id}`}
      className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-fg/[0.03] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-fg capitalize truncate">
            {analysis.analysis_type} analysis
          </div>
          <div className="text-xs text-fg-muted">
            #{analysis.id} • {new Date(analysis.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      <Badge variant={variant} dot={live}>
        {analysis.status}
      </Badge>
    </Link>
  );
}
