/* Only the public app shell is cached. Notes/files live in IndexedDB. AI is never cached. */
importScripts("/offline-version.js");
const CACHE = "lume-shell-" + self.LUME_CACHE_VERSION;
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch("/");
    if (!response.ok) throw new Error("App shell unavailable");
    const html = await response.clone().text();
    await cache.put("/", response);
    const assets = [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m => m[1].replaceAll("&amp;", "&"));
    const offline = await fetch("/offline-assets.json").then(response => { if (!response.ok) throw new Error("Offline assets unavailable"); return response.json(); });
    const staticAssets = offline.filter(url => typeof url === "string" && url.startsWith("/_next/static/"));
    await cache.addAll([...new Set(["/manifest.webmanifest", "/lume-192.png", "/lume-512.png", ...assets, ...staticAssets])]);
    await self.skipWaiting();
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type !== "WARM_SHELL" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter(value => { try { const url = new URL(value); return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"); } catch { return false; } }).slice(0, 150);
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("lume-shell-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(fetch(request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put("/", copy))); } return response; }).catch(async () => (await caches.match("/")) || Response.error())); return;
  }
  if (url.pathname.startsWith("/_next/static/") || /^\/lume-.*\.png$/.test(url.pathname) || url.pathname === "/manifest.webmanifest" || url.pathname === "/pdf.worker.min.mjs") {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy))); } return response; })));
  }
});
