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
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card hover:border-accent-ring'
          : ''
      } ${className}`}
    >
      {title && (
        <div className="px-5 py-3.5 border-b border-border text-sm font-semibold text-fg">
          {title}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-border text-sm text-fg-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
