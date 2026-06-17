import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { analysesApi } from '../services/api';
import type { EnvironmentHealthCard } from '../types';
import { titleCase } from '../lib/status';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Skeleton from './ui/Skeleton';

const statusConfig: Record<
  EnvironmentHealthCard['status'],
  { label: string; variant: 'success' | 'warning' | 'error' | 'default' }
> = {
  healthy: { label: 'Healthy', variant: 'success' },
  warning: { label: 'Attention', variant: 'warning' },
  critical: { label: 'Critical', variant: 'error' },
  unknown: { label: 'No data', variant: 'default' },
};

export default function EnvironmentHealthPanel() {
  const [cards, setCards] = useState<EnvironmentHealthCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    analysesApi
      .healthOverview()
      .then((data) => {
        if (!cancelled) setCards(data.environments);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load environment health');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card title="Environment health">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-fg-muted">{error}</p>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center text-fg-muted">
          <Activity size={24} className="mb-2 opacity-60" />
          <p className="text-sm">No environments configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const cfg = statusConfig[card.status];
            const linkTarget = card.last_analysis_id
              ? `/analyses/${card.last_analysis_id}`
              : '/analyses';

            return (
              <Link
                key={card.environment_id}
                to={linkTarget}
                className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-accent-ring/50 hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg group-hover:text-accent">
                      {card.environment_name}
                    </p>
                    {card.last_analysis_type ? (
                      <p className="mt-0.5 text-xs text-fg-muted capitalize">
                        Last: {titleCase(card.last_analysis_type)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-fg-muted">No analyses yet</p>
                    )}
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
                  <span>
                    Completeness:{' '}
                    <span className="font-medium tabular-nums text-fg-secondary">
                      {card.completeness_pct != null ? `${card.completeness_pct}%` : '—'}
                    </span>
                  </span>
                  {card.last_analysis_at && (
                    <span className="tabular-nums">
                      {new Date(card.last_analysis_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
