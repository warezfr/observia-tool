import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Settings, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'not_configured' | 'error';
  onConfigure: () => void;
  onDisconnect: () => void;
}

export default function IntegrationCard({
  name,
  description,
  icon,
  status,
  onConfigure,
  onDisconnect,
}: IntegrationCardProps) {
  const statusBadges = {
    connected: <Badge variant="success">Connected</Badge>,
    not_configured: <Badge variant="default">Not configured</Badge>,
    error: <Badge variant="error">Error</Badge>,
  };

  return (
    <Card className="flex items-start justify-between">
      <div className="flex gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
          <div className="mt-3">{statusBadges[status]}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onConfigure} className="flex items-center gap-2">
          <Settings size={16} />
          Configure
        </Button>
        {status === 'connected' && (
          <Button variant="danger" onClick={onDisconnect}>
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </Card>
  );
}
