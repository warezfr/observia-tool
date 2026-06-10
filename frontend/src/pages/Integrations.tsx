import { useState } from 'react';
import IntegrationCard from '../components/IntegrationCard';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'not_configured' | 'error';
}

const integrations: Integration[] = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Auto-create issues for critical recommendations',
    icon: '📋',
    status: 'not_configured',
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Trigger incidents from analysis alerts',
    icon: '🚨',
    status: 'not_configured',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: '💬',
    status: 'connected',
  },
  {
    id: 'webhooks',
    name: 'Custom Webhooks',
    description: 'Send data to custom endpoints',
    icon: '🔗',
    status: 'not_configured',
  },
  {
    id: 'dynatrace',
    name: 'Dynatrace Enhanced',
    description: 'Advanced metrics and custom queries',
    icon: '📊',
    status: 'connected',
  },
];

export default function Integrations() {
  const [integrationsState, setIntegrations] = useState(integrations);

  const handleConfigure = (id: string) => {
    console.log('Configure:', id);
    // TODO: Implement configuration modal
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(
      integrationsState.map(i =>
        i.id === id ? { ...i, status: 'not_configured' as const } : i
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-slate-400 mt-1">Connect with your favorite tools</p>
      </div>

      <div className="space-y-3">
        {integrationsState.map(integration => (
          <IntegrationCard
            key={integration.id}
            name={integration.name}
            description={integration.description}
            icon={integration.icon}
            status={integration.status}
            onConfigure={() => handleConfigure(integration.id)}
            onDisconnect={() => handleDisconnect(integration.id)}
          />
        ))}
      </div>
    </div>
  );
}
