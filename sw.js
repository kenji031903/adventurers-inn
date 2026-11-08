// アプリとして入れるための、最小の見張り役。玄関のページだけを覚えておく（宿の中身は覚えない）
// 片づけるのは自分の棚（inn-）だけ。本館の殻の棚（honkan-）は消さない（2026-11-08）
const CACHE = 'inn-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('inn-') && k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
