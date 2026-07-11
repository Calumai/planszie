const cacheName = "fat-loss-companion-v5";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./history-data.js",
  "./manifest.webmanifest",
  "./assets/app-icon.svg",
  "./assets/meal-bowl.svg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const shouldPreferNetwork =
    event.request.mode === "navigate" ||
    [".html", ".css", ".js"].some((extension) => requestUrl.pathname.endsWith(extension));

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
