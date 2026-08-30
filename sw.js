const CACHE_NAME = 'divya-mentor-v5'; // bumped so old cache gets cleared
const BASE_PATH = '/Project-Manager-Mentor';
const OFFLINE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`,
  `${BASE_PATH}/icon-180.png`,
  `${BASE_PATH}/icon-32.png`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Any non-GET request (POST to the mentor API, preflight OPTIONS, etc.) or any
  // cross-origin request: never intercept. Cache.put() can't store non-GET requests
  // anyway, and API calls need to hit the network directly, preflight included.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        fetch(req)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
            return res;
          })
          .catch(() => caches.match(req))
      );
    }
    return; // everything else passes straight through, untouched
  }

  // Same-origin GET (your own app shell/assets) — cache first, network fallback.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
