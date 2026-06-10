import { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface Schedule {
  id: number;
  name: string;
  type: string;
  environment: string;
  cron: string;
  status: 'active' | 'paused';
  nextRun: string;
}

interface ScheduleEditorProps {
  onSave: (schedule: Omit<Schedule, 'id' | 'nextRun'>) => void;
  onCancel: () => void;
}

export default function ScheduleEditor({ onSave, onCancel }: ScheduleEditorProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('performance');
  const [environment, setEnvironment] = useState('');
  const [cron, setCron] = useState('0 9 * * *');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  const handleSave = () => {
    if (!name || !environment) return;
    onSave({ name, type, environment, cron, status });
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Create Schedule</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Daily Security Check"
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Analysis Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="performance">Performance</option>
              <option value="security">Security</option>
              <option value="availability">Availability</option>
              <option value="cost">Cost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="">Select environment</option>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Cron Expression</label>
          <input
            value={cron}
            onChange={e => setCron(e.target.value)}
            placeholder="0 9 * * *"
            className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-500 font-mono text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">Every day at 9:00 AM</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="primary" onClick={handleSave}>
            Create Schedule
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
