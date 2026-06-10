import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({ children, className = '', hoverable = false }: CardProps) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg p-4 ${
        hoverable ? 'hover:shadow-lg hover:border-slate-600 transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
