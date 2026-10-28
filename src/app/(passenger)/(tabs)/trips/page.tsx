import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Trips" };

/** 16 Trips. Bookings arrive in M2; until then every account truly has no trips (16b). */
export default function TripsPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--size-nav))] max-w-[calc(var(--space-96)*5)] flex-col px-24 pt-24 pt-safe">
      <h1 className="text-h2 text-fg">Trips</h1>
      <div className="flex grow items-center">
        <EmptyState
          variant="waiting"
          illustrationLabel="City skyline with a dashed route waiting to be drawn"
          title="No trips yet"
          body="Book a seat on a scheduled bus from Lekki to the Island. Your trips, passes and receipts will live here."
          action={
            <Link href="/search" className="inline-flex h-[var(--size-button-l)] items-center justify-center rounded-m bg-brand px-24 text-body font-semibold text-[var(--action-primary-text)]">
              Plan a trip
            </Link>
          }
        >
          <div className="flex flex-col items-center gap-8 pt-8">
            <p className="eyebrow">Popular from Lekki</p>
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { href: "/stops/chevron", label: "Chevron to CMS" },
                { href: "/stops/abraham-adesanya", label: "Ajah to Marina" },
                { href: "/stops/lekki-phase-1", label: "Lekki Phase 1 to Falomo" },
              ].map((c) => (
                // eslint-disable-next-line korope/no-pill-buttons -- quick-pick chips (C02), not buttons
                <Link key={c.href} href={c.href} className="inline-flex h-40 items-center rounded-pill bg-surface px-16 text-caption font-medium text-fg ring-1 ring-inset ring-line">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </EmptyState>
      </div>
    </main>
  );
}
