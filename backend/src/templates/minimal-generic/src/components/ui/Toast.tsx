import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast, type Toast, type ToastVariant } from '@/hooks/useToast';

const icons: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const styles: Record<ToastVariant, string> = {
  info: 'bg-white border-gray-200 text-gray-900',
  success: 'bg-white border-green-200 text-green-900',
  warning: 'bg-white border-amber-200 text-amber-900',
  error: 'bg-white border-red-200 text-red-900',
};

const iconStyles: Record<ToastVariant, string> = {
  info: 'text-gray-500',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = icons[toast.variant ?? 'info'];
  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg transition-all',
        styles[toast.variant ?? 'info']
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconStyles[toast.variant ?? 'info'])} />
      <div className="flex-1">
        {toast.title && <p className="font-medium">{toast.title}</p>}
        <p className={cn('text-sm', toast.title && 'mt-0.5')}>{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
