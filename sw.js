// ToolKit Service Worker
const CACHE = 'toolkit-v1';

// Files to cache for offline use
const PRECACHE = [
  '/toolkit/',
  '/toolkit/index.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/bwip-js@3/dist/bwip-js-min.js',
];

// Install — precache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        // Non-fatal — some external URLs may fail in install
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and Supabase API calls (always need network)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('esm.sh')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for static assets
        if (res.ok && (
          e.request.url.includes('fonts.') ||
          e.request.url.includes('cdn.jsdelivr') ||
          e.request.url.includes('cdnjs.') ||
          e.request.url.includes('unpkg.com') ||
          e.request.url.endsWith('.html') ||
          e.request.url.endsWith('.json') ||
          e.request.url.endsWith('.js') ||
          e.request.url.endsWith('.css') ||
          e.request.url.endsWith('.png')
        )) {
          const resClone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Offline fallback for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/toolkit/') || caches.match('/toolkit/index.html');
          }
        });
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
