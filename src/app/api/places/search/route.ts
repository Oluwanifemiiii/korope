import { searchQuery } from "@/lib/contracts/places";
import { searchPlaces } from "@/lib/network";

export async function GET(request: Request) {
  const parsed = searchQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ results: [] });
  const { q, lat, lng } = parsed.data;
  return Response.json({ results: await searchPlaces(q, lat, lng) });
}
