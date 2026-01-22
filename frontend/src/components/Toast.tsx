import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onRetry?: () => void;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, onRetry?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string, onRetry?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message, onRetry }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg animate-in slide-in-from-bottom duration-300 ${getStyles(
              toast.type
            )}`}
          >
            <div className="shrink-0">{getIcon(toast.type)}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{toast.title}</p>
              {toast.message && <p className="mt-1 text-sm text-gray-600">{toast.message}</p>}
              {toast.onRetry && (
                <button
                  onClick={() => {
                    removeToast(toast.id);
                    toast.onRetry?.();
                  }}
                  className="mt-2 text-sm font-semibold text-red-700 hover:text-red-800 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
