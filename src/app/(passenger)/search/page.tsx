import type { Metadata } from "next";
import { SearchScreen } from "@/components/home/SearchScreen";

export const metadata: Metadata = { title: "Where are you going?" };

/** Search (06). Korope stops and local aliases; Google Places joins when a key is set. */
export default function SearchPage() {
  return <SearchScreen />;
}
