"use client";

import { ChevronDown, ChevronUp, Footprints, LocateFixed, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { MapStage, type LatLng } from "@/components/map/MapStage";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NearbyStop, Network } from "@/lib/contracts/places";
import { cn } from "@/lib/cn";
import { formatTime, greeting } from "@/lib/time";

type LocState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "denied" }
  | { kind: "outside" }
  | { kind: "error" }
  | { kind: "ready"; me: LatLng; stops: NearbyStop[] };

const LOC_KEY = "korope-location-ok";

export function HomeScreen({ network, firstName, signedIn }: { network: Network; firstName: string | null; signedIn: boolean }) {
  const [loc, setLoc] = useState<LocState>({ kind: "idle" });
  const [expanded, setExpanded] = useState(false);
  // Greeting uses the viewer's clock (Lagos time); the cached server shell renders none.
  const g = useSyncExternalStore(noopSubscribe, greeting, () => null);
  const hello = g ? (firstName ? `${g}, ${firstName}` : `${g}.`) : null;
  // Asked before (S04)? Then fetch the position on load without asking again.
  const consented = useSyncExternalStore(noopSubscribe, readConsent, () => false);

  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const me = { lat: coords.latitude, lng: coords.longitude };
        try {
          localStorage.setItem(LOC_KEY, "1");
        } catch {}
        const res = await fetch(`/api/stops/nearby?lat=${me.lat}&lng=${me.lng}`);
        if (res.status === 400) return setLoc({ kind: "outside" });
        if (!res.ok) return setLoc({ kind: "error" });
        const { stops } = (await res.json()) as { stops: NearbyStop[] };
        setLoc({ kind: "ready", me, stops });
      },
      (err) => setLoc({ kind: err.code === err.PERMISSION_DENIED ? "denied" : "error" }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return setLoc({ kind: "error" });
    setLoc({ kind: "locating" });
    requestPosition();
  }, [requestPosition]);

  useEffect(() => {
    if (consented && "geolocation" in navigator) requestPosition();
  }, [consented, requestPosition]);

  const showLocating = loc.kind === "locating" || (loc.kind === "idle" && consented);

  const nearest = loc.kind === "ready" ? loc.stops[0] : undefined;
  const others = loc.kind === "ready" ? loc.stops.slice(1).filter((s) => s.next) : [];
  const highlight = nearest ? [nearest.stopId] : [];
  const focus = loc.kind === "ready" ? [loc.me, ...loc.stops.slice(0, 3).map((s) => ({ lat: s.lat, lng: s.lng }))] : undefined;

  return (
    <main className="relative h-[calc(100dvh-var(--size-nav)-env(safe-area-inset-bottom))] overflow-hidden">
      <MapStage
        routes={network.routes}
        stops={network.stops}
        me={loc.kind === "ready" ? loc.me : null}
        highlight={highlight}
        focus={focus}
        bottomInsetPx={expanded ? 420 : 200}
      />

      {/* Floating header and search (Layer three: floating controls) */}
      <div className="absolute inset-x-0 top-0 flex flex-col gap-12 px-16 pt-16 pt-safe">
        <div className="flex items-start justify-between gap-12">
          <div className="glass rounded-l px-16 py-12 shadow-1">
            <p className="text-subtitle font-semibold text-fg" aria-live="polite">
              {hello ?? " "}
            </p>
            <p className="text-caption text-fg-muted">{signedIn ? "Where are you headed?" : "Sign in to book a seat."}</p>
          </div>
          <IconButton glass label="Show my location" icon={<LocateFixed aria-hidden="true" />} onClick={locate} />
        </div>
        <Link
          href="/search"
          className="glass flex h-[var(--size-button-l)] items-center gap-12 rounded-l px-16 text-body text-fg-muted shadow-3"
        >
          <Search aria-hidden="true" className="size-[var(--size-icon-l)] text-fg" />
          <span className="truncate">Where are you going today?</span>
        </Link>
      </div>

      {/* Panel: peek shows the nearest stop, expanded adds other stops leaving soon (05a, 05b) */}
      <section
        aria-label="Near you"
        className="absolute inset-x-0 bottom-0 mx-auto max-w-[calc(var(--space-96)*5)] rounded-t-xl bg-surface shadow-3"
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex min-h-touch w-full flex-col items-center pt-8"
        >
          <span aria-hidden="true" className="h-4 w-40 rounded-pill bg-[var(--border-strong)]" />
          <span className="sr-only">{expanded ? "Show less" : "Show more stops"}</span>
        </button>

        <div className="flex flex-col gap-16 px-24 pb-24">
          {loc.kind === "idle" && !consented ? (
            <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-4">
                <h2 className="text-title text-fg">Find buses near you</h2>
                <p className="text-body text-fg-muted">
                  We use your location to show the nearest Korope stops, the buses heading to them and how long the walk is.
                </p>
              </div>
              <Button block onClick={locate} icon={<MapPin aria-hidden="true" className="size-[var(--size-icon-m)]" />}>
                Allow location
              </Button>
              <Link href="/search" className="flex min-h-touch items-center justify-center text-body font-semibold text-[var(--text-link)]">
                Maybe later, I&apos;ll search by stop name
              </Link>
            </div>
          ) : null}

          {showLocating ? (
            <div className="flex flex-col gap-12" aria-busy="true">
              <Skeleton className="h-16 w-[calc(var(--space-96)+var(--space-32))]" />
              <Skeleton className="h-24 w-[calc(var(--space-96)*2)]" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}

          {loc.kind === "denied" ? (
            <Banner tone="info" title="Location is off." action={<SearchLink />}>
              Search by stop name instead, or turn location on for this site in your browser settings.
            </Banner>
          ) : null}
          {loc.kind === "outside" ? (
            <Banner tone="info" title="You seem to be outside our routes." action={<SearchLink />}>
              Korope runs between Lekki, Victoria Island and Lagos Island. Search for a stop to plan ahead.
            </Banner>
          ) : null}
          {loc.kind === "error" ? (
            <Banner tone="warning" title="We couldn't find your location." action={<SearchLink />}>
              Try again in a moment, or search by stop name.
            </Banner>
          ) : null}

          {loc.kind === "ready" && !nearest ? (
            <Banner tone="info" title="No Korope stop within 1.5 km." action={<SearchLink />}>
              Search for a stop on our routes to see when the next bus leaves.
            </Banner>
          ) : null}

          {nearest ? (
            <Link href={`/stops/${nearest.code}`} className="flex flex-col gap-4 rounded-l">
              <p className="flex items-center gap-8 text-caption text-fg-muted">
                <Footprints aria-hidden="true" className="size-[var(--size-icon-s)]" />
                Nearest stop · <span className="num">{nearest.walkMin}</span> min walk
              </p>
              <p className="text-title text-fg">{nearest.name}</p>
              <p className="text-caption text-fg-muted">
                {nearest.next ? (
                  <>
                    Next: <span className="font-semibold text-fg num">{formatTime(nearest.next.at)}</span> to {nearest.next.to}
                  </>
                ) : (
                  "No more buses from here today."
                )}
              </p>
            </Link>
          ) : null}

          {expanded && others.length ? (
            <div className="flex flex-col">
              <h3 className="eyebrow pb-8">Leaving soon near you</h3>
              <ul className="flex flex-col">
                {others.map((s) => (
                  <li key={s.stopId} className="border-b border-line-subtle last:border-0">
                    <Link href={`/stops/${s.code}`} className="flex min-h-[calc(var(--size-touch-min)+var(--space-8))] items-center gap-16 py-12">
                      <span className="text-subtitle font-semibold text-fg num">{s.next ? formatTime(s.next.at) : ""}</span>
                      <span className="flex min-w-0 grow flex-col">
                        <span className="truncate text-body text-fg">
                          {s.name} to {s.next?.to}
                        </span>
                        <span className="text-caption text-fg-muted">
                          <span className="num">{s.walkMin}</span> min walk
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {loc.kind === "ready" && others.length ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className={cn("flex min-h-touch items-center justify-center gap-8 text-caption font-semibold text-[var(--text-link)]")}
            >
              {expanded ? <ChevronDown aria-hidden="true" className="size-[var(--size-icon-s)]" /> : <ChevronUp aria-hidden="true" className="size-[var(--size-icon-s)]" />}
              {expanded ? "Show less" : `${others.length} more stops nearby`}
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function noopSubscribe() {
  return () => {};
}

function readConsent() {
  try {
    return localStorage.getItem(LOC_KEY) === "1";
  } catch {
    return false;
  }
}

function SearchLink() {
  return (
    <Link href="/search" className="inline-flex min-h-touch items-center px-12 font-semibold text-[var(--text-link)]">
      Search for a stop
    </Link>
  );
}
