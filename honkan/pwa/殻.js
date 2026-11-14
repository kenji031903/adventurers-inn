/**
 * 本館の殻（アプリ版・PWA）殻2（2026-11-08 作業係V。殻1 は作業係T）
 * けんじ「アプリ開いたらすぐ出て、その間にウェブの分をロードすれば、スムーズに感じるかも！」が芯。
 * 殻2 から、画面は本物の本館（根幹.js・根幹.css・帳面の塊）をそのまま動かす。部品は 殻の組み立て.js が GAS と同じ元から写す（二重に持たない）
 *  1. 殻の口: 本館の「サーバーの口」の代わり。google.script.run の代わりに、見えない枠の「橋」（本館の GAS の ?橋=1）へ頼みを渡す
 *     - 読むだけの頼みは、手もとの箱の写しを先に返し、裏で取り直す（すぐ出る）
 *     - 書く頼み（チャット・郵便箱 など）は、電波がない・橋がまだのとき、送り待ちの列に預けて、つながったら送る
 *  2. 鍵の守り: 橋は けんじの Google ログイン（本館と同じ）。殻からは鍵を送らない。橋の返事は googleusercontent の場所からだけ受ける
 *  3. 前の板（掲示板・書庫・つながりの帯）は消さずに、☰ の ⚙設定 の「アプリ版」の中へ移した
 *  4. 装い: 宿（JSON の口）がシークレットと言ったら、本館もシークレットにして開き直す（隠す側へだけ動かす）
 */
