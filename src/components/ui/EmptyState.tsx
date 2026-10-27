import type { ReactNode } from "react";

type Variant = "waiting" | "complete" | "broken";

/**
 * City line illustration from C06: a skyline with a route that is dashed (waiting),
 * complete to a golden stop, or broken.
 */
function CityLine({ variant, label }: { variant: Variant; label: string }) {
  const route =
    variant === "broken"
      ? "M40 86h44M116 66a14 14 0 0 1 14-14h68"
      : "M40 86h60a14 14 0 0 0 14-14v-6a14 14 0 0 1 14-14h70";
  return (
    <svg role="img" aria-label={label} viewBox="0 0 240 120" className="h-[calc(var(--space-96)+var(--space-24))] w-auto">
      <path
        d="M20 104V70h18v34M44 104V52h22v52M72 104V64h16v40M150 104V40h24v64M180 104V60h20v44M206 104V74h16v30"
        fill="none"
        style={{ stroke: "var(--border-strong)" }}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 104h216" style={{ stroke: "var(--border-default)" }} strokeWidth="2" strokeLinecap="round" />
      <path
        d={route}
        fill="none"
        style={{ stroke: "var(--action-primary)" }}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={variant === "waiting" ? "6 8" : undefined}
      />
      <circle cx="40" cy="86" r="6" style={{ fill: "var(--bg-surface)", stroke: "var(--action-primary)" }} strokeWidth="4" />
      <circle
        cx="198"
        cy="52"
        r="7"
        style={{ fill: variant === "broken" ? "var(--neutral-300)" : "var(--secondary-400)" }}
      />
    </svg>
  );
}

/** EmptyState (C06): illustration, headline, one sentence, one action, optional suggestions. */
export function EmptyState({
  variant = "waiting",
  illustrationLabel,
  title,
  body,
  action,
  children,
}: {
  variant?: Variant;
  illustrationLabel: string;
  title: string;
  body: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-16 px-24 py-32 text-center">
      <CityLine variant={variant} label={illustrationLabel} />
      <div className="flex flex-col gap-8">
        <h2 className="text-title text-fg">{title}</h2>
        <p className="text-body text-fg-muted">{body}</p>
      </div>
      {action}
      {children}
    </div>
  );
}
