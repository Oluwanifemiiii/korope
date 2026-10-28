import "server-only";
import type { NearbyStop, Network, PlaceResult } from "@/lib/contracts/places";
import { asAnon } from "@/lib/db";

/** Stops near a point with the next boardable departure from each. Public data. */
export async function nearbyStops(lat: number, lng: number, radius = 1500): Promise<NearbyStop[]> {
  return asAnon(async (c) => {
    const { rows } = await c.query(
      `select n.*, s.code from public.nearby_stops($1, $2, $3, 5) n join public.stops s on s.id = n.stop_id`,
      [lat, lng, radius],
    );
    return rows.map((r) => ({
      stopId: r.stop_id,
      code: r.code,
      name: r.name,
      landmark: r.landmark,
      lat: r.lat,
      lng: r.lng,
      distanceM: r.distance_m,
      walkMin: r.walk_min,
      next: r.next_departure_id
        ? { departureId: r.next_departure_id, routeName: r.next_route_name, at: r.next_at.toISOString(), to: r.next_to }
        : null,
    }));
  });
}

/** Korope stops and local aliases (Google Places is merged in once a key is set). */
export async function searchPlaces(q: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  return asAnon(async (c) => {
    const { rows } = await c.query(
      `select p.*, s.code from public.search_places($1, $2, $3, 8) p join public.stops s on s.id = p.stop_id`,
      [q, lat ?? null, lng ?? null],
    );
    return rows.map((r) => ({
      stopId: r.stop_id,
      code: r.code,
      name: r.name,
      landmark: r.landmark,
      lat: r.lat,
      lng: r.lng,
      matched: r.matched,
      distanceM: r.distance_m,
    }));
  });
}

/** Active routes (as [lng, lat] paths) and stops, for drawing the map. */
export async function network(): Promise<Network> {
  return asAnon(async (c) => {
    const routes = await c.query(
      `select id, code, name, service, public.st_asgeojson(path::public.geometry)::json -> 'coordinates' as path
       from public.routes where active order by code`,
    );
    const stops = await c.query(
      `select id, code, name, public.st_y(location::public.geometry) as lat, public.st_x(location::public.geometry) as lng
       from public.stops where active order by name`,
    );
    return { routes: routes.rows, stops: stops.rows };
  });
}

/** One stop with its landmark and amenities (screen 08). */
export async function stopByCode(code: string) {
  return asAnon(async (c) => {
    const { rows } = await c.query(
      `select id, code, name, landmark, is_lit, is_sheltered, accessibility_note, coords_source,
              public.st_y(location::public.geometry) as lat, public.st_x(location::public.geometry) as lng
       from public.stops where code = $1 and active`,
      [code],
    );
    return (rows[0] as
      | { id: string; code: string; name: string; landmark: string | null; is_lit: boolean; is_sheltered: boolean;
          accessibility_note: string | null; coords_source: string; lat: number; lng: number }
      | undefined) ?? null;
  });
}

export type StopDeparture = {
  departureId: string;
  routeCode: string;
  routeName: string;
  service: "all_stops" | "express";
  at: string;
  to: string;
  status: "scheduled" | "boarding" | "in_progress" | "cancelled";
};

/** Next departures from a stop (public timetable, screen 08). */
export async function stopDepartures(stopId: string, limit = 6): Promise<StopDeparture[]> {
  return asAnon(async (c) => {
    const { rows } = await c.query("select * from public.stop_departures($1, $2)", [stopId, limit]);
    return rows.map((r) => ({
      departureId: r.departure_id,
      routeCode: r.route_code,
      routeName: r.route_name,
      service: r.service,
      at: r.at.toISOString(),
      to: r.to_name,
      status: r.status,
    }));
  });
}
