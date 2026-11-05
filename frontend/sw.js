/**
 * CalcMaster Service Worker
 * Caches application shell for offline capability and responsive performance
 */

const CACHE_NAME = 'calcmaster-v2.4.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/api.js',
  './js/memory.js',
  './js/settings.js',
  './js/calculator.js',
  './js/scientific.js',
  './js/financial.js',
  './js/statistics.js',
  './js/converter.js',
  './js/history.js',
  './js/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch for non-critical assets (e.g. CDNs when offline)
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset).catch((err) => {
          console.warn(`[ServiceWorker] Failed to cache: ${asset}`, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[ServiceWorker] Removing old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-while-revalidate for static files, Network-only for API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls to the backend
  if (url.pathname.startsWith('/api/') || url.port === '8080') {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline if not cached
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
