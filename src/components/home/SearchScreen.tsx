"use client";

import { ArrowLeft, Bus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PlaceResult } from "@/lib/contracts/places";

/** 06 Search: typing should feel like talking to someone who knows Lagos (C02). */
export function SearchScreen() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => input.current?.focus(), []);
  // Results only count for the current query; short queries show the hint instead.
  const shown = q.trim().length >= 2 ? results : null;

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { results: PlaceResult[] };
        setResults(json.results);
      } catch {
        // Aborted by the next keystroke.
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*5)] flex-col gap-16 px-16 pb-24 pb-safe pt-16 pt-safe">
      <div className="flex items-center gap-8">
        <IconButton label="Back" icon={<ArrowLeft aria-hidden="true" />} className="bg-transparent shadow-none" onClick={() => router.back()} />
        <label className="flex h-[var(--size-button-l)] grow items-center gap-12 rounded-l bg-surface px-16 ring-2 ring-inset ring-line-focus shadow-[var(--focus-ring)]">
          <Search aria-hidden="true" className="size-[var(--size-icon-m)] text-fg-muted" />
          <span className="sr-only">Where are you going?</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a bus stop, office or landmark"
            enterKeyHint="search"
            autoComplete="off"
            className="h-full min-w-0 grow bg-transparent text-body text-fg outline-none placeholder:text-fg-muted focus-visible:outline-none"
          />
          {q ? (
            <button type="button" aria-label="Clear" onClick={() => setQ("")} className="-mr-8 flex size-[var(--size-touch-min)] items-center justify-center text-fg-muted">
              <X aria-hidden="true" className="size-[var(--size-icon-m)]" />
            </button>
          ) : null}
        </label>
      </div>

      <section aria-live="polite" className="flex flex-col">
        {loading && !shown ? (
          <div className="flex flex-col gap-12 py-8" aria-busy="true">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}

        {shown && shown.length === 0 ? (
          <Banner tone="info" title={`We couldn't find “${q.trim()}”.`}>
            Try a nearby landmark or bus stop, like Chevron Roundabout or Lekki Phase 1.
          </Banner>
        ) : null}

        {shown && shown.length ? (
          <>
            <h2 className="eyebrow pb-8">Korope stops</h2>
            <ul className="flex flex-col">
              {shown.map((r) => (
                <li key={r.stopId} className="border-b border-line-subtle last:border-0">
                  <Link href={`/stops/${r.code}`} className="flex min-h-[calc(var(--size-touch-min)+var(--space-8))] items-center gap-16 py-12">
                    <span className="flex size-40 shrink-0 items-center justify-center rounded-m bg-brand-subtle text-fg-brand">
                      <Bus aria-hidden="true" className="size-[var(--size-icon-m)]" />
                    </span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-body font-semibold text-fg">{r.name}</span>
                      <span className="truncate text-caption text-fg-muted">
                        Korope stop{r.landmark ? ` · ${r.landmark}` : ""}
                        {r.matched !== r.name ? ` · also called ${r.matched}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {!shown && !loading ? (
          <p className="py-8 text-caption text-fg-muted">
            Type at least two letters. Try a stop name or what people call it, like &ldquo;Phase 1&rdquo;, &ldquo;VGC&rdquo; or &ldquo;Toll gate&rdquo;.
          </p>
        ) : null}
      </section>
    </main>
  );
}
