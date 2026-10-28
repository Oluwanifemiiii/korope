import { ArrowLeft, Footprints, Lightbulb, Navigation, Umbrella } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Skeleton } from "@/components/ui/Skeleton";
import { stopByCode, stopDepartures } from "@/lib/network";
import { formatTime, relativeDay } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/stops/[code]">): Promise<Metadata> {
  const stop = await stopByCode((await params).code);
  return { title: stop ? stop.name : "Stop not found" };
}

/** Boarding stop (08): where exactly to stand, and when the next buses come. */
export default function StopPage({ params }: PageProps<"/stops/[code]">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*5)] flex-col gap-24 px-24 pb-32 pb-safe pt-16 pt-safe">
      <Link href="/" aria-label="Back to the map" className="-ml-12 inline-flex size-[var(--size-touch-min)] items-center justify-center rounded-circle text-fg">
        <ArrowLeft aria-hidden="true" />
      </Link>
      <Suspense fallback={<StopSkeleton />}>
        <StopDetail params={params} />
      </Suspense>
    </main>
  );
}

async function StopDetail({ params }: { params: PageProps<"/stops/[code]">["params"] }) {
  const stop = await stopByCode((await params).code);
  if (!stop) notFound();
  const departures = await stopDepartures(stop.id, 6);
  const walkUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=walking`;

  return (
    <>
      <header className="flex flex-col gap-8">
        <p className="eyebrow">Korope stop</p>
        <h1 className="text-h2 text-fg">{stop.name}</h1>
        {stop.landmark ? <p className="text-body text-fg-muted">{stop.landmark}</p> : null}
        <div className="flex flex-wrap gap-8 pt-4">
          {/* Shape plus words, never colour alone */}
          <Badge tone={stop.is_lit ? "success" : "neutral"} icon={<Lightbulb aria-hidden="true" className="size-[var(--size-icon-s)]" />}>
            {stop.is_lit ? "Well-lit" : "Not lit at night"}
          </Badge>
          <Badge tone={stop.is_sheltered ? "success" : "neutral"} icon={<Umbrella aria-hidden="true" className="size-[var(--size-icon-s)]" />}>
            {stop.is_sheltered ? "Sheltered" : "No shelter"}
          </Badge>
        </div>
      </header>

      {stop.coords_source === "estimate" ? (
        <Banner tone="info" title="Pickup spot is approximate.">
          We&apos;re confirming the exact place on site. Use the landmark above when you get there.
        </Banner>
      ) : null}

      <a
        href={walkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[var(--size-button-l)] items-center justify-center gap-8 rounded-m text-body font-semibold text-[var(--action-secondary-text)] ring-2 ring-inset ring-[var(--action-secondary-border)]"
      >
        <Navigation aria-hidden="true" className="size-[var(--size-icon-m)]" />
        Walking directions
      </a>

      <section className="flex flex-col gap-8">
        <h2 className="text-title text-fg">Next buses from here</h2>
        {departures.length ? (
          <ul className="flex flex-col">
            {departures.map((d) => (
              <li key={d.departureId} className="flex min-h-[calc(var(--size-touch-min)+var(--space-8))] items-center gap-16 border-b border-line-subtle py-12 last:border-0">
                <span className="flex w-[calc(var(--space-64)+var(--space-8))] shrink-0 flex-col">
                  <span className={`text-subtitle font-semibold num ${d.status === "cancelled" ? "text-fg-muted line-through" : "text-fg"}`}>
                    {formatTime(d.at)}
                  </span>
                  {relativeDay(d.at) !== "Today" ? <span className="text-label text-fg-muted">{relativeDay(d.at)}</span> : null}
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-body text-fg">To {d.to}</span>
                  <span className="truncate text-caption text-fg-muted">{d.routeName}</span>
                </span>
                {d.status === "cancelled" ? (
                  <Badge tone="error">Cancelled</Badge>
                ) : d.service === "express" ? (
                  <Badge tone="info">Express</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-8 text-body text-fg-muted">
            <Footprints aria-hidden="true" className="size-[var(--size-icon-m)]" />
            No buses from here in the next day and a half. Korope runs weekday peaks for now.
          </p>
        )}
      </section>
    </>
  );
}

function StopSkeleton() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true">
      <Skeleton className="h-16 w-96" />
      <Skeleton className="h-40 w-[calc(var(--space-96)*2)]" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[var(--size-button-l)] w-full" />
    </div>
  );
}
