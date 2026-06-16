import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Skeleton from '../ui/Skeleton';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  isEmpty?: boolean;
  emptyHint?: string;
  action?: ReactNode;
  className?: string;
  /** A single recharts element (e.g. <BarChart>…</BarChart>). */
  children: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  height = 280,
  loading = false,
  isEmpty = false,
  emptyHint = 'No data to display yet.',
  action,
  className = '',
  children,
}: ChartCardProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-soft p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {subtitle && <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <div style={{ height }}>
          <Skeleton className="w-full h-full" />
        </div>
      ) : isEmpty ? (
        <div
          className="flex flex-col items-center justify-center text-fg-muted"
          style={{ height }}
        >
          <BarChart3 size={30} className="mb-2 opacity-60" />
          <p className="text-sm">{emptyHint}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}
