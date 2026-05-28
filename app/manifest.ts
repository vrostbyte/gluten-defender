import type { MetadataRoute } from "next";

/**
 * Web App Manifest.
 *
 * Next.js turns this file into "/manifest.webmanifest" automatically and also
 * injects the <link rel="manifest"> tag into every page. This is what makes the
 * app installable ("Add to Home Screen") and gives it a name, colors, and icons
 * when launched from the home screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gluten Defender",
    short_name: "Gluten Defender",
    description:
      "Your trustworthy companion for living gluten-free with celiac disease.",
    // "standalone" hides the browser chrome so it feels like a native app.
    display: "standalone",
    start_url: "/",
    scope: "/",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    orientation: "portrait",
    icons: [
      // Scalable icon (modern browsers prefer this).
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      // Standard PNG icons.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // "maskable" lets Android crop the icon into its adaptive shape cleanly.
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