(function () {
  'use strict';
  var 設定 = {
    API: 'https://script.google.com/macros/s/AKfycbxYLTt4rW874cOe9fReXd-GO3NuACL07eBIiEW2XL6VKWusxZy8Boz-bEhydjR9RAtAMw/exec',
    橋: 'https://script.google.com/macros/s/AKfycbwGI6Bq7dteWGTCnwQ2I0angxhIY_QQYHt7TYyb4-hGHlFwsqJfoE92QVLp8WRHykc/exec?橋=1',
    本番の宿: '../', 鍵: ''
  };
  function 設定を読む() { try { var s = JSON.parse(localStorage.getItem('honkan-shell/設定') || '{}'); Object.keys(s).forEach(function (k) { if (s[k]) 設定[k] = s[k]; }); } catch (e) { /* なし */ } }
  function 鍵をしまう(k) {
    var s = {}; try { s = JSON.parse(localStorage.getItem('honkan-shell/設定') || '{}'); } catch (e) { s = {}; }
    s.鍵 = k; 設定.鍵 = k;
    口を箱へ写す(); // 番頭さん用の写しも新しくする（2026-11-10 頼み）
    try { localStorage.setItem('honkan-shell/設定', JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  // 版73（2026-11-14 頼み247 宿25🍎）: この端末の鍵を、その場で作ってしまう。スマホの鍵（根幹/スマホ版の鍵）をそのまま使い回し、
  // 名前（パソコン版／スマホ版）だけ付けて呼ぶ。鍵は橋の返事でもらい、画面にも記録にも出さずにしまう。新しい窓やタブは開かない
  // （宿からパソコンを動かす作り＝頼み231・241③④の窓の並びはそのまま）。シークレットのあいだは作らない
  function この端末の名前() {
    var 手 = false; try { 手 = window.matchMedia('(pointer: coarse)').matches; } catch (e) { 手 = false; }
    return 手 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'スマホ版' : 'パソコン版';
  }
  var 鍵の作り中 = false, 作り直しの念押し = 0;
  function この端末に鍵を作る(終わった) {
    var 名前 = この端末の名前(), 言う = function (t) { 知らせ(t); if (終わった) 終わった(t); };
    if (モード === 'シークレット') { 言う('シークレットのあいだは、鍵を作らないよ'); return; }
    if (鍵の作り中) { 言う('いま鍵を作っているよ…'); return; }
    if (設定.鍵 && Date.now() - 作り直しの念押し > 6000) { 作り直しの念押し = Date.now(); 言う('この端末の鍵はもうあるよ。作り直すなら、もう一度押してね'); return; }
    作り直しの念押し = 0; 鍵の作り中 = true; 言う(名前 + 'の鍵を作っているよ…');
    橋.呼ぶ('根幹', 'スマホ版の鍵', { 名前: 名前, そのまま: true }, 60000).then(function (r) {
      var k = r && typeof r.鍵 === 'string' ? r.鍵 : '';
      if (k.length < 32) throw new Error('鍵が来なかった');
      鍵をしまう(k); k = '';
      言う(名前 + 'の鍵をしまったよ（この端末だけ）'); 板を描き直す(); 裏で読む();
    }).catch(function (e) {
      言う('鍵を作れなかったよ（' + (e && e.運び ? '宿とまだつながっていない' : String(e && e.message || e).slice(0, 40)) + '）');
    }).then(function () { 鍵の作り中 = false; });
  }
  設定を読む();
  // #鍵=… で来たら、しまってから URL の印を消す（履歴にも残さない）
  var h = /^#鍵=(.+)$/.exec(decodeURIComponent(location.hash || ''));
  if (h) { 鍵をしまう(h[1].trim()); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* なし */ } }

  var t0 = performance.now();
  var 道具 = null; // アプリ版の塊の道具（本館が開いたあとに入る）
  function 知らせ(文) { try { if (道具) 道具.知らせ.出す(文); } catch (e) { /* なし */ } }
  var 箱P = 手もとの箱.箱を開く('honkan-tenomoto').catch(function () { return 手もとの箱.メモリの箱(); });

  // ==== 橋（見えない枠の中の本館の GAS）
  var 橋 = (function () {
    var 枠 = null, 相手 = null, 相手の場所 = '', 用意 = false, 番 = 0, 待ち = {}, 用意待ち = [], 始め = 0, 知らせた = false;
    var 試しの場所 = ''; try { 試しの場所 = new URL(設定.橋, location.href).origin; } catch (e) { 試しの場所 = ''; }
    function 受けてよい(o) { return /^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(o) || (試しの場所 && 試しの場所 !== 'https://script.google.com' && o === 試しの場所); }
    function 作る() {
      用意 = false; 始め = Date.now();
      if (!枠) {
        枠 = document.createElement('iframe'); 枠.title = '本館の橋'; 枠.setAttribute('aria-hidden', 'true'); 枠.tabIndex = -1;
        枠.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;top:-10px;border:0;opacity:0;pointer-events:none';
        document.body.appendChild(枠);
      }
      枠.src = 設定.橋;
      setTimeout(function () {
        if (用意 || 知らせた) return; 知らせた = true;
        知らせ(navigator.onLine ? '宿の本番とまだつながらないよ（⚙ のアプリ版から本番を開けるよ）' : '電波なし。手もとの写しで動いているよ（送る言葉は預かるね）');
        用意待ち.splice(0).forEach(function (w) { w.ng(new Error('橋がまだ')); });
      }, 20000);
    }
    window.addEventListener('message', function (ev) {
      var d = ev.data; if (!d || typeof d !== 'object' || typeof d['橋'] !== 'string' || !受けてよい(ev.origin)) return;
      if (d['橋'] === '用意できた') {
        相手 = ev.source; 相手の場所 = ev.origin; 用意 = true;
        用意待ち.splice(0).forEach(function (w) { clearTimeout(w.tm); w.ok(); });
        板を描き直す(); 送り待ちを流す();
      } else if (d['橋'] === '返事' && 待ち[d.n]) {
        var w = 待ち[d.n]; delete 待ち[d.n]; clearTimeout(w.tm);
        if (d.ok) { var r = d.r; try { r = typeof r === 'string' ? JSON.parse(r) : r; } catch (e) { /* そのまま */ } w.ok(r); } else { var er = new Error(String(d['わけ'] || '宿がことわった')); er.運び = /network|connection|HTTP 0|timed? ?out|failed to fetch/i.test(er.message); w.ng(er); }
      }
    });
    function 用意を待つ(ms) {
      if (用意) return Promise.resolve();
      if (!navigator.onLine) return Promise.reject(運びのまちがい('電波なし'));
      return new Promise(function (ok, ng) {
        var w = { ok: ok, ng: ng }; w.tm = setTimeout(function () { var i = 用意待ち.indexOf(w); if (i >= 0) 用意待ち.splice(i, 1); ng(運びのまちがい('橋がまだ')); }, ms);
        用意待ち.push(w);
      });
    }
    function 呼ぶ(塊, すること, データ, ms) {
      return 用意を待つ(20000).then(function () {
        return new Promise(function (ok, ng) {
          var n = ++番; var w = { ok: ok, ng: ng };
          w.tm = setTimeout(function () { delete 待ち[n]; ng(運びのまちがい('時間切れ')); }, ms || 60000);
          待ち[n] = w;
          try { 相手.postMessage({ '橋': '呼ぶ', n: n, '塊': 塊, 'すること': すること, 'データ': データ == null ? null : データ }, 相手の場所); } catch (e) { delete 待ち[n]; clearTimeout(w.tm); ng(運びのまちがい(String(e))); }
        });
      });
    }
    window.addEventListener('online', function () { if (!用意) { 知らせた = false; 作る(); } else 送り待ちを流す(); });
    return { 作る: 作る, 呼ぶ: 呼ぶ, 用意: function () { return 用意; }, 様子: function () { return { 用意: 用意, 待ち: Object.keys(待ち).length, 秒: 始め ? Math.round((Date.now() - 始め) / 1000) : 0 }; } };
  })();
  function 運びのまちがい(わけ) { var e = new Error(わけ); e.運び = true; return e; }

  // ==== 送り待ちの列（書く頼み）
  // 2026-11-10 頼み（バックグラウンド同期）: 書く頼みは、いつも先に列へ入れて（手紙の id が決まる）から、橋の '根幹/預けた手紙' で送る。
  // 宿は同じ id を2回受けない。送っている途中の手紙は 送り中 に入れ、列を流すときも同じ約束を待つ（画面の中で二重に送らない）
  var 送り中 = {};
  function 一通送る(手紙) {
    if (送り中[手紙.id]) return 送り中[手紙.id];
    var p = 橋.呼ぶ('根幹', '預けた手紙', { id: 手紙.id, 塊: 手紙.塊, すること: 手紙.すること, データ: 手紙.データ }, 60000)
      .then(手もとの箱.答えを分ける, function (e) {
        if (e && e.運び) throw e; // 電波・時間切れ → 列に残して、次の機会に同じ id で送る
        return { はじいた: String(e && e.message || e) }; // 宿がことわった → 脇へよけて、うしろを詰まらせない
      });
    送り中[手紙.id] = p;
    var 外す = function () { delete 送り中[手紙.id]; };
    p.then(外す, 外す);
    return p;
  }
  var 列P = 箱P.then(function (箱) { return 手もとの箱.送り待ちの列(箱, 一通送る); });
  // 番頭さん（service worker）に「電波が戻ったら送ってね」と頼む（できない端末は、今までどおり開いたときに流す）
  function 同期を頼む() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(function (r) { if (r.sync && r.sync.register) return r.sync.register('honkan-送り待ち'); }).catch(function () { /* 開いたときに流す */ });
  }
  // 番頭さんは localStorage を読めないので、JSON の口と鍵を箱の '写し' に写しておく
  function 口を箱へ写す() {
    if (!箱P) return; // #鍵=… で開いたときは箱がまだ。下でもう一度写す
    箱P.then(function (箱) { return 設定.鍵 ? 箱.しまう('写し', '殻/JSONの口', { API: 設定.API, 鍵: 設定.鍵 }) : 箱.消す('写し', '殻/JSONの口'); }).catch(function () { /* なし */ });
  }
  口を箱へ写す();
  // アプリを閉じる・ほかへ移るとき、まだ届いていない手紙があれば同期を頼む
  function 閉じる前に() { 列P.then(function (列) { return 列.数(); }).then(function (n) { if (n > 0) 同期を頼む(); }).catch(function () { /* なし */ }); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') 閉じる前に(); });
  window.addEventListener('pagehide', 閉じる前に);
  var 流し中 = false;
  function 送り待ちを流す() {
    if (流し中 || !navigator.onLine || !橋.用意()) return;
    流し中 = true;
    列P.then(function (列) { return 列.流す(); }).then(function (r) {
      流し中 = false; 板を描き直す();
      if (r && r.送れた) 知らせ('預かっていた ' + r.送れた + ' 通を、宿へ届けたよ');
    }, function () { 流し中 = false; });
  }
  // 預けたときに本館へ返す形（本館は「届いた」と同じように描く）
  var 書く = {
    '根幹/引き出しで話す': { 文: '（宿とまだつながっていないので、この端末に預けたよ。つながったら届けるね）' },
    '根幹/引き出しの答え': { 預けた: true },
    '郵便箱/送る': { 預けた: true },
    '朝の作戦会議/タスクを済に': { 預けた: true },
    'ハンズフリー/控える': { 預けた: true }
  };
  // 読むだけ（写しを先に出す）
  var 読む = ['根幹/引き出しの質問', '根幹/引き出しの済み', 'クエストの掲示板/読む', 'クエストの掲示板/開く', '質問の板/読む',
    'マスコット/ムービーの一覧', 'マスコット/ムービーの中身', '試着室/動く服の一覧', '試着室/動く服の中身', 'パーティ編成/パーティ', 'パーティ編成/分身',
    '朝の作戦会議/今日', '朝の作戦会議/夢日記', '個室/宝箱', 'プロフィール/みんな', '郵便箱/様子', '知識の書庫/一覧', '知識の書庫/読む', '部屋と階/好感度'];
  // 見回り（何度も聞く）: 橋を待って聞く。写しは使わない
  var 見回り = ['根幹/返事を見る', '根幹/引き出しを見る', '根幹/引き出しの知らせ', '根幹/引き出しの写し', '根幹/声を受け取る']; // 版37: 引き出しの写し（頼み21・22）

  function 写しの鍵(塊, すること, データ) { return 塊 + '|' + すること + '|' + JSON.stringify(データ == null ? null : データ); }
  var 写しの数 = { 出した: 0, 待った: 0 };
  function 写しで読む(塊, すること, データ) {
    var k = 写しの鍵(塊, すること, データ);
    var 取る = 橋.呼ぶ(塊, すること, データ, 60000).then(function (r) {
      箱P.then(function (箱) { return 箱.しまう('写し', k, { 時刻: Date.now(), 中身: r }); }).catch(function () { /* しまえなくても動く */ });
      return r;
    });
    return 箱P.then(function (箱) { return 箱.読む('写し', k); }).catch(function () { return null; }).then(function (w) {
      if (!w) { 写しの数.待った++; return 取る; }
      // 1.2秒で返事が来れば新しい方。来なければ写しを出す（取り直しは裏で続き、次に開いたとき新しい分が出る）
      return Promise.race([取る.catch(function () { return 写しの印; }), new Promise(function (ok) { setTimeout(function () { ok(写しの印); }, 1200); })]).then(function (r) {
        if (r !== 写しの印) return r;
        写しの数.出した++; 取る.catch(function () { /* 写しのまま */ }); return w.中身;
      });
    });
  }
  var 写しの印 = {};

  var 殻の口 = {
    呼ぶ: function (塊, すること, データ) {
      var 名 = 塊 + '/' + すること;
      if (書く[名]) {
        var 預けた形 = function () { 板を描き直す(); return JSON.parse(JSON.stringify(書く[名])); };
        return 列P.then(function (列) {
          return 列.足す(塊, すること, データ).then(function (手紙) {
            if (!navigator.onLine || !橋.用意()) { 同期を頼む(); return 預けた形(); }
            return 一通送る(手紙).then(function (r) {
              return 列.消す(手紙.id).then(function () {
                if (r && r.はじいた) throw new Error(r.はじいた); // 宿がことわった → 今までどおり、その場でまちがいを返す
                板を描き直す(); return r && '答え' in r ? r.答え : 預けた形();
              });
            }, function () { 同期を頼む(); return 預けた形(); }); // 届かなかった → 列に残す（番頭さんか、次に開いたときに送る）
          });
        });
      }
      if (読む.indexOf(名) >= 0) return 写しで読む(塊, すること, データ);
      if (見回り.indexOf(名) >= 0) return 橋.呼ぶ(塊, すること, データ, 30000);
      return 橋.呼ぶ(塊, すること, データ, 90000); // AI と話す・今すぐ など（その場だけ）
    }
  };

  // ==== ⚙ アプリ版（前の板。消さずにここへ）
  var 板 = null; // { 地, 描く }
  var 前の写し = {}, モード = null;
  function 板を描き直す() { if (板) 板.描く(); }
  var 板の見た目 = [
    '.apb-地{padding:12px 16px 80px;color:var(--本館-文字,#3e2614);font:15px/1.6 inherit;max-width:560px;margin:0 auto}',
    '.apb-地 h2{font-size:16px;margin:4px 0}',
    '.apb-帯{padding:8px 12px;border-radius:10px;background:#fff;border:1px solid #c9b18f;color:#3e2614}',
    '.apb-帯[data-色="緑"]{border-color:#2f7d4a;color:#2f7d4a}.apb-帯[data-色="黄"]{border-color:#a8730a;color:#a8730a}',
    '.apb-地 section{background:#fffaf2;border:1px solid #c9b18f;border-radius:12px;padding:8px 12px;margin-top:10px;color:#3e2614}',
    '.apb-地 ul{margin:0;padding-left:20px;overflow-wrap:anywhere}',
    '.apb-小{font-size:13px;opacity:.85}',
    '.apb-地 button{font:inherit;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #c9b18f;background:#f6efe3;color:#3e2614}',
    '.apb-書庫 button{min-height:40px;margin:2px 0;text-align:left}',
    '.apb-行{display:flex;gap:8px}',
    '.apb-鍵の欄{flex:1;min-width:0;font:inherit;min-height:44px;padding:0 10px;border-radius:10px;border:1px solid #c9b18f;background:#fff;color:#3e2614}',
    '.apb-本{white-space:pre-wrap;margin-top:6px;overflow-wrap:anywhere}',
    '.apb-本番{width:100%}'
  ].join('\n');
  function 板を開く() {
    var p = 道具.画面.ページを開く({ 題: 'アプリ版', 閉じた: function () { 板 = null; } });
    var 地 = document.createElement('div'); 地.className = 'apb-地'; p.中身.appendChild(地);
    地.innerHTML =
      '<div class="apb-帯" data-id="帯">…</div><p class="apb-小" data-id="速さ"></p>' +
      '<section><h2>宿の本番とのつながり（橋）</h2><p class="apb-小" data-id="橋"></p><p class="apb-小" data-id="列"></p></section>' +
      '<section><h2>クエストの掲示板</h2><ul data-id="掲示板"></ul></section>' +
      '<section data-区画="書庫"><h2>知識の書庫（本文はこの端末の中だけ）</h2><ul class="apb-書庫" data-id="書庫"></ul><div class="apb-本" data-id="本"></div></section>' +
      '<section><button class="apb-本番" data-id="更新">🔄 宿を新しくする</button></section>' +
      '<section><button class="apb-本番" data-id="本番">宿の本番を開く（つながっているときだけ）</button></section>' +
      '<section><p class="apb-小">装い: <span data-id="モード"></span><br><span data-id="版"></span></p>' +
      '<p class="apb-小">手もとの保存（写し・送り待ち・書庫）: <span data-id="保存"></span></p>' +
      '<p class="apb-小">宿の鍵（パソコンで作った長い合言葉。この端末だけにしまう。掲示板と書庫の分だけに使う）: <span data-id="鍵の様子"></span></p>' +
      '<div class="apb-行"><button class="apb-本番" data-id="鍵を作る">🔑 この端末に鍵を作る</button></div>' +
      '<div class="apb-行"><input class="apb-鍵の欄" data-id="鍵の欄" type="password" autocomplete="off" placeholder="鍵をはりつける"><button data-id="鍵をしまう">しまう</button></div></section>';
    var $ = function (id) { return 地.querySelector('[data-id="' + id + '"]'); };
    板 = { 地: 地, $: $, 描く: function () {
      var b = 橋.様子();
      $('橋').textContent = b.用意 ? 'つながっている（チャット・郵便箱は、ここを通って宿へ届く）' : (navigator.onLine ? 'つなぎ中…（' + b.秒 + '秒）' : '電波なし');
      列P.then(function (列) { return Promise.all([列.数(), 列.止まった()]); }).then(function (a) {
        if (!板) return; $('列').textContent = '預かっている言葉: ' + a[0] + ' 通' + (a[1].length ? '（宿がことわった ' + a[1].length + ' 通は、消さずに残してある）' : '') + '／写しで先に出した回数: ' + 写しの数.出した;
      });
      $('モード').textContent = モード || '（まだ分からない → 掲示板のほかは隠す）';
      $('鍵の様子').textContent = 設定.鍵 ? 'しまってある' : 'まだない（🔑 で作るか、ここで入れてね）';
      $('保存').textContent = 保存の札.ずっと === true ? 'この端末にずっと残す（ブラウザが勝手に片づけない）' : 保存の札.ずっと === false ? 'ふつう（場所が足りないとき、ブラウザが片づけることがある。開き直すと作り直すよ）' : '確かめ中…';
      地.querySelectorAll('[data-区画]').forEach(function (el) { el.hidden = 手もとの箱.隠すか(el.getAttribute('data-区画'), モード); });
      if (手もとの箱.隠すか('書庫', モード)) $('本').textContent = '';
      Object.keys(前の写し).forEach(function (k) { 区画を描く(k, 前の写し[k]); });
    } };
    $('更新').onclick = 新しくする;
    $('本番').onclick = function () {
      if (!navigator.onLine) { 帯('宿の本番はつながっているときだけ開くよ', '黄'); return; }
      location.href = 設定.本番の宿;
    };
    $('鍵を作る').onclick = function () { この端末に鍵を作る(function (t) { if (板) $('鍵の様子').textContent = t; }); };
    $('鍵をしまう').onclick = function () {
      var k = $('鍵の欄').value.trim(); $('鍵の欄').value = '';
      if (k.length < 32) { $('鍵の様子').textContent = '短すぎるよ（パソコンで作った鍵をそのまま）'; return; }
      鍵をしまう(k); 板.描く(); 裏で読む();
    };
    $('版').textContent = 番頭の版 || '';
    $('速さ').textContent = '本館が開くまで ' + 開くまで + 'ms';
    帯(帯の今.t, 帯の今.色);
    板.描く();
  }
  var 帯の今 = { t: '…', 色: '' }, 開くまで = 0, 番頭の版 = '';
  var 保存の札 = { 頼んだ: false, ずっと: null }; // 版71 頼み241④: 手もとの箱を消さないでね の札（下の 橋.作る のあとで頼む）

  // ---- 🔄 宿を新しくする（殻6 2026-11-09 頼み99: 閉じて開き直しても新しくならない、をボタン1つで）
  // たとえ: 番頭さんの棚の殻と部品だけ空にして、配り元へ新しい版を見に行かせ、開き直す（絵・曲・声の棚と、預けた言葉はそのまま）
  function 札を出す(t, 消す) {
    var el = document.getElementById('apb-札');
    if (!el) { el = document.createElement('div'); el.id = 'apb-札'; el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:96px;z-index:99999;padding:12px 14px;border-radius:12px;background:#3e2614;color:#fff8ec;font:15px/1.5 sans-serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)'; document.body.appendChild(el); }
    el.textContent = t;
    if (消す) setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 消す);
    return el;
  }
  var 新しくしている = false;
  function 新しくする() {
    if (新しくしている) return;
    if (!navigator.onLine) { 札を出す('電波がないので、つながってからもう一度押してね', 4000); return; }
    新しくしている = true; 札を出す('新しい版を取りに行っているよ…');
    // 頼み103（2026-11-14 作業係F）: 棚を空にするのと、番頭さんの入れ替えを同時にしていたので、入れ替えの途中の新しい棚まで消して、古い版のまま開き直すことがあった。
    //   → 順番に: ① 殻と部品の棚を空にする → ② 番頭さんに新しい版を見に行かせ、入れ替わるまで待つ（15秒まで）→ ③ 開き直す
    function 棚を空に() {
      if (!('caches' in window)) return Promise.resolve();
      return caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k.indexOf('honkan-') === 0 && k.indexOf('honkan-絵-') !== 0 && k.indexOf('honkan-一度-') !== 0; }).map(function (k) { return caches.delete(k); }));
      });
    }
    function 入れ替わるまで(w) {
      if (!w || w.state === 'activated' || w.state === 'redundant') return Promise.resolve();
      return new Promise(function (ok) { var tm = setTimeout(ok, 15000); w.addEventListener('statechange', function () { if (w.state === 'activated' || w.state === 'redundant') { clearTimeout(tm); ok(); } }); });
    }
    function 番頭に頼む() {
      if (!('serviceWorker' in navigator)) return Promise.resolve();
      return navigator.serviceWorker.getRegistration().then(function (r) {
        if (!r) return;
        return r.update().then(function () { return 入れ替わるまで(r.installing || r.waiting); });
      });
    }
    棚を空に().catch(function () { /* 空にできなくても、見に行く */ }).then(番頭に頼む).catch(function () { /* 開き直せば配り元から取る */ }).then(function () {
      札を出す('新しくするね。開き直すよ'); setTimeout(function () { location.reload(); }, 300);
    });
  }
  // 開いたとき・画面に戻ったとき、番頭さんに新しい版がないか見に行ってもらう（届いたら 今すぐ使う の札）
  function 版を見に行く() {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    navigator.serviceWorker.getRegistration().then(function (r) { if (r) return r.update(); }).catch(function () { /* 次の機会に */ });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') 版を見に行く(); });
  // 元なし（頼み203 殻22）: パソコンの入り口（Obsidian の右の窓など）は開きっぱなしで、画面に戻った合図も来にくい。古い版のまま止まらないように
  //   1) 30分ごと・窓に戻ったとき・電波が戻ったときにも、番頭さんに新しい版を見に行ってもらう
  //   2) 新しい版が届いたら、使っていないときに自分で開き直す（開いてすぐでまだ触っていない／画面が隠れた／10分さわっていない）
  //      使っているとき（マイク・声・音の出る動画が鳴っている・書きかけの字がある）は待つ。札は30秒出し、タップでも今すぐ使える
  var 最初から番頭 = !!(navigator.serviceWorker && navigator.serviceWorker.controller); // はじめて番頭さんが来た回は、配り元から取った新しい画面なので開き直さない
  var 新しい版が待っている = false, 触った = false, 最後に触った = Date.now(), 鳴らした = [];
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (n) { window.addEventListener(n, function () { 触った = true; 最後に触った = Date.now(); }, { capture: true, passive: true }); });
  (function () { var P = window.HTMLMediaElement && HTMLMediaElement.prototype; if (!P || !P.play) return; var 元 = P.play;
    try { P.play = function () { if (鳴らした.indexOf(this) < 0) { 鳴らした.push(this); if (鳴らした.length > 40) 鳴らした.shift(); } return 元.apply(this, arguments); }; } catch (e) { /* 見張れない端末は、隠れたときだけ開き直す */ } })();
  function 使っている() {
    try { var y = window.本館 && window.本館.様子 ? window.本館.様子() : null; if (y && ((y.マイク && y.マイク.持ち主) || (y.放送室 && (y.放送室.鳴っている || y.放送室.待ち)))) return 'マイクか声'; } catch (e) { /* 聞けなければ次へ */ }
    // 宿の曲（BGM）は待つ理由にしない: 曲はいつも流れていることが多く、待つと開きっぱなしの窓がずっと古いまま。開き直すと曲は頭から流れ直す
    if (鳴らした.some(function (a) { return !a.paused && !a.ended && !a.muted && !a.loop; })) return '音か動画'; // 音なし・くりかえしの動く絵（マスコットなど）は数えない
    var 欄 = document.querySelectorAll('textarea, input[type="text"], input[type="search"], input:not([type])');
    for (var i = 0; i < 欄.length; i++) if (String(欄[i].value || '').trim()) return '書きかけ（' + (欄[i].className || 欄[i].tagName) + '）';
    return false;
  }
  function 待っていたら開き直す(わけ) {
    if (!新しい版が待っている || 新しくしている || !最初から番頭) return false;
    var すぐ = わけ === '開いてすぐ' ? (!触った && performance.now() < 20000) : (わけ === '隠れた' ? document.visibilityState === 'hidden' : Date.now() - 最後に触った > 10 * 60000);
    if (!すぐ || 使っている()) return false;
    新しくしている = true; 閉じる前に(); setTimeout(function () { location.reload(); }, 200); return true;
  }
  setInterval(function () { 版を見に行く(); }, 30 * 60000);
  setInterval(function () { 待っていたら開き直す('さわっていない'); }, 60000);
  window.addEventListener('focus', 版を見に行く);
  window.addEventListener('online', 版を見に行く);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') 待っていたら開き直す('隠れた'); });
  function 帯(t, 色) { 帯の今 = { t: t, 色: 色 || '' }; if (!板) return; var b = 板.$('帯'); b.textContent = t; b.setAttribute('data-色', 色 || ''); }
  var 描く = {
    '掲示板': function (v) { var ul = 板.$('掲示板'); ul.textContent = ''; (v || []).forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); }); },
    '書庫': function (v) { var ul = 板.$('書庫'); ul.textContent = ''; (v || []).forEach(function (x) { var li = document.createElement('li'); var b = document.createElement('button'); b.textContent = x.題; b.onclick = function () { 本を開く(x.道); }; li.appendChild(b); ul.appendChild(li); }); }
  };
  function 区画を描く(名前, v) { if (板 && 描く[名前]) 描く[名前](v); }

  // ---- JSON の口へ（掲示板・書庫・装い。text/plain で送る: preflight が要らない）
  function APIを呼ぶ(塊, すること, データ) {
    if (!設定.鍵) return Promise.reject(new Error('鍵がまだない'));
    var ctl = new AbortController(); var tm = setTimeout(function () { ctl.abort(); }, 15000);
    return fetch(設定.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ 鍵: 設定.鍵, 塊: 塊, すること: すること, データ: データ, id: null }), signal: ctl.signal, redirect: 'follow' })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('サーバー ' + r.status); return r.text(); })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw new Error('口がまだ開いていない'); } if (j && j.まちがい) throw new Error(j.まちがい); return j; });
  }
  function 写しを出す() {
    return 箱P.then(function (箱) { return 箱.読む('写し', '今'); }).then(function (w) { 前の写し = (w && w.区画) || {}; 板を描き直す(); }).catch(function () { /* なし */ });
  }
  function 裏で読む() {
    if (!navigator.onLine) { 帯('電波なし（手もとの写しで動いているよ）', '黄'); return Promise.resolve(); }
    if (!設定.鍵) { 帯('掲示板の分は、鍵を入れると読むよ（本館はそのまま使える）', ''); return Promise.resolve(); }
    帯('裏で新しい分を読んでいるよ…', '');
    return APIを呼ぶ('根幹', '今', { 前: Object.keys(前の写し) }).then(function (r) {
      装いを受ける(r.装い);
      var 今 = r.区画 || {}; var 変わった = 手もとの箱.区画を比べる(前の写し, 今);
      前の写し = 今; if (変わった.length) 板を描き直す();
      帯('つながっている（描き直したのは ' + (変わった.join('・') || 'なし') + '）', '緑');
      return 箱P.then(function (箱) { return 箱.しまう('写し', '今', { 時刻: Date.now(), 区画: 今 }); });
    }).catch(function (e) { 帯('つながらなかった（' + (e.name === 'AbortError' ? '時間切れ' : e.message) + '）。手もとの写しのまま', '黄'); });
  }
  function 本を開く(道) {
    if (手もとの箱.隠すか('書庫', モード) || !板) return;
    var 出す = function (t) { if (板) 板.$('本').textContent = t || '（まだ端末にない。つながったら読むよ）'; };
    箱P.then(function (箱) {
      return 箱.読む('書庫', 道).then(function (b) {
        出す(b && b.本文);
        if (!navigator.onLine) return;
        return APIを呼ぶ('知識の書庫', '読む', { 道: 道, 版: b && b.版 }).then(function (r) {
          if (r.同じ) return;
          if (!r.本文) { if (!b) 出す('（' + (r.わけ || '読めなかった') + '）'); return; }
          出す(r.本文); return 箱.しまう('書庫', 道, { 本文: r.本文, 版: r.版, 時刻: Date.now() });
        });
      });
    }).catch(function () { /* 写しのまま */ });
  }
  // 宿がシークレットと言ったら、本館もシークレットにして開き直す（1回だけ。隠す側へだけ動かす）
  function 装いを受ける(m) {
    if (!m) return;
    try { localStorage.setItem('honkan-shell/モード', m); } catch (e) { /* なし */ }
    if (m === 'シークレット' && モード !== 'シークレット') {
      var 済 = ''; try { 済 = sessionStorage.getItem('honkan-shell/開き直した') || ''; } catch (e) { 済 = '1'; }
      if (済) return;
      try { sessionStorage.setItem('honkan-shell/開き直した', '1'); localStorage.setItem('本館/根幹/モード', JSON.stringify('シークレット')); } catch (e) { return; }
      location.reload();
    }
  }

  // ==== 殻の塊を登録して、本館を開く
  本館.塊を登録({
    名前: 'アプリ版', 版: 'v1', 頭: 'apb', 道具: ['席', '画面', '知らせ', 'モード', '掲示板'], 席: 'メニュー', 設定: [], 聞く: ['モード'], 出す: [], 見た目: 板の見た目
  }, function (d) {
    道具 = d; モード = d.モード.今();
    d.席.置く({ 名前: 'アプリ版', 絵: '📱', 分類: '設定', 押す: 板を開く });
    d.席.置く({ 名前: '宿を新しく', 絵: '🔄', 分類: '設定', 押す: 新しくする });
    d.席.置く({ 名前: '端末の鍵', 絵: '🔑', 分類: '設定', 押す: function () { この端末に鍵を作る(); } }); // 版73 頼み247 宿25
    d.掲示板.聞く('モード', function (x) { モード = (x && x.今) || d.モード.今(); 板を描き直す(); });
  });
  var 帳面 = (window.HONKAN_LEDGER || []).concat(['アプリ版: v1']);
  本館.開く(帳面, 殻の口);
  開くまで = Math.round(performance.now() - t0);
  橋.作る();
  // 版71 頼み241④（作業係I）: パソコンでもスマホと同じに、手もとの箱（写し・送り待ち・書庫）を「消さないでね」と頼んでおく。
  //   たとえ: 宿の棚に「預かり物・捨てないで」の札を貼る。ブラウザが場所に困っても、札のある棚は片づけない（断られても、今までどおり動く）
  try {
    if (navigator.storage && navigator.storage.persist) {
      保存の札.頼んだ = true;
      (navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)).then(function (済) { return 済 || navigator.storage.persist(); })
        .then(function (ok) { 保存の札.ずっと = !!ok; 板を描き直す(); }).catch(function () { 保存の札.ずっと = false; });
    }
  } catch (e) { /* 札がなくても動く */ }
  写しを出す().then(裏で読む);
  window.addEventListener('offline', function () { 帯('電波なし（手もとの写しで動いているよ）', '黄'); 板を描き直す(); });
  window.addEventListener('online', function () { 裏で読む(); 送り待ちを流す(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 番頭さんなしでも動く */ });
    navigator.serviceWorker.addEventListener('message', function (ev) { if (ev.data && ev.data.番頭 === '新しい版') { 番頭の版 = '新しい版（' + ev.data.版 + '）を覚えたよ。使っていないときに自分で開き直すね'; if (板) 板.$('版').textContent = 番頭の版;
      if (!新しくしている && navigator.serviceWorker.controller) { 新しい版が待っている = true; if (待っていたら開き直す('開いてすぐ')) return; var 見直し = setInterval(function () { if (performance.now() > 20000 || 待っていたら開き直す('開いてすぐ')) clearInterval(見直し); }, 1000); var 札 = 札を出す('宿の新しい版が届いたよ。タップで今すぐ使う（使っていないときは自分で新しくなるよ）', 30000); 札.style.cursor = 'pointer'; 札.onclick = function () { location.reload(); }; } } }); // 頼み203: 札は30秒（下の字を長くふさがない）。見のがしても、使っていないときに自分で開き直す
    navigator.serviceWorker.ready.then(版を見に行く).catch(function () { /* なし */ });
  }
  window.本館の殻 = {
    様子: function () { return { 橋: 橋.様子(), モード: モード, 写し: Object.keys(前の写し), 鍵: !!設定.鍵, 保存の札: 保存の札, 写しの数: 写しの数, 開くまで: 開くまで, 新しい版: { 待っている: 新しい版が待っている, 最初から番頭: 最初から番頭, 触った: 触った, 使っている: 使っている(), 鳴っている: 鳴らした.filter(function (a) { return !a.paused && !a.ended; }).map(function (a) { return String(a.currentSrc || a.src || '').split('/').pop().slice(0, 40) + (a.muted ? '（音なし）' : ''); }) } }; }, // 新しい版: 頼み203（元なし）
    送り待ちの数: function () { return 列P.then(function (列) { return 列.数(); }); }
  };
})();
