import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const typeClasses = {
  success: 'bg-surface border-success/30 text-success',
  error: 'bg-surface border-error/30 text-error',
  info: 'bg-surface border-info/30 text-info',
};

export function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-pop transition-opacity ${
        typeClasses[toast.type]
      } ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-sm">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
}
