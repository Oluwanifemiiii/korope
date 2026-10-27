import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "brand" | "highlight" | "neutral" | "success" | "warning" | "error" | "info";

const tones: Record<Tone, string> = {
  brand: "bg-brand-subtle text-fg-brand",
  highlight: "bg-highlight text-[var(--text-on-highlight)]",
  neutral: "bg-sunken text-fg-muted",
  success: "bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-inset ring-[var(--success-border)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-inset ring-[var(--warning-border)]",
  error: "bg-[var(--error-bg)] text-[var(--error-text)] ring-1 ring-inset ring-[var(--error-border)]",
  info: "bg-[var(--info-bg)] text-[var(--info-text)] ring-1 ring-inset ring-[var(--info-border)]",
};

/** Badge: 24 px, Radius/Pill, label type. Always pair tone with words, never colour alone. */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-24 items-center gap-4 whitespace-nowrap rounded-pill px-8 text-label font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
