import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Plus, Trash2, Pause, Play } from 'lucide-react';
import { schedulesApi, type Schedule, type ScheduleCreate } from '../services/automation-api';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import { useToast } from '../contexts/ToastContext';
import type { AnalysisType } from '../types';

const TYPE_OPTIONS: AnalysisType[] = ['performance', 'availability', 'security', 'cost', 'reliability'];

const emptyForm: ScheduleCreate = {
  name: '',
  environment_id: 0,
  ai_provider_id: 0,
  analysis_type: 'performance',
  time_range_hours: 24,
  cron: '0 9 * * *',
  enabled: true,
};

export default function Automation() {
  const { environments, fetchEnvironments } = useEnvironments();
  const { providers, fetchProviders } = useAIProviders();
  const toast = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<ScheduleCreate>(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = () => schedulesApi.list().then(setSchedules).catch(() => {});

  useEffect(() => {
    reload();
    fetchEnvironments().catch(() => {});
    fetchProviders().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.environment_id || !form.ai_provider_id) {
      toast.error('Name, environment and provider are required');
      return;
    }
    setSaving(true);
    try {
      await schedulesApi.create(form);
      toast.success('Schedule created');
      setForm(emptyForm);
      setShowEditor(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: Schedule) => {
    await schedulesApi.update(s.id, { enabled: !s.enabled });
    reload();
  };

  const deleteSchedule = async (id: number) => {
    await schedulesApi.delete(id);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Automation</h1>
          <p className="text-fg-muted text-sm mt-1">Recurring scheduled analyses (cron)</p>
        </div>
        <Button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-2">
          <Plus size={18} /> New Schedule
        </Button>
      </div>

      {showEditor && (
        <Card title="New schedule" bodyClassName="p-4 space-y-3">
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Schedule name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.environment_id}
              onChange={(e) => setForm((f) => ({ ...f, environment_id: Number(e.target.value) }))}
            >
              <option value={0}>Select environment…</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.ai_provider_id}
              onChange={(e) => setForm((f) => ({ ...f, ai_provider_id: Number(e.target.value) }))}
            >
              <option value={0}>Select AI provider…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.analysis_type}
              onChange={(e) => setForm((f) => ({ ...f, analysis_type: e.target.value as AnalysisType }))}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
              placeholder="cron e.g. 0 9 * * *"
              value={form.cron}
              onChange={(e) => setForm((f) => ({ ...f, cron: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" loading={saving} onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {schedules.map((schedule) => (
          <Card key={schedule.id} bodyClassName="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-fg">{schedule.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="info">{schedule.analysis_type}</Badge>
                <Badge variant={schedule.enabled ? 'success' : 'default'}>
                  {schedule.enabled ? 'active' : 'paused'}
                </Badge>
                <span className="font-mono text-xs text-fg-muted">{schedule.cron}</span>
              </div>
              <p className="text-sm text-fg-muted mt-2">
                Last run: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'never'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => toggleStatus(schedule)}
                title={schedule.enabled ? 'Pause' : 'Resume'}
                className={`p-2 rounded-lg transition-colors ${
                  schedule.enabled
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-fg/5 text-fg-muted hover:bg-fg/10'
                }`}
              >
                {schedule.enabled ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={() => deleteSchedule(schedule.id)}
                title="Delete"
                className="p-2 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && !showEditor && (
        <Card bodyClassName="p-8 text-center">
          <p className="text-fg-muted">No schedules configured yet</p>
          <Button variant="primary" onClick={() => setShowEditor(true)} className="mt-4">
            Create your first schedule
          </Button>
        </Card>
      )}
    </div>
  );
}
