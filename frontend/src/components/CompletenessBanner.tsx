import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AnalysisCompleteness } from '../types';
import Card from './ui/Card';

function completenessPct(completeness: AnalysisCompleteness): number {
  const required = completeness.required?.length ?? 0;
  const satisfied = completeness.satisfied?.length ?? 0;
  if (completeness.complete) return 100;
  if (required === 0) return completeness.complete ? 100 : 0;
  return Math.round((satisfied / required) * 100);
}

export default function CompletenessBanner({
  completeness,
}: {
  completeness: AnalysisCompleteness | undefined | null;
}) {
  if (!completeness) return null;

  const pct = completenessPct(completeness);
  const isComplete = completeness.complete;

  return (
    <Card
      className={isComplete ? 'border-success/30 bg-success/[0.04]' : 'border-warning/30 bg-warning/[0.04]'}
      bodyClassName="p-4"
    >
      <div className="flex items-start gap-3">
        {isComplete ? (
          <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={18} />
        ) : (
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-fg">
              {isComplete ? 'Data completeness' : 'Partial data coverage'}
            </p>
            <span className="text-xs font-semibold tabular-nums text-fg-muted">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? 'bg-success' : 'bg-warning'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!isComplete && completeness.missing.length > 0 && (
            <p className="mt-2 text-xs text-fg-secondary">
              Missing signals:{' '}
              <span className="font-mono text-fg-muted">{completeness.missing.join(', ')}</span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
