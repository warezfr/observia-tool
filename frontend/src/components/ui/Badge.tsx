import type { ReactNode } from 'react';

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent'
  | 'default'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
  error: 'bg-error/10 text-error ring-1 ring-inset ring-error/20',
  info: 'bg-info/10 text-info ring-1 ring-inset ring-info/20',
  accent: 'bg-accent-soft text-accent ring-1 ring-inset ring-accent-ring/50',
  default: 'bg-fg/[0.04] text-fg-secondary ring-1 ring-inset ring-border',
  critical: 'bg-severity-critical/10 text-severity-critical ring-1 ring-inset ring-severity-critical/20',
  high: 'bg-severity-high/10 text-severity-high ring-1 ring-inset ring-severity-high/20',
  medium: 'bg-severity-medium/10 text-severity-medium ring-1 ring-inset ring-severity-medium/20',
  low: 'bg-severity-low/10 text-severity-low ring-1 ring-inset ring-severity-low/20',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  accent: 'bg-accent',
  default: 'bg-fg-muted',
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
};

export default function Badge({
  children,
  variant = 'default',
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] font-semibold uppercase tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]} ${variant === 'info' || variant === 'accent' ? 'animate-pulse' : ''}`}
        />
      )}
      {children}
    </span>
  );
}
