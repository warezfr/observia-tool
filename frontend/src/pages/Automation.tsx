import { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScheduleEditor from '../components/ScheduleEditor';
import { Plus, Trash2, Pause, Play } from 'lucide-react';

interface Schedule {
  id: number;
  name: string;
  type: string;
  environment: string;
  cron: string;
  status: 'active' | 'paused';
  nextRun: string;
}

const mockSchedules: Schedule[] = [
  {
    id: 1,
    name: 'Daily Security Check',
    type: 'security',
    environment: 'prod',
    cron: '0 9 * * *',
    status: 'active',
    nextRun: '2026-06-11 09:00',
  },
];

export default function Automation() {
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [showEditor, setShowEditor] = useState(false);

  const handleAddSchedule = (newSchedule: Omit<Schedule, 'id' | 'nextRun'>) => {
    const schedule: Schedule = {
      ...newSchedule,
      id: Math.max(...schedules.map(s => s.id)) + 1,
      nextRun: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
    };
    setSchedules([...schedules, schedule]);
    setShowEditor(false);
  };

  const toggleStatus = (id: number) => {
    setSchedules(
      schedules.map(s =>
        s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
      )
    );
  };

  const deleteSchedule = (id: number) => {
    setSchedules(schedules.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Automation</h1>
          <p className="text-fg-muted text-sm mt-1">Manage schedules and workflows</p>
        </div>
        <Button onClick={() => setShowEditor(!showEditor)} className="flex items-center gap-2">
          <Plus size={18} />
          New Schedule
        </Button>
      </div>

      {showEditor && (
        <ScheduleEditor onSave={handleAddSchedule} onCancel={() => setShowEditor(false)} />
      )}

      <div className="space-y-2">
        {schedules.map(schedule => (
          <Card key={schedule.id} bodyClassName="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-fg">{schedule.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="info">{schedule.type}</Badge>
                <Badge variant="default">{schedule.environment}</Badge>
                <span className="font-mono text-xs text-fg-muted">{schedule.cron}</span>
              </div>
              <p className="text-sm text-fg-muted mt-2">Next run: {schedule.nextRun}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => toggleStatus(schedule.id)}
                title={schedule.status === 'active' ? 'Pause' : 'Resume'}
                className={`p-2 rounded-lg transition-colors ${
                  schedule.status === 'active'
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-fg/5 text-fg-muted hover:bg-fg/10'
                }`}
              >
                {schedule.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
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
