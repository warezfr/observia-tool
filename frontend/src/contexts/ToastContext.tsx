import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { setToastHandler } from '../services/api';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const typeClasses: Record<ToastType, string> = {
  success: 'bg-surface border-success/30 text-success',
  error: 'bg-surface border-error/30 text-error',
  info: 'bg-surface border-info/30 text-info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  // Bridge axios interceptor errors into the toast queue.
  useEffect(() => {
    setToastHandler((message) => notify(message, 'error'));
    return () => setToastHandler(null);
  }, [notify]);

  const value: ToastContextValue = {
    notify,
    success: (m) => notify(m, 'success'),
    error: (m) => notify(m, 'error'),
    info: (m) => notify(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-pop transition-opacity ${
        typeClasses[toast.type]
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-sm">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
