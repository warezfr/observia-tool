type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/20 text-success border border-success/30',
  warning: 'bg-warning/20 text-warning border border-warning/30',
  error: 'bg-error/20 text-error border border-error/30',
  info: 'bg-secondary/20 text-secondary border border-secondary/30',
  default: 'bg-slate-700 text-slate-300 border border-slate-600',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
