import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { network } from "@/lib/network";

/** Network for the map, cached so it joins the static shell. Ops edits revalidate the tag. */
export async function cachedNetwork() {
  "use cache";
  cacheLife("hours");
  cacheTag("network");
  return network();
}
