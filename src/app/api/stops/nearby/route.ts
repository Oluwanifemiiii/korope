import { nearbyQuery } from "@/lib/contracts/places";
import { nearbyStops } from "@/lib/network";

export async function GET(request: Request) {
  const parsed = nearbyQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "That location is outside Lagos." }, { status: 400 });
  const { lat, lng, radius } = parsed.data;
  return Response.json({ stops: await nearbyStops(lat, lng, radius) });
}
