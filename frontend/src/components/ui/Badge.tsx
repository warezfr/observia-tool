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
  success: 'bg-success/12 text-success ring-1 ring-inset ring-success/25',
  warning: 'bg-warning/12 text-warning ring-1 ring-inset ring-warning/25',
  error: 'bg-error/12 text-error ring-1 ring-inset ring-error/25',
  info: 'bg-info/12 text-info ring-1 ring-inset ring-info/25',
  accent: 'bg-accent-soft text-accent ring-1 ring-inset ring-accent-ring',
  default: 'bg-fg/5 text-fg-secondary ring-1 ring-inset ring-border',
  critical: 'bg-severity-critical/12 text-severity-critical ring-1 ring-inset ring-severity-critical/25',
  high: 'bg-severity-high/12 text-severity-high ring-1 ring-inset ring-severity-high/25',
  medium: 'bg-severity-medium/12 text-severity-medium ring-1 ring-inset ring-severity-medium/25',
  low: 'bg-severity-low/12 text-severity-low ring-1 ring-inset ring-severity-low/25',
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
}
