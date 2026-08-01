// KhoPhe ERP — Service Worker tối giản.
// Chỉ cache app shell (HTML/JS/CSS/font/ảnh tĩnh) để mở lại được khi mất mạng.
// KHÔNG bao giờ cache dữ liệu nghiệp vụ (Supabase) — dữ liệu phải luôn mới,
// nếu mất mạng thì để request lỗi thật và UI tự hiện thông báo lỗi.
const CACHE_NAME = 'khophe-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !isSupabaseRequest(url)) return;
  if (isSupabaseRequest(url)) return; // luôn qua mạng, không cache dữ liệu nghiệp vụ

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);

      // Stale-while-revalidate: trả cache ngay nếu có, cập nhật ngầm từ mạng
      return cached || networkFetch;
    })
  );
});
