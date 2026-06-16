import { useState } from 'react';
import {
  Brain,
  ChevronRight,
  Terminal,
  Wrench,
  CircleDot,
} from 'lucide-react';
import JsonViewer from './ui/JsonViewer';

export interface ReasoningStep {
  type: string;
  content: string;
  tool?: string;
}

const META: Record<
  string,
  { label: string; icon: typeof Brain; accent: string; dot: string }
> = {
  thinking: {
    label: 'Thinking',
    icon: Brain,
    accent: 'text-accent bg-accent-soft',
    dot: 'bg-accent',
  },
  tool_call: {
    label: 'Tool call',
    icon: Wrench,
    accent: 'text-info bg-info/10',
    dot: 'bg-info',
  },
  tool_result: {
    label: 'Tool result',
    icon: Terminal,
    accent: 'text-success bg-success/10',
    dot: 'bg-success',
  },
};

function tryParseJson(text: string): unknown | null {
  const trimmed = text?.trim?.() ?? '';
  if (!trimmed) return null;
  if (!/^[[{]/.test(trimmed)) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function StepRow({ step, index, last }: { step: ReasoningStep; index: number; last: boolean }) {
  const meta =
    META[step.type] ?? {
      label: step.type || 'step',
      icon: CircleDot,
      accent: 'text-fg-secondary bg-fg/5',
      dot: 'bg-fg-muted',
    };
  const Icon = meta.icon;
  const parsed = tryParseJson(step.content);
  const [open, setOpen] = useState(index < 2);

  return (
    <li className="relative pl-10">
      {!last && (
        <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
      )}
      <span
        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ${meta.accent}`}
      >
        <Icon size={15} />
      </span>
      <div className="rounded-lg border border-border bg-surface">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <ChevronRight
            size={14}
            className={`shrink-0 text-fg-muted transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-sm font-medium text-fg">{meta.label}</span>
          {step.tool && (
            <span className="rounded-md bg-fg/5 px-2 py-0.5 font-mono text-xs text-fg-secondary">
              {step.tool}
            </span>
          )}
          <span className="ml-auto text-xs text-fg-muted">#{index + 1}</span>
        </button>
        {open && (
          <div className="border-t border-border px-3 py-2.5 animate-slideDown">
            {parsed !== null ? (
              <JsonViewer data={parsed} collapsedDepth={2} />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-fg-secondary">
                {step.content || <span className="text-fg-muted italic">No content.</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function ReasoningTimeline({ steps }: { steps: ReasoningStep[] }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <StepRow key={i} step={step} index={i} last={i === steps.length - 1} />
      ))}
    </ol>
  );
}
