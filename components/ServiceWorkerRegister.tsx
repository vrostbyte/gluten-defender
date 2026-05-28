"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) once the page has loaded.
 *
 * We only register in PRODUCTION. During `npm run dev` a service worker would
 * aggressively cache files and make code changes appear "stuck", which is
 * confusing. To test the installable/offline behavior locally, run a production
 * build: `npm run build && npm start`.
 *
 * This component renders nothing — it only runs the registration side effect.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.error("Service worker registration failed:", error));
    };

    // Wait for the page to finish loading so registration never competes with
    // the first render.
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
