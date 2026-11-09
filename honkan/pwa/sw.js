// 本館の殻の見張り役（service worker・殻2 2026-11-08 作業係V。殻1 は作業係T）
// たとえ: 宿の入り口にいる番頭さん。画面は、先に手もとの棚から出し（すぐ開く）、裏で新しい版があるか見に行く。
// - 殻と本館の部品（根幹・塊の .js）: 版つきの棚。棚から先に出す → 裏で取り直す（次に開いたとき新しい版）
// - 絵: 絵だけの棚（殻の版が変わっても捨てない。絵の一覧が変わったときだけ入れ替える。毎回は取りに行かない）
// - 曲・声・動く絵（.mp3 .m4a .ogg .mp4 .webm）: 一度の棚（殻3 頼み16。1回取ったら手もとから。Range も棚から切って返す）
// - データ（GAS）: 番頭さんは触らない（画面が手もとの箱=IndexedDB に写しをしまう）。書庫の本文もここを通らない
// 下の3行は 殻の組み立て.js が書き換える（部品の中身から作った印・部品の一覧・絵の一覧から作った印）
const 版 = "shell-3-ac4d32e3";
const 殻 = ["./","index.html","殻.js","手もとの箱.js","根幹.js","根幹.css","帳面.js","manifest.webmanifest","icon.svg","../塊/ハンズフリー/ハンズフリー.js","../塊/チャット/チャット.js","../塊/マスコット/マスコット.js","../塊/部屋と階/部屋と階.js","../塊/BGM/BGM.js","../塊/クエストの掲示板/クエストの掲示板.js","../塊/質問の板/質問の板.js","../塊/占い/占い.js","../塊/パーティ編成/パーティ編成.js","../塊/試着室/試着室.js","../塊/ミストの伝説/ミストの伝説.js","../塊/ファミコン/ファミコン.js","../塊/副業の管理画面/副業の管理画面.js","../塊/朝の作戦会議/朝の作戦会議.js","../塊/手紙箱/手紙箱.js","../塊/個室/個室.js","../塊/リラックスルーム/リラックスルーム.js","../塊/郵便箱/郵便箱.js","../塊/知識の書庫/知識の書庫.js","../塊/プロフィール/プロフィール.js","../塊/絵日記/絵日記.js","../塊/予定とやること/予定とやること.js","../塊/家計簿/家計簿.js"];
const 絵の版 = "e-f06e7454";
const 殻の棚 = 'honkan-' + 版;
const 絵の棚 = 'honkan-絵-' + 絵の版;
// 一度書いたら変わらないもの（曲・声・動く絵の .mp3 .m4a .ogg .mp4 .webm）の棚。殻の版が変わっても捨てない（2026-11-08 けんじの頼み16・作業係W）
// 名前に作った日や版が入っていて、同じ名前の中身は書き直さない決まりなので、1回取ったら手もとから出す。とちゅうから読む頼み（Range）も、棚の中身から切って返す
const 一度の棚 = 'honkan-一度-1';

self.addEventListener('install', (e) => {
  // 殻6（2026-11-09 頼み99）: 古い写し（ブラウザの手もと）を使わず、かならず配り元から取り直す
  e.waitUntil(caches.open(殻の棚).then((c) => c.addAll(殻.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('honkan-') && k !== 殻の棚 && k !== 絵の棚 && k !== 一度の棚).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.postMessage({ 番頭: '新しい版', 版 }))));
});

function 棚から出す(e, 棚, 鍵) {
  return caches.open(棚).then((c) => c.match(鍵, { ignoreSearch: true }).then((hit) => {
    const 取り直す = fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok && r.status === 200) c.put(鍵, r.clone()).catch(() => {}); return r; });
    if (hit) { e.waitUntil(取り直す.catch(() => {})); return hit; }
    return 取り直す;
  }));
}
// 一度の棚: あれば棚から（Range なら切って 206）。なければ、まるごと取って棚にしまってから返す（失敗したら、ふつうに通す）
function 一度の棚から(e) {
  const 鍵 = e.request.url.split('#')[0].split('?')[0], 範囲 = e.request.headers.get('range');
  return caches.open(一度の棚).then((c) => c.match(鍵).then((hit) => {
    const 出す = (r) => (範囲 ? 切って出す(r, 範囲) : r);
    if (hit) return 出す(hit);
    return fetch(鍵).then((r) => {
      if (!(r.ok && r.status === 200)) return 範囲 ? fetch(e.request) : r;
      return c.put(鍵, r.clone()).catch(() => {}).then(() => 出す(r));
    });
  })).catch(() => fetch(e.request));
}
function 切って出す(r, 範囲) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(範囲.trim());
  return r.arrayBuffer().then((b) => {
    const n = b.byteLength;
    let a = m && m[1] !== '' ? +m[1] : (m && m[2] !== '' ? Math.max(0, n - +m[2]) : 0);
    let z = m && m[1] !== '' && m[2] !== '' ? Math.min(+m[2], n - 1) : n - 1;
    if (!m || a >= n || a > z) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
    return new Response(b.slice(a, z + 1), { status: 206, headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': 'bytes ' + a + '-' + z + '/' + n, 'Content-Length': String(z - a + 1), 'Accept-Ranges': 'bytes' } });
  });
}
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // GAS・外 は通す
  const p = decodeURIComponent(u.pathname);
  if (p.includes('/honkan/塊/') && /\.(mp3|m4a|ogg|mp4|webm)$/i.test(p)) { e.respondWith(一度の棚から(e)); return; } // 頼み16: 一度書いたら変わらないもの
  if (e.request.headers.has('range')) return; // ほかの とちゅうから は通す
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
