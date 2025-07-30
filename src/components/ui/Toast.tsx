import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastVariants = {
  default: {
    container:
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    icon: '📝',
    iconColor: 'text-gray-500',
  },
  success: {
    container:
      'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
    icon: '✅',
    iconColor: 'text-green-500',
  },
  error: {
    container:
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
    icon: '❌',
    iconColor: 'text-red-500',
  },
  warning: {
    container:
      'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800',
    icon: '⚠️',
    iconColor: 'text-yellow-500',
  },
  info: {
    container:
      'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
    icon: 'ℹ️',
    iconColor: 'text-blue-500',
  },
};

const ToastComponent: React.FC<{
  toast: Toast;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const variant = toastVariants[toast.variant || 'default'];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  React.useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleClose]);

  return (
    <div
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg p-4 shadow-lg transition-all',
        variant.container,
        isExiting
          ? 'animate-out fade-out-80 slide-out-to-right-full'
          : 'animate-in fade-in-0 slide-in-from-right-full'
      )}
    >
      <div className="flex items-start space-x-3">
        <span
          className="text-lg flex-shrink-0"
          role="img"
          aria-label={toast.variant}
        >
          {variant.icon}
        </span>
        <div className="flex-1 space-y-1">
          {toast.title && (
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {toast.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={handleClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse space-y-reverse space-y-4 p-4 sm:top-4 sm:right-4 sm:max-w-sm">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, removeAllToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Helper hook for common toast operations
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: 'info' }),
    default: (title: string, description?: string) =>
      addToast({ title, description, variant: 'default' }),
  };
};
