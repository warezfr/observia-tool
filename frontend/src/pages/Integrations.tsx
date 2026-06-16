import { useEffect, useState } from 'react';
import { Plus, Trash2, Webhook, MessageSquare } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { integrationsApi, type Integration, type IntegrationCreate } from '../services/automation-api';
import { useToast } from '../contexts/ToastContext';

const emptyForm: IntegrationCreate = { kind: 'slack', name: '', config: { url: '' }, enabled: true };

export default function Integrations() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<IntegrationCreate>(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = () => integrationsApi.list().then(setIntegrations).catch(() => {});

  useEffect(() => {
    reload();
  }, []);

  const handleSave = async () => {
    const url = (form.config.url as string) || '';
    if (!form.name || !url) {
      toast.error('Name and URL are required');
      return;
    }
    setSaving(true);
    try {
      await integrationsApi.create(form);
      toast.success('Integration added');
      setForm(emptyForm);
      setShowEditor(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await integrationsApi.delete(id);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Integrations</h1>
          <p className="text-fg-muted text-sm mt-1">
            Send analysis notifications to Slack or a custom webhook
          </p>
        </div>
        <Button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-2">
          <Plus size={18} /> Add Integration
        </Button>
      </div>

      {showEditor && (
        <Card title="New integration" bodyClassName="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as 'slack' | 'webhook' }))
              }
            >
              <option value="slack">Slack (incoming webhook)</option>
              <option value="webhook">Generic webhook</option>
            </select>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder="https://hooks.slack.com/... or your webhook URL"
            value={(form.config.url as string) || ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { url: e.target.value } }))}
          />
          <div className="flex gap-2">
            <Button variant="primary" loading={saving} onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {integrations.map((integ) => (
          <Card key={integ.id} bodyClassName="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {integ.kind === 'slack' ? (
                <MessageSquare className="text-accent shrink-0" size={20} />
              ) : (
                <Webhook className="text-accent shrink-0" size={20} />
              )}
              <div className="min-w-0">
                <p className="font-medium text-fg">{integ.name}</p>
                <p className="truncate text-xs text-fg-muted">{(integ.config?.url as string) || ''}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={integ.enabled ? 'success' : 'default'}>
                {integ.enabled ? 'enabled' : 'disabled'}
              </Badge>
              <button
                onClick={() => handleDelete(integ.id)}
                title="Delete"
                className="p-2 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {integrations.length === 0 && !showEditor && (
        <Card bodyClassName="p-8 text-center">
          <p className="text-fg-muted">No integrations configured yet</p>
          <Button variant="primary" onClick={() => setShowEditor(true)} className="mt-4">
            Add your first integration
          </Button>
        </Card>
      )}
    </div>
  );
}
