import { Check, Circle } from 'lucide-react';
import type { AnalysisType } from '../types';
import type { MetricSignal } from '../utils/metricSignals';
import Card from './ui/Card';

interface ChecklistItem {
  id: string;
  label: string;
  check: (metricSignals: MetricSignal[], tools: string[]) => boolean;
}

const CHECKLISTS: Record<AnalysisType, ChecklistItem[]> = {
  performance: [
    {
      id: 'metrics',
      label: 'Query performance metrics',
      check: (_, tools) => tools.includes('query_metrics'),
    },
    {
      id: 'latency',
      label: 'Review latency hotspots',
      check: (signals) => signals.some((s) => /response\.time|latency/i.test(s.metric)),
    },
    {
      id: 'saturation',
      label: 'Check CPU / memory saturation',
      check: (signals) => signals.some((s) => /cpu|mem/i.test(s.metric)),
    },
    {
      id: 'problems',
      label: 'Enumerate active problems',
      check: (_, tools) => tools.includes('list_problems'),
    },
    {
      id: 'entities',
      label: 'Inventory services / hosts',
      check: (_, tools) => tools.includes('list_entities'),
    },
  ],
  availability: [
    {
      id: 'problems',
      label: 'List incidents and problems',
      check: (_, tools) => tools.includes('list_problems'),
    },
    {
      id: 'details',
      label: 'Inspect problem details',
      check: (_, tools) => tools.includes('get_problem_details'),
    },
    {
      id: 'errors',
      label: 'Query error rate metrics',
      check: (signals, tools) =>
        tools.includes('query_metrics') && signals.some((s) => /error/i.test(s.metric)),
    },
    {
      id: 'traffic',
      label: 'Review request volume context',
      check: (signals) => signals.some((s) => /request/i.test(s.metric)),
    },
  ],
  security: [
    {
      id: 'problems',
      label: 'Enumerate security problems',
      check: (_, tools) => tools.includes('list_problems'),
    },
    {
      id: 'entities',
      label: 'Map affected process groups',
      check: (_, tools) => tools.includes('list_entities'),
    },
    {
      id: 'metrics',
      label: 'Review exposure metrics',
      check: (_, tools) => tools.includes('query_metrics'),
    },
  ],
  cost: [
    {
      id: 'metrics',
      label: 'Query host utilization metrics',
      check: (_, tools) => tools.includes('query_metrics'),
    },
    {
      id: 'cpu',
      label: 'Identify idle CPU candidates',
      check: (signals) => signals.some((s) => /cpu/i.test(s.metric)),
    },
    {
      id: 'memory',
      label: 'Review memory utilization',
      check: (signals) => signals.some((s) => /mem/i.test(s.metric)),
    },
    {
      id: 'disk',
      label: 'Check disk usage',
      check: (signals) => signals.some((s) => /disk/i.test(s.metric)),
    },
  ],
  reliability: [
    {
      id: 'metrics',
      label: 'Query request / error counts',
      check: (_, tools) => tools.includes('query_metrics'),
    },
    {
      id: 'errors',
      label: 'Compute error budget inputs',
      check: (signals) => signals.some((s) => /error|request/i.test(s.metric)),
    },
    {
      id: 'latency',
      label: 'Review latency SLI (p95)',
      check: (signals) => signals.some((s) => /response\.time|latency/i.test(s.metric)),
    },
    {
      id: 'problems',
      label: 'Review incident timeline',
      check: (_, tools) => tools.includes('list_problems'),
    },
  ],
};

export default function InvestigationChecklist({
  analysisType,
  metricSignals,
  rawDataTools,
}: {
  analysisType: AnalysisType;
  metricSignals: MetricSignal[];
  rawDataTools: string[];
}) {
  const items = CHECKLISTS[analysisType] ?? [];
  if (items.length === 0) return null;

  const done = items.filter((item) => item.check(metricSignals, rawDataTools)).length;

  return (
    <Card title="Investigation checklist" bodyClassName="p-4">
      <p className="mb-3 text-xs text-fg-muted">
        {done} of {items.length} checks satisfied from gathered data
      </p>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = item.check(metricSignals, rawDataTools);
          return (
            <li
              key={item.id}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                checked
                  ? 'border-success/30 bg-success/[0.04] text-fg'
                  : 'border-border bg-surface text-fg-secondary'
              }`}
            >
              {checked ? (
                <Check className="shrink-0 text-success" size={16} strokeWidth={2.5} />
              ) : (
                <Circle className="shrink-0 text-fg-muted" size={16} />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
