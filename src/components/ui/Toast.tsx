"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastInput = { message: string; icon?: ReactNode; action?: { label: string; onClick: () => void } };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const DURATION_MS = 4000; // C06: 4 s

/** Toast (C06): one at a time, bottom, above the primary CTA. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: ToastInput) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--size-button-l)+var(--space-32)+env(safe-area-inset-bottom))] z-50 flex justify-center px-16"
      >
        {toast ? (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex min-h-[calc(var(--size-touch-min)+var(--space-4))] w-full max-w-[calc(var(--space-96)*4)] items-center gap-12 rounded-m px-16 py-12",
              "bg-neutral-900 text-caption font-medium text-neutral-0 shadow-3 animate-toast-in",
              "dark:bg-[var(--text-primary)] dark:text-neutral-900",
            )}
          >
            {toast.icon ? <span aria-hidden="true">{toast.icon}</span> : null}
            <span className="grow">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="min-h-touch shrink-0 rounded-m px-12 font-semibold text-[var(--primary-300)] dark:text-fg-brand"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}
