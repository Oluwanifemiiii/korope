import { CircleAlert, CircleCheck, Info, TriangleAlert, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BannerTone = "info" | "success" | "warning" | "error" | "offline";

const tones: Record<BannerTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "bg-[var(--info-bg)] text-[var(--info-text)] ring-[var(--info-border)]", icon: "text-[var(--info-icon)]", Icon: Info },
  success: { box: "bg-[var(--success-bg)] text-[var(--success-text)] ring-[var(--success-border)]", icon: "text-[var(--success-icon)]", Icon: CircleCheck },
  warning: { box: "bg-[var(--warning-bg)] text-[var(--warning-text)] ring-[var(--warning-border)]", icon: "text-[var(--warning-icon)]", Icon: TriangleAlert },
  error: { box: "bg-[var(--error-bg)] text-[var(--error-text)] ring-[var(--error-border)]", icon: "text-[var(--error-icon)]", Icon: CircleAlert },
  offline: { box: "bg-sunken text-fg ring-line", icon: "text-fg-muted", Icon: WifiOff },
};

/**
 * Banner (C06, 21b): says what happened, whether money moved, and what's next.
 * Errors and warnings are announced to screen readers.
 */
export function Banner({
  tone,
  title,
  children,
  action,
  icon,
  className,
}: {
  tone: BannerTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  const urgent = tone === "error" || tone === "warning";
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn("flex items-start gap-12 rounded-m px-16 py-12 text-caption ring-1 ring-inset", t.box, className)}
    >
      <span className={cn("mt-2 shrink-0", t.icon)} aria-hidden="true">
        {icon ?? <t.Icon className="size-[var(--size-icon-m)]" />}
      </span>
      <div className="flex min-w-0 grow flex-col gap-4">
        <p>
          <strong className="font-semibold">{title}</strong>
          {children ? <> {children}</> : null}
        </p>
        {action ? <div className="-ml-12">{action}</div> : null}
      </div>
    </div>
  );
}
