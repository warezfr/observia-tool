import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({
  children,
  title,
  footer,
  className = '',
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-xl animate-fadeIn ${
        hoverable
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-slate-600'
          : ''
      } ${className}`}
    >
      {title && (
        <div className="px-5 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200">
          {title}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-700 text-sm text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
}
