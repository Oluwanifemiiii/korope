import Link from "next/link";
import { KoropeMark } from "@/components/brand/KoropeMark";

/** Custom 404 (design 21c). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*5)] flex-col p-24 pb-safe pt-safe">
      <KoropeMark size={32} title="Korope" />
      <div className="flex grow flex-col justify-center gap-20">
        <svg role="img" aria-label="A route line that stops short of its last stop" viewBox="0 0 300 120" className="h-auto w-full">
          <path d="M10 100H110a20 20 0 0 0 20-20V60" fill="none" style={{ stroke: "var(--route-line)" }} strokeWidth="5" strokeLinecap="round" />
          <path d="M130 40a20 20 0 0 1 20-20H290" fill="none" style={{ stroke: "var(--border-strong)" }} strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
          <circle cx="10" cy="100" r="8" style={{ fill: "var(--bg-surface)", stroke: "var(--action-primary)" }} strokeWidth="4" />
          <circle cx="290" cy="20" r="10" fill="none" style={{ stroke: "var(--border-strong)" }} strokeWidth="3" strokeDasharray="3 4" />
        </svg>
        <p className="eyebrow num">Error 404</p>
        <h1 className="text-h1 text-fg">This stop isn&apos;t on our map</h1>
        <p className="text-body text-fg-muted">
          The link may be old or cut short. Your trips, pass and wallet are all safe.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        <Link href="/" className="inline-flex h-[var(--size-button-l)] w-full items-center justify-center rounded-m bg-brand text-body font-semibold text-[var(--action-primary-text)]">
          Back to the map
        </Link>
        <Link href="/?search=1" className="inline-flex h-[var(--size-button-l)] w-full items-center justify-center rounded-m text-body font-semibold text-[var(--action-tertiary-text)]">
          Search for a stop
        </Link>
      </div>
    </main>
  );
}
