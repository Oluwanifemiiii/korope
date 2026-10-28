import { z } from "zod";

/** Lagos bounding box with some margin; points outside are rejected. */
const lat = z.coerce.number().min(6.2).max(6.8);
const lng = z.coerce.number().min(2.7).max(4.4);

export const nearbyQuery = z.object({
  lat,
  lng,
  radius: z.coerce.number().int().min(100).max(5000).default(1500),
});

export const searchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  lat: lat.optional(),
  lng: lng.optional(),
});

export type NearbyStop = {
  stopId: string;
  code: string;
  name: string;
  landmark: string | null;
  lat: number;
  lng: number;
  distanceM: number;
  walkMin: number;
  next: { departureId: string; routeName: string; at: string; to: string } | null;
};

export type PlaceResult = {
  stopId: string;
  code: string;
  name: string;
  landmark: string | null;
  lat: number;
  lng: number;
  matched: string;
  distanceM: number | null;
};

export type NetworkRoute = { id: string; code: string; name: string; service: "all_stops" | "express"; path: [number, number][] };
export type NetworkStop = { id: string; code: string; name: string; lat: number; lng: number };
export type Network = { routes: NetworkRoute[]; stops: NetworkStop[] };
