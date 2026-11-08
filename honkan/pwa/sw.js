// 本館の殻の見張り役（service worker・2026-11-08 作業係T）
// たとえ: 宿の入り口にいる番頭さん。画面は、先に手もとの棚から出し（すぐ開く）、裏で新しい版があるか見に行く。
// - 殻（画面・部品）: 棚から先に出す → 裏で取り直して棚を新しくする（次に開いたとき新しい版）
// - データ（GAS の JSON の口）: 番頭さんは触らない（画面が手もとの箱=IndexedDB に写しをしまう）
// - 書庫の本文はここを通らない（公開の置き場には置かない。スマホの手もとの箱だけ）
const 版 = 'shell-1';
const 殻の棚 = 'honkan-' + 版;
const 殻 = ['./', 'index.html', '殻.js', '手もとの箱.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(殻の棚).then((c) => c.addAll(殻)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('honkan-') && k !== 殻の棚).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.postMessage({ 番頭: '新しい版', 版 }))));
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // GAS・外は通す
  if (!u.pathname.includes('/honkan/pwa/')) return;                       // 殻の外（玄関・古い宿）は通す
  const 鍵 = e.request.mode === 'navigate' ? 'index.html' : e.request;
  e.respondWith(caches.open(殻の棚).then((c) => c.match(鍵, { ignoreSearch: true }).then((hit) => {
    const 取り直す = fetch(e.request).then((r) => { if (r.ok) c.put(鍵, r.clone()).catch(() => {}); return r; });
    if (hit) { e.waitUntil(取り直す.catch(() => {})); return hit; }
    return 取り直す.catch(() => new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">電波がなくて、まだ宿の画面を覚えていないよ。一度つながるところで開いてね</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  })));
});
