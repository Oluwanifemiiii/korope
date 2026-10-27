import { cn } from "@/lib/cn";

/**
 * Route Pair mark (B02): hollow boarding stop, one rounded step of route, golden
 * alighting stop. 48-unit grid, stroke 4; small sizes thicken the stroke.
 */
export function KoropeMark({
  size = 32,
  tone = "brand",
  className,
  title,
}: {
  size?: 16 | 24 | 32 | 40 | 48 | 64;
  /** brand on light surfaces, inverse on emerald, mono for single-colour use. */
  tone?: "brand" | "inverse" | "mono";
  className?: string;
  title?: string;
}) {
  const stroke = size <= 16 ? 6 : size <= 24 ? 5 : size <= 32 ? 4.5 : 4;
  const stopR = size <= 16 ? 7 : size <= 24 ? 6.5 : 6;
  const dotR = size <= 16 ? 9 : size <= 24 ? 8 : size <= 32 ? 7.5 : 7;
  const line =
    tone === "inverse" ? "var(--neutral-0)" : tone === "mono" ? "currentColor" : "var(--text-brand)";
  const dot =
    tone === "mono" ? "currentColor" : size <= 32 && tone === "brand" ? "var(--secondary-500)" : "var(--secondary-400)";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <circle cx="13" cy="32" r={stopR} fill="none" style={{ stroke: line }} strokeWidth={stroke} />
      <path
        d="M19 32h3a6 6 0 0 0 6-6v-4a6 6 0 0 1 6-6"
        fill="none"
        style={{ stroke: line }}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <circle cx="35" cy="16" r={dotR} style={{ fill: dot }} />
    </svg>
  );
}

/** Mark plus the lowercase wordmark. */
export function KoropeLockup({ className, tone = "brand" }: { className?: string; tone?: "brand" | "inverse" }) {
  return (
    <span className={cn("inline-flex items-center gap-12", className)}>
      <KoropeMark size={40} tone={tone} />
      <span
        className={cn(
          "wordmark text-h2",
          tone === "inverse" ? "text-neutral-0" : "text-fg",
        )}
      >
        korope
      </span>
    </span>
  );
}
