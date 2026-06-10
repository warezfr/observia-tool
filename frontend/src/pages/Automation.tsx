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
          <h1 className="text-3xl font-bold">Automation</h1>
          <p className="text-slate-400 mt-1">Manage schedules and workflows</p>
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
          <Card key={schedule.id} className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">{schedule.name}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="info">{schedule.type}</Badge>
                <Badge variant="default">{schedule.environment}</Badge>
                <span className="text-sm text-slate-400">{schedule.cron}</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">Next run: {schedule.nextRun}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleStatus(schedule.id)}
                className={`p-2 rounded transition-colors ${
                  schedule.status === 'active'
                    ? 'bg-success/20 text-success hover:bg-success/30'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {schedule.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={() => deleteSchedule(schedule.id)}
                className="p-2 rounded hover:bg-slate-700 transition-colors text-error"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && !showEditor && (
        <Card className="text-center py-8">
          <p className="text-slate-400">No schedules configured yet</p>
          <Button variant="primary" onClick={() => setShowEditor(true)} className="mt-4">
            Create your first schedule
          </Button>
        </Card>
      )}
    </div>
  );
}
