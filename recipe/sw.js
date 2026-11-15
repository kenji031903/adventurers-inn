// アプリとして入れるための見張り役。玄関のページと、すぐ開く版の画面（app.html）を覚えておく（レシピの中身は覚えない。中身は画面が橋で取る）
// 版96 頼み281（2026-11-15 K7）: 覚えている分をすぐ出し、うしろで新しい版を取って入れかえる（次に開いたときに新しくなる）。電波がなくても画面は出る
const CACHE = 'recipe-v3';
const FILES = ['./', 'index.html', 'app.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('recipe-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET' || !u.pathname.includes('/recipe/')) return;
  const net = fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; });
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => { if (hit) { e.waitUntil(net.catch(() => {})); return hit; } return net.catch(() => caches.match('app.html')); }));
});
