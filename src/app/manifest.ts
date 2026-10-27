import type { MetadataRoute } from "next";

/** Passenger PWA manifest. The driver app has its own at /driver/manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Korope",
    short_name: "Korope",
    description: "Book a seat on scheduled minibuses from Lekki to the Island.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Manifest colours cannot read CSS variables; these are Neutral/50 and Primary/600.
    background_color: "#F6F9F7",
    theme_color: "#046940",
    lang: "en-NG",
    categories: ["travel", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
