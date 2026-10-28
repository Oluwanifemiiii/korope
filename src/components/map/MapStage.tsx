"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NetworkRoute, NetworkStop } from "@/lib/contracts/places";
import { cn } from "@/lib/cn";
import { isNightInLagos } from "@/lib/time";

export type LatLng = { lat: number; lng: number };

type Props = {
  routes: NetworkRoute[];
  stops: NetworkStop[];
  me?: LatLng | null;
  /** Stops to emphasise and label (boarding stop, destination, nearest stop). */
  highlight?: string[];
  /** Points the camera should fit. Defaults to every stop. */
  focus?: LatLng[];
  className?: string;
  /** Shift the visual centre up when a sheet covers the bottom of the map. */
  bottomInsetPx?: number;
};

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

/**
 * MapStage (H02). Google Maps (vector, Map ID, Advanced Markers) loads after first paint
 * when a browser key is configured; otherwise a schematic of the real network is drawn
 * so screens stay usable. Overlay colours always come from the CSS tokens.
 */
export function MapStage(props: Props) {
  const [ready, setReady] = useState(false);
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[var(--bg-sunken)]", props.className)}>
      {!ready ? <div aria-hidden="true" className="skeleton absolute inset-0 rounded-none" /> : null}
      {KEY ? <GoogleMap {...props} onReady={() => setReady(true)} /> : <SchematicMap {...props} onReady={() => setReady(true)} />}
    </div>
  );
}

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function GoogleMap({ routes, stops, me, highlight = [], focus, bottomInsetPx = 0, onReady }: Props & { onReady: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const start = async () => {
      const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
      setOptions({ key: KEY, v: "weekly", region: "NG", language: "en" });
      const [{ Map, Polyline }, { AdvancedMarkerElement }] = await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
      ]);
      if (cancelled || !ref.current) return;

      const night = document.documentElement.dataset.theme === "dark" || isNightInLagos();
      const mapId = (night ? process.env.NEXT_PUBLIC_MAP_ID_NIGHT : process.env.NEXT_PUBLIC_MAP_ID_LIGHT) || "DEMO_MAP_ID";
      const map = new Map(ref.current, {
        mapId,
        center: { lat: 6.44, lng: 3.47 },
        zoom: 12,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: "greedy",
      });

      for (const r of routes) {
        const path = r.path.map(([lng, lat]) => ({ lat, lng }));
        const casing = new Polyline({ map, path, strokeColor: token("--route-casing"), strokeWeight: 10, zIndex: 1 });
        const line = new Polyline({ map, path, strokeColor: token("--route-line"), strokeWeight: 6, zIndex: 2 });
        cleanups.push(() => (casing.setMap(null), line.setMap(null)));
      }

      for (const s of stops) {
        const el = document.createElement("div");
        const big = highlight.includes(s.id);
        Object.assign(el.style, {
          width: big ? "18px" : "14px",
          height: big ? "18px" : "14px",
          borderRadius: "50%",
          background: "var(--stop-marker)",
          boxShadow: `inset 0 0 0 3px var(${big ? "--action-primary" : "--stop-marker-border"})`,
        });
        el.setAttribute("aria-label", s.name);
        const m = new AdvancedMarkerElement({ map, position: { lat: s.lat, lng: s.lng }, content: el, title: s.name });
        cleanups.push(() => (m.map = null));
      }

      if (me) {
        const el = document.createElement("div");
        Object.assign(el.style, {
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "var(--user-location)",
          boxShadow: "0 0 0 3px var(--bg-surface), 0 0 0 14px var(--user-location-halo)",
        });
        const m = new AdvancedMarkerElement({ map, position: me, content: el, title: "You are here", zIndex: 10 });
        cleanups.push(() => (m.map = null));
      }

      const pts = focus?.length ? focus : stops.map((s) => ({ lat: s.lat, lng: s.lng }));
      if (pts.length) {
        const bounds = new google.maps.LatLngBounds();
        pts.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: 96, left: 32, right: 32, bottom: 32 + bottomInsetPx });
      }
      google.maps.event.addListenerOnce(map, "tilesloaded", onReady);
    };

    // Load after first paint so the shell renders immediately (performance budget).
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    idle(() => void start().catch(() => onReady()));
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, [routes, stops, me, highlight, focus, bottomInsetPx, onReady]);

  return <div ref={ref} className="absolute inset-0" role="region" aria-label="Map" />;
}

/** Equirectangular projection of the real coordinates into an SVG box. */
function SchematicMap({ routes, stops, me, highlight = [], focus, bottomInsetPx = 0, onReady }: Props & { onReady: () => void }) {
  useEffect(onReady, [onReady]);

  const view = useMemo(() => {
    const pts = (focus?.length ? focus : stops.map((s) => ({ lat: s.lat, lng: s.lng }))).concat(me ? [me] : []);
    if (!pts.length) return null;
    const k = Math.cos((6.44 * Math.PI) / 180);
    const xs = pts.map((p) => p.lng * k);
    const ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = Math.max(maxX - minX, maxY - minY, 0.01) * 0.15;
    const h = maxY - minY + pad * 2;
    return {
      k,
      box: `${minX - pad} ${minY - pad - h * 0.25} ${maxX - minX + pad * 2} ${h * (1.25 + bottomInsetPx / 600)}`,
      unit: Math.max(maxX - minX, maxY - minY, 0.01) / 100,
    };
  }, [stops, me, focus, bottomInsetPx]);

  if (!view) return null;
  const P = (lat: number, lng: number) => `${lng * view.k},${-lat}`;
  const u = view.unit;

  return (
    <>
      <svg role="img" aria-label="Map of Korope routes and stops" viewBox={view.box} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <rect x="-1000" y="-1000" width="3000" height="3000" style={{ fill: "var(--bg-canvas)" }} />
        {routes.map((r) => (
          <g key={r.id}>
            <polyline points={r.path.map(([lng, lat]) => P(lat, lng)).join(" ")} fill="none" style={{ stroke: "var(--route-casing)" }} strokeWidth={u * 2.2} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={r.path.map(([lng, lat]) => P(lat, lng)).join(" ")} fill="none" style={{ stroke: "var(--route-line)" }} strokeWidth={u * 1.3} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {stops.map((s) => {
          const big = highlight.includes(s.id);
          const [x, y] = P(s.lat, s.lng).split(",").map(Number);
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={u * (big ? 1.8 : 1.3)} style={{ fill: "var(--stop-marker)", stroke: big ? "var(--action-primary)" : "var(--stop-marker-border)" }} strokeWidth={u * 0.6} />
              {big ? (
                <text x={x + u * 2.6} y={y + u * 1.1} style={{ fill: "var(--text-primary)", fontSize: u * 3.2, fontWeight: 600 }}>
                  {s.name}
                </text>
              ) : null}
            </g>
          );
        })}
        {me ? (
          <g>
            <circle cx={me.lng * view.k} cy={-me.lat} r={u * 4} style={{ fill: "var(--user-location-halo)" }} />
            <circle cx={me.lng * view.k} cy={-me.lat} r={u * 1.6} style={{ fill: "var(--user-location)", stroke: "var(--bg-surface)" }} strokeWidth={u * 0.6} />
          </g>
        ) : null}
      </svg>
      <span className="absolute bottom-8 left-8 rounded-s bg-surface px-8 py-2 text-label font-semibold text-fg-muted shadow-1">Schematic map</span>
    </>
  );
}
