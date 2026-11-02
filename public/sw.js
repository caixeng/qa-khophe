// KhoPhe ERP — Service Worker tối giản (hỗ trợ cả root / và GitHub Pages /qa-khophe/).
const CACHE_NAME = 'khophe-shell-v4';

function getScopeBase() {
  const scopeUrl = new URL(self.registration.scope);
  return scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
}

self.addEventListener('install', (event) => {
  const basePath = getScopeBase();
  const appShell = [
    basePath,
    `${basePath}index.html`,
    `${basePath}manifest.json`,
    `${basePath}favicon.svg`,
    `${basePath}apple-touch-icon.png`,
  ];
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(appShell)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
}

function isHashedAsset(url) {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(`${getScopeBase()}index.html`);
        }),
    );
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
