// 本館の殻の見張り役（service worker・殻2 2026-11-08 作業係V。殻1 は作業係T）
// たとえ: 宿の入り口にいる番頭さん。画面は、先に手もとの棚から出し（すぐ開く）、裏で新しい版があるか見に行く。
// - 殻と本館の部品（根幹・塊の .js）: 版つきの棚。棚から先に出す → 裏で取り直す（次に開いたとき新しい版）
// - 絵: 絵だけの棚（殻の版が変わっても捨てない。絵の一覧が変わったときだけ入れ替える。毎回は取りに行かない）。曲（.mp3）と、とちゅうから読む頼み（Range）は通す
// - データ（GAS）: 番頭さんは触らない（画面が手もとの箱=IndexedDB に写しをしまう）。書庫の本文もここを通らない
// 下の3行は 殻の組み立て.js が書き換える（部品の中身から作った印・部品の一覧・絵の一覧から作った印）
const 版 = "shell-2-5a05a4bb";
const 殻 = ["./","index.html","殻.js","手もとの箱.js","根幹.js","根幹.css","帳面.js","manifest.webmanifest","icon.svg","../塊/ハンズフリー/ハンズフリー.js","../塊/チャット/チャット.js","../塊/マスコット/マスコット.js","../塊/部屋と階/部屋と階.js","../塊/BGM/BGM.js","../塊/クエストの掲示板/クエストの掲示板.js","../塊/質問の板/質問の板.js","../塊/占い/占い.js","../塊/パーティ編成/パーティ編成.js","../塊/試着室/試着室.js","../塊/ミストの伝説/ミストの伝説.js","../塊/ファミコン/ファミコン.js","../塊/副業の管理画面/副業の管理画面.js","../塊/朝の作戦会議/朝の作戦会議.js","../塊/手紙箱/手紙箱.js","../塊/個室/個室.js","../塊/リラックスルーム/リラックスルーム.js","../塊/郵便箱/郵便箱.js","../塊/知識の書庫/知識の書庫.js","../塊/プロフィール/プロフィール.js"];
const 絵の版 = "e-fc330adc";
const 殻の棚 = 'honkan-' + 版;
const 絵の棚 = 'honkan-絵-' + 絵の版;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(殻の棚).then((c) => c.addAll(殻)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('honkan-') && k !== 殻の棚 && k !== 絵の棚).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.postMessage({ 番頭: '新しい版', 版 }))));
});

function 棚から出す(e, 棚, 鍵) {
  return caches.open(棚).then((c) => c.match(鍵, { ignoreSearch: true }).then((hit) => {
    const 取り直す = fetch(e.request).then((r) => { if (r.ok && r.status === 200) c.put(鍵, r.clone()).catch(() => {}); return r; });
    if (hit) { e.waitUntil(取り直す.catch(() => {})); return hit; }
    return 取り直す;
  }));
}
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || e.request.headers.has('range')) return; // GAS・外・とちゅうから は通す
  const p = decodeURIComponent(u.pathname);
  if (p.includes('/honkan/pwa/')) {
    const 鍵 = e.request.mode === 'navigate' ? 'index.html' : e.request;
    e.respondWith(棚から出す(e, 殻の棚, 鍵).catch(() => new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">電波がなくて、まだ宿の画面を覚えていないよ。一度つながるところで開いてね</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    return;
  }
  if (!p.includes('/honkan/塊/')) return;            // 玄関・古い宿は通す
  if (/\.js$/.test(p)) { e.respondWith(棚から出す(e, 殻の棚, e.request)); return; }
  if (/\/(絵)\//.test(p) && !/\.(mp3|m4a|ogg|mp4|webm)$/i.test(p)) {
    // 絵: 棚にあれば出すだけ（同じ名前の絵は描き直さない決まり。絵が1つでも変わると 絵の版 が変わり、棚ごと入れ替わる）
    e.respondWith(caches.open(絵の棚).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok && r.status === 200) c.put(e.request, r.clone()).catch(() => {}); return r; }))));
  }
});
