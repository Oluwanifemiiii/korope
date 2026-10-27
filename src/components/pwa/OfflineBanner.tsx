"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/** Offline banner (21a / C06 toast copy). Sits under the status bar, never blocks the screen. */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 flex justify-center px-16 pt-8 pt-safe"
    >
      <p className="flex min-h-touch w-full max-w-[calc(var(--space-96)*4)] items-center gap-12 rounded-m bg-neutral-900 px-16 text-caption font-medium text-neutral-0 shadow-3 dark:bg-[var(--text-primary)] dark:text-neutral-900">
        <WifiOff aria-hidden="true" className="size-[var(--size-icon-m)] shrink-0" />
        You&apos;re offline. Your pass still works.
      </p>
    </div>
  );
}
