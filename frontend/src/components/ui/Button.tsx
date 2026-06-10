import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-500 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  danger: 'bg-error hover:bg-red-600 text-white',
  ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded font-medium transition-all ${variantClasses[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}
