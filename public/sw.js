// Darvoo service worker: keeps the app usable on a bad connection.
// Pages: network first, then the last copy seen, then the offline page.
// Static files (JS, CSS, fonts, photos, icons): served from cache, refreshed in the background.
// Never touches Supabase (orders, prices, payments): those always go to the network.
const VERSION = "darvoo-v2";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline"; // served from offline.html (the host drops the .html)
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/hero.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/menu/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase and anything else: straight to network
  if (url.pathname.startsWith("/kitchen")) return; // staff page always live

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    );
  }
});
