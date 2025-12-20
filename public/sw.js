
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Để PWA hoạt động, cần có sự kiện fetch, dù không cache gì
  e.respondWith(fetch(e.request));
});
