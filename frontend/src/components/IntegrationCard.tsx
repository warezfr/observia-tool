import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Settings, Trash2 } from 'lucide-react';

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
    <Card bodyClassName="p-4 flex items-start justify-between gap-4">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-fg/5 text-2xl">{icon}</div>
        <div>
          <h3 className="font-semibold text-fg">{name}</h3>
          <p className="text-sm text-fg-muted mt-1">{description}</p>
          <div className="mt-3">{statusBadges[status]}</div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={onConfigure}>
          <Settings size={15} />
          Configure
        </Button>
        {status === 'connected' && (
          <Button variant="danger" size="sm" onClick={onDisconnect}>
            <Trash2 size={15} />
          </Button>
        )}
      </div>
    </Card>
  );
}
