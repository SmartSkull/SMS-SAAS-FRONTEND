'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ToastCtx { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; }
const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {}, info: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++counter;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ success: (m) => add(m, 'success'), error: (m) => add(m, 'error'), info: (m) => add(m, 'info') }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium min-w-64 animate-in slide-in-from-right',
            t.type === 'success' && 'bg-blue-600',
            t.type === 'error' && 'bg-red-500',
            t.type === 'info' && 'bg-blue-500',
          )}>
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)}><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
