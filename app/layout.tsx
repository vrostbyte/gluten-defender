import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Page metadata (the <head> of every page).
 *
 * Notes:
 * - Next.js auto-adds <link rel="manifest"> because we have app/manifest.ts.
 * - `appleWebApp` + the `other` tag below give iOS Safari the hints it needs so
 *   "Add to Home Screen" launches us full-screen with the right title/icon.
 */
export const metadata: Metadata = {
  applicationName: "Gluten Defender",
  title: {
    default: "Gluten Defender",
    template: "%s · Gluten Defender",
  },
  description:
    "Your trustworthy companion for living gluten-free with celiac disease. " +
    "Decision support — always verify the physical packaging.",
  appleWebApp: {
    capable: true,
    title: "Gluten Defender",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Legacy iOS tag (older Safari uses this name; Next emits the modern
  // "mobile-web-app-capable" via appleWebApp, so we add this one explicitly).
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  formatDetection: { telephone: false },
};

/**
 * Viewport settings (must be a separate export in this version of Next.js).
 * `viewportFit: "cover"` lets the layout extend into the iPhone notch / home-bar
 * area so our safe-area padding can position things correctly.
 */
export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-dvh flex-col bg-white text-gray-900 antialiased">
        {/* Main content area. The extra bottom padding keeps content clear of the
            fixed bottom tab bar. */}
        <main className="flex flex-1 flex-col pb-24">{children}</main>

        {/* Persistent bottom navigation, shown on every page. */}
        <BottomNav />

        {/* Registers the PWA service worker (production only). Renders nothing. */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
