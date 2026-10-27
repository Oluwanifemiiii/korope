import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { ToastProvider } from "@/components/ui/Toast";

// Variable Onest; latin-ext carries the naira sign (U+20A6).
const onest = Onest({
  subsets: ["latin", "latin-ext"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Korope", template: "%s · Korope" },
  description:
    "Book a seat on scheduled shared minibuses from Lekki to Victoria Island and Lagos Island. Pay from your wallet, track the bus, board with a QR pass.",
  applicationName: "Korope",
  appleWebApp: { capable: true, title: "Korope", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#131619" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={onest.variable} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint so dark mode never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <PwaProvider>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
