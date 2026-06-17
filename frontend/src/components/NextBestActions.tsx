import { Code2 } from 'lucide-react';
import type { Recommendation } from '../types';
import { severityVariant } from '../lib/status';
import Badge from './ui/Badge';
import Card from './ui/Card';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function severityRank(severity: string): number {
  const idx = SEVERITY_ORDER.indexOf(severity.toLowerCase() as typeof SEVERITY_ORDER[number]);
  return idx === -1 ? SEVERITY_ORDER.length : idx;
}

export default function NextBestActions({ recommendations }: { recommendations: Recommendation[] }) {
  const top = [...recommendations]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 3);

  if (top.length === 0) return null;

  return (
    <Card title="Next best actions" bodyClassName="p-4">
      <div className="space-y-3">
        {top.map((rec) => (
          <div
            key={rec.id}
            className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent-ring/40"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-fg">{rec.title}</p>
              <Badge variant={severityVariant[rec.severity] ?? 'default'}>{rec.severity}</Badge>
            </div>
            {rec.impact && (
              <p className="mt-1.5 text-xs text-fg-muted">{rec.impact}</p>
            )}
            {rec.action && (
              <p className="mt-2 text-sm text-fg-secondary line-clamp-2">{rec.action}</p>
            )}
            {rec.script && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                <Code2 size={13} />
                Script available
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
