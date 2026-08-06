// KhoPhe ERP — Service Worker tối giản.
//
// Mục tiêu: mở lại được app khi mất sóng ở xưởng. KHÔNG bao giờ cache dữ liệu
// nghiệp vụ (Supabase) — số liệu kho phải luôn là số liệu thật, mất mạng thì
// để request lỗi và UI hiện thông báo.
const CACHE_NAME = 'khophe-shell-v2';

self.addEventListener('install', () => {
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

/**
 * File build có hash trong tên (index-BmC2RaKC.js) nên nội dung là bất biến:
 * cùng một URL luôn trả về đúng một nội dung, cache vĩnh viễn được.
 */
function isHashedAsset(url) {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) return; // luôn qua mạng
  if (url.origin !== self.location.origin) return;

  /**
   * HTML phải NETWORK-FIRST, không được stale-while-revalidate.
   *
   * index.html trỏ tới các file JS/CSS có hash trong tên. Mỗi lần deploy, hash
   * đổi và file cũ biến mất khỏi máy chủ. Nếu trả index.html từ cache, người
   * dùng nhận HTML cũ trỏ tới chunk đã không còn tồn tại → tải module thất bại
   * → màn hình trắng, và họ không có cách nào tự thoát ngoài xoá cache trình
   * duyệt. Chỉ dùng bản cache khi thật sự offline.
   */
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
          return cached || caches.match('/index.html');
        }),
    );
    return;
  }

  // Asset có hash: cache-first, an toàn vì nội dung không bao giờ đổi.
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

  // Còn lại (ảnh, manifest, favicon...): stale-while-revalidate là đủ.
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
