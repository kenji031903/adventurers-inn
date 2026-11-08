/**
 * 手もとの箱（PWA試作・2026-11-08 作業係T）
 * スマホの中にしまう箱と、送り待ちの列と、前回の写しのくらべ（変わった区画だけ描き直す）。
 * ブラウザでは IndexedDB、node の試しでは「メモリの箱」で同じように動く。
 *
 * - 箱を開く(名前) … {読む(棚, 鍵), しまう(棚, 鍵, 値), 消す(棚, 鍵), 全部(棚)} の Promise
 *   棚: '写し'（前回の画面のデータ・区画ごと）/ '送り待ち'（電波がないときの言葉）/ '書庫'（書庫の本文。スマホの中だけ）
 * - 送り待ちの列(箱, 送る) … 足す(塊, すること, データ) で列へ入れ、流す() で古い順に送る。
 *   id は足したときに1回だけ決める。サーバーは同じ id を2回受けたら2回目を「もう受けた」で返す（二重に送らない）
 * - 区画を比べる(前, 今) … 変わった区画の名前の配列（描き直すのはそこだけ）
 */
(function (root) {
  'use strict';
  var 棚の名前 = ['写し', '送り待ち', '書庫'];

  function メモリの箱() {
    var m = {}; 棚の名前.forEach(function (t) { m[t] = new Map(); });
    return Promise.resolve({
      読む: function (t, k) { return Promise.resolve(m[t].has(k) ? JSON.parse(JSON.stringify(m[t].get(k))) : null); },
      しまう: function (t, k, v) { m[t].set(k, JSON.parse(JSON.stringify(v))); return Promise.resolve(); },
      消す: function (t, k) { m[t].delete(k); return Promise.resolve(); },
      全部: function (t) { return Promise.resolve(Array.from(m[t].values()).map(function (v) { return JSON.parse(JSON.stringify(v)); })); }
    });
  }

  function 箱を開く(名前) {
    if (typeof indexedDB === 'undefined') return メモリの箱();
    return new Promise(function (ok, ng) {
      var r = indexedDB.open(名前 || 'honkan-tenomoto', 1);
      r.onupgradeneeded = function () { 棚の名前.forEach(function (t) { if (!r.result.objectStoreNames.contains(t)) r.result.createObjectStore(t); }); };
      r.onerror = function () { ng(r.error); };
      r.onsuccess = function () {
        var db = r.result;
        function 道(t, mode, f) {
          return new Promise(function (ok2, ng2) {
            var tx = db.transaction(t, mode), s = tx.objectStore(t), q = f(s);
            tx.oncomplete = function () { ok2(q && 'result' in q ? q.result : undefined); };
            tx.onerror = function () { ng2(tx.error); }; tx.onabort = function () { ng2(tx.error); };
          });
        }
        ok({
          読む: function (t, k) { return 道(t, 'readonly', function (s) { return s.get(k); }).then(function (v) { return v == null ? null : v; }); },
          しまう: function (t, k, v) { return 道(t, 'readwrite', function (s) { return s.put(v, k); }).then(function () {}); },
          消す: function (t, k) { return 道(t, 'readwrite', function (s) { return s.delete(k); }).then(function () {}); },
          全部: function (t) { return 道(t, 'readonly', function (s) { return s.getAll(); }); }
        });
      };
    });
  }

  function 新しいid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // 送る(手紙) は {受けた: true} か {もう受けた: true} を返す Promise。投げたら（電波なし・サーバーの不調）列に残す
  function 送り待ちの列(箱, 送る, 時計) {
    var 流し中 = null, 今 = 時計 || function () { return Date.now(); };
    function 足す(塊, すること, データ) {
      var 手紙 = { id: 新しいid(), 塊: 塊, すること: すること, データ: データ, 作った: 今(), 回数: 0 };
      return 箱.しまう('送り待ち', 手紙.id, 手紙).then(function () { return 手紙; });
    }
    function 流す() {
      if (流し中) return 流し中; // 2つ同時に流さない（オンラインの知らせが続けて来ても二重にしない）
      var 送れた = 0;
      流し中 = 箱.全部('送り待ち').then(function (列) {
        列 = 列.filter(function (x) { return !x.止めた; }).sort(function (a, b) { return a.作った - b.作った; });
        var i = 0;
        function 次() {
          if (i >= 列.length) return { 送れた: 送れた, 残り: 0 };
          var 手紙 = 列[i];
          return Promise.resolve().then(function () { return 送る(手紙); }).then(function (r) {
            if (r && r.はじいた) { // その手紙だけの、送り直しても直らないまちがい（形がちがう など）→ 脇へよけて、うしろを詰まらせない
              手紙.止めた = String(r.はじいた); i++;
              return 箱.しまう('送り待ち', 手紙.id, 手紙).then(次);
            }
            if (!r || !(r.受けた || r.もう受けた)) throw new Error('返事の形がちがう');
            送れた++; i++;
            return 箱.消す('送り待ち', 手紙.id).then(次);
          }, function () {
            手紙.回数++; // 順番を守るため、1通止まったらそこで止める（次の機会に、同じ id のまま送り直す）
            return 箱.しまう('送り待ち', 手紙.id, 手紙).then(function () { return { 送れた: 送れた, 残り: 列.length - i }; });
          });
        }
        return 次();
      }).then(function (r) { 流し中 = null; return r; }, function (e) { 流し中 = null; throw e; });
      return 流し中;
    }
    function 数() { return 箱.全部('送り待ち').then(function (l) { return l.filter(function (x) { return !x.止めた; }).length; }); }
    function 止まった() { return 箱.全部('送り待ち').then(function (l) { return l.filter(function (x) { return x.止めた; }); }); } // 消さずに残し、画面で見せる
    return { 足す: 足す, 流す: 流す, 数: 数, 止まった: 止まった };
  }

  function 区画を比べる(前, 今) {
    前 = 前 || {}; 今 = 今 || {};
    var 名前 = {}; Object.keys(前).concat(Object.keys(今)).forEach(function (k) { 名前[k] = 1; });
    return Object.keys(名前).filter(function (k) { return JSON.stringify(前[k]) !== JSON.stringify(今[k]); });
  }

  // シークレットと、装いを知らないときは、いつも出す区画のほかは全部隠す（出してよいものの名簿。区画が増えても、名簿に足すまでは隠れる）
  // いつもの服で止まるのは服と動きだけ（宿のコアの止める表）なので、区画は隠さない
  var いつも出す = ['掲示板'];
  function 隠すか(区画, モード) {
    if (モード === 'ふだん' || モード === 'いつもの服') return false;
    return いつも出す.indexOf(区画) < 0; // シークレット・知らない装い・まだ知らせが来ていない → 隠す側
  }

  var 出す = { 箱を開く: 箱を開く, メモリの箱: メモリの箱, 送り待ちの列: 送り待ちの列, 区画を比べる: 区画を比べる, 隠すか: 隠すか };
  if (typeof module !== 'undefined' && module.exports) module.exports = 出す; else root.手もとの箱 = 出す;
})(typeof self !== 'undefined' ? self : this);
