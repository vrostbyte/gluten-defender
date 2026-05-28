/*
 * Gluten Defender — Service Worker
 *
 * A service worker is a small script the browser runs in the background. It lets
 * our app be installable and keep working when the network is flaky (a key goal:
 * people use this in store aisles on weak signal).
 *
 * Strategy (kept deliberately simple and safe):
 *   - Precache a tiny "app shell" when the worker installs.
 *   - For page navigations: try the network first, fall back to the cache, and
 *     finally fall back to the cached home page if the user is fully offline.
 *   - For other GET requests (icons, etc.): serve from cache if we have it,
 *     otherwise fetch and cache it for next time.
 *
 * Bump CACHE_VERSION whenever you change what should be cached; the old cache is
 * deleted on activation so users are not stuck with stale files.
 */

const CACHE_VERSION = "gd-shell-v1";

// The minimal set of URLs we want available offline right away.
const APP_SHELL = [
  "/",
  "/scan",
  "/log",
  "/explore",
  "/profile",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];

// Install: open our cache and store the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  // Activate this new worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

// Activate: delete any caches from older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: decide how to answer each request.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests; never cache POST/PUT/etc.
  if (request.method !== "GET") return;

  // Page navigations → network first (so users get fresh content when online),
  // with cache + home page as offline fallbacks.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    );
    return;
  }

  // Same-origin asset requests → cache first, then network (and cache the result).
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
