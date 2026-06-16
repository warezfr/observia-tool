import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  hoverable?: boolean;
}

export default function Card({
  children,
  title,
  footer,
  className = '',
  bodyClassName = 'p-5',
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-soft animate-fadeIn ${
        hoverable
          ? 'transition-all duration-200 hover:-translate-y-px hover:shadow-card hover:border-accent-ring/40'
          : ''
      } ${className}`}
    >
      {title && (
        <div className="px-5 py-3.5 border-b border-border-subtle text-[13px] font-semibold text-fg tracking-tight">
          {title}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-border-subtle text-[13px] text-fg-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
