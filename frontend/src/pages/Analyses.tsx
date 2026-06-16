import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import { useAnalyses } from '../contexts/AnalysesContext';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable, { type Column, type FilterDef } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { statusVariant, titleCase } from '../lib/status';
import type { Analysis, AnalysisCreate, AnalysisType, AnalysisStatus } from '../types';

const STATUS_OPTIONS: AnalysisStatus[] = ['queued', 'running', 'completed', 'failed'];
const TYPE_OPTIONS: AnalysisType[] = ['performance', 'availability', 'security', 'cost', 'reliability'];

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent';

export default function Analyses() {
  const { analyses, loading, fetchAnalyses, createAnalysis, deleteAnalysis } = useAnalyses();
  const { environments, fetchEnvironments } = useEnvironments();
  const { providers, fetchProviders } = useAIProviders();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AnalysisCreate>({
    environment_id: 0,
    ai_provider_id: 0,
    analysis_type: 'performance',
    time_range_hours: 24,
    parameters: {},
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyses({ limit: 200 });
  }, [fetchAnalyses]);

  useEffect(() => {
    fetchEnvironments();
    fetchProviders();
  }, [fetchEnvironments, fetchProviders]);

  const envName = (id: number) => environments.find(e => e.id === id)?.name ?? `Env ${id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.environment_id || !form.ai_provider_id) {
      setError('Please select an environment and AI provider.');
      return;
    }
    setSubmitting(true);
    try {
      await createAnalysis(form);
      await fetchAnalyses({ limit: 200 });
      setShowForm(false);
      setForm({ environment_id: 0, ai_provider_id: 0, analysis_type: 'performance', time_range_hours: 24, parameters: {} });
    } catch {
      setError('Failed to create analysis.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Analysis>[] = useMemo(
    () => [
      {
        key: 'analysis_type',
        header: 'Type',
        sortable: true,
        accessor: a => a.analysis_type,
        render: a => <span className="font-medium text-fg capitalize">{a.analysis_type}</span>,
      },
      {
        key: 'environment',
        header: 'Environment',
        sortable: true,
        accessor: a => envName(a.environment_id),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        accessor: a => a.status,
        render: a => (
          <Badge
            variant={statusVariant[a.status] ?? 'warning'}
            dot={a.status === 'running' || a.status === 'queued'}
          >
            {a.status}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        sortable: true,
        accessor: a => a.created_at,
        render: a => (
          <span className="text-fg-muted">{new Date(a.created_at).toLocaleString()}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        headerClassName: 'w-12',
        render: a => (
          <button
            onClick={e => {
              e.stopPropagation();
              deleteAnalysis(a.id);
            }}
            title="Delete analysis"
            className="p-1.5 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [environments]
  );

  const filters: FilterDef<Analysis>[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'All statuses',
        options: STATUS_OPTIONS.map(s => ({ value: s, label: titleCase(s) })),
        predicate: (a, v) => a.status === v,
      },
      {
        key: 'type',
        label: 'All types',
        options: TYPE_OPTIONS.map(t => ({ value: t, label: titleCase(t) })),
        predicate: (a, v) => a.analysis_type === v,
      },
      {
        key: 'env',
        label: 'All environments',
        options: environments.map(e => ({ value: String(e.id), label: e.name })),
        predicate: (a, v) => String(a.environment_id) === v,
      },
    ],
    [environments]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Analyses</h1>
          <p className="text-fg-muted text-sm mt-1">Run and review Dynatrace AI analyses</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'New Analysis'}
        </Button>
      </div>

      {showForm && (
        <Card title="New analysis">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-muted mb-1">Environment</label>
              <select
                required
                value={form.environment_id}
                onChange={e => setForm(f => ({ ...f, environment_id: Number(e.target.value) }))}
                className={inputClass}
              >
                <option value={0}>Select environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">AI provider</label>
              <select
                required
                value={form.ai_provider_id}
                onChange={e => setForm(f => ({ ...f, ai_provider_id: Number(e.target.value) }))}
                className={inputClass}
              >
                <option value={0}>Select AI provider</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.provider_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Analysis type</label>
              <select
                value={form.analysis_type}
                onChange={e => setForm(f => ({ ...f, analysis_type: e.target.value as AnalysisType }))}
                className={inputClass}
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Time range (hours)</label>
              <input
                type="number"
                min={1}
                value={form.time_range_hours}
                onChange={e => setForm(f => ({ ...f, time_range_hours: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            {error && <p className="text-error text-sm sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={submitting}>
                Start analysis
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        data={analyses}
        columns={columns}
        filters={filters}
        rowKey={a => a.id}
        searchPlaceholder="Search analyses…"
        onRowClick={a => navigate(`/analyses/${a.id}`)}
        initialSort={{ key: 'created_at', dir: 'desc' }}
        emptyState={
          loading ? (
            <span className="text-sm text-fg-muted">Loading…</span>
          ) : (
            <EmptyState
              title="No analyses found"
              description="Create a new analysis to start generating AI-powered insights."
              action={<Button onClick={() => setShowForm(true)}>New Analysis</Button>}
            />
          )
        }
      />
    </div>
  );
}
