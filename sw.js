const CACHE_NAME = 'divya-mentor-v4';
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

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API - network first
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({
          error: 'offline',
          content: [{ text: "You're offline right now. Your progress is saved locally." }]
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts - network first
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App assets - cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

// Skip waiting
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
