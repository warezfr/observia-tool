import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Friendly inline SVG illustration used by empty states. */
function DefaultIllustration() {
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden>
      <rect
        x="6"
        y="14"
        width="84"
        height="50"
        rx="8"
        className="fill-fg/[0.03] stroke-border"
        strokeWidth="2"
      />
      <rect x="16" y="26" width="34" height="6" rx="3" className="fill-border" />
      <rect x="16" y="38" width="52" height="6" rx="3" className="fill-border" />
      <rect x="16" y="50" width="24" height="6" rx="3" className="fill-border" />
      <circle cx="72" cy="20" r="12" className="fill-accent-soft stroke-accent" strokeWidth="2" />
      <path
        d="M68 20l3 3 6-6"
        className="stroke-accent"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="mb-4">{icon ?? <DefaultIllustration />}</div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-fg-muted">
      <Loader2 size={18} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
