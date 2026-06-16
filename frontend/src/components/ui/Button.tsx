import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-accent-fg shadow-soft',
  secondary: 'bg-surface border border-border text-fg hover:bg-fg/5',
  danger: 'bg-error hover:opacity-90 text-white shadow-soft',
  ghost: 'text-fg-secondary hover:text-fg hover:bg-fg/5',
  outline: 'border border-accent text-accent hover:bg-accent-soft',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  title,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app ${variantClasses[variant]} ${sizeClasses[size]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
