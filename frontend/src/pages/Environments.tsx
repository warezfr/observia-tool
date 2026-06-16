import { useEffect, useState } from 'react';
import { Database, Plus, Trash2, Plug, X, CheckCircle2, XCircle } from 'lucide-react';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import type { EnvironmentCreate, EnvironmentType } from '../types';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent';

export default function Environments() {
  const { environments, loading, fetchEnvironments, createEnvironment, deleteEnvironment, testConnection } =
    useEnvironments();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<EnvironmentCreate>({ name: '', url: '', token: '', platform_token: '', env_type: 'saas' });
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createEnvironment(form);
      setShowForm(false);
      setForm({ name: '', url: '', token: '', platform_token: '', env_type: 'saas' });
    } catch {
      setError('Failed to create environment. Check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async (id: number) => {
    setTestResults(prev => ({ ...prev, [id]: { ok: true, msg: 'testing…' } }));
    try {
      const result = await testConnection(id);
      setTestResults(prev => ({
        ...prev,
        [id]: { ok: true, msg: `Connected${result.mode ? ` (${result.mode})` : ''}` },
      }));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setTestResults(prev => ({
        ...prev,
        [id]: { ok: false, msg: typeof detail === 'string' ? detail : 'Connection failed' },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Environments</h1>
          <p className="text-fg-muted text-sm mt-1">Connect your Dynatrace environments</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'Add Environment'}
        </Button>
      </div>

      {showForm && (
        <Card title="New environment">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            <input
              required
              placeholder="URL (e.g. https://abc.live.dynatrace.com)"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className={inputClass}
            />
            <input
              required
              type="password"
              placeholder="API Token"
              value={form.token}
              onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Platform Token (dt0s…) — required for MCP in container"
              value={form.platform_token ?? ''}
              onChange={e => setForm(f => ({ ...f, platform_token: e.target.value }))}
              className={inputClass}
            />
            <select value={form.env_type} onChange={e => setForm(f => ({ ...f, env_type: e.target.value as EnvironmentType }))} className={inputClass}>
              <option value="saas">SaaS</option>
              <option value="managed">Managed</option>
            </select>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={submitting}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!loading && environments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Database size={40} className="text-fg-muted" />}
            title="No environments configured"
            description="Add a Dynatrace environment to start running AI analyses."
            action={<Button onClick={() => setShowForm(true)}>Add Environment</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {environments.map(env => {
            const test = testResults[env.id];
            return (
              <Card key={env.id} bodyClassName="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Database size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-fg truncate">{env.name}</div>
                      <div className="text-sm text-fg-muted truncate">{env.url}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant={env.env_type === 'saas' ? 'info' : 'warning'}>{env.env_type}</Badge>
                        {test && (
                          <span className={`inline-flex items-center gap-1 text-xs ${test.ok ? 'text-success' : 'text-error'}`}>
                            {test.msg === 'testing…' ? null : test.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {test.msg}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleTest(env.id)}>
                      <Plug size={15} /> Test
                    </Button>
                    <button
                      onClick={() => deleteEnvironment(env.id)}
                      title="Delete environment"
                      className="p-2 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
