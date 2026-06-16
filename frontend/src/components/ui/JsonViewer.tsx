import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface JsonViewerProps {
  data: unknown;
  /** Depth at/under which nodes start collapsed. Defaults to 1. */
  collapsedDepth?: number;
  className?: string;
}

type Json = unknown;

function typeOf(value: Json): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function Primitive({ value }: { value: Json }) {
  const t = typeOf(value);
  const cls =
    t === 'string'
      ? 'text-success'
      : t === 'number'
        ? 'text-info'
        : t === 'boolean'
          ? 'text-accent'
          : 'text-fg-muted';
  const text = t === 'string' ? `"${String(value)}"` : String(value);
  return <span className={`font-mono text-xs ${cls} break-all`}>{text}</span>;
}

function Node({
  name,
  value,
  depth,
  collapsedDepth,
  isLast,
}: {
  name?: string;
  value: Json;
  depth: number;
  collapsedDepth: number;
  isLast: boolean;
}) {
  const t = typeOf(value);
  const isContainer = t === 'array' || t === 'object';
  const [open, setOpen] = useState(depth < collapsedDepth);

  if (!isContainer) {
    return (
      <div className="flex items-start gap-1.5 py-0.5 pl-[18px]">
        {name !== undefined && (
          <span className="font-mono text-xs text-fg-secondary">{name}:</span>
        )}
        <Primitive value={value} />
        {!isLast && <span className="text-fg-muted">,</span>}
      </div>
    );
  }

  const entries: [string, Json][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, Json>);
  const open_b = Array.isArray(value) ? '[' : '{';
  const close_b = Array.isArray(value) ? ']' : '}';
  const count = entries.length;

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="group flex items-center gap-1 text-left hover:bg-fg/5 rounded w-full px-0.5"
      >
        <ChevronRight
          size={13}
          className={`shrink-0 text-fg-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {name !== undefined && (
          <span className="font-mono text-xs text-fg-secondary">{name}:</span>
        )}
        <span className="font-mono text-xs text-fg-muted">
          {open ? open_b : `${open_b} … ${close_b}`}
        </span>
        {!open && (
          <span className="font-mono text-[11px] text-fg-muted/70">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
      </button>
      {open && (
        <div className="border-l border-border ml-[6px] pl-3">
          {entries.map(([k, v], i) => (
            <Node
              key={k}
              name={Array.isArray(value) ? undefined : k}
              value={v}
              depth={depth + 1}
              collapsedDepth={collapsedDepth}
              isLast={i === entries.length - 1}
            />
          ))}
          <div className="font-mono text-xs text-fg-muted pl-[18px]">
            {close_b}
            {!isLast && ','}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JsonViewer({
  data,
  collapsedDepth = 1,
  className = '',
}: JsonViewerProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-fg/[0.02] p-3 overflow-x-auto ${className}`}
    >
      <Node value={data} depth={0} collapsedDepth={collapsedDepth} isLast />
    </div>
  );
}
