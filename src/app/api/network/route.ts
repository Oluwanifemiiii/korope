import { network } from "@/lib/network";

// Routes and stops change rarely; let the CDN and service worker reuse them.
export async function GET() {
  return Response.json(await network(), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
