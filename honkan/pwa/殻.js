/**
 * 本館の殻（PWA・2026-11-08 作業係T）
 * けんじ「アプリ開いたらすぐ出て、その間にウェブの分をロードすれば、スムーズに感じるかも！」が芯。
 * 1. 開いたら、手もとの箱の「前回の写し」をすぐ描く（電波を待たない）
 * 2. 裏で JSON の口に「今」を聞き、変わった区画だけ描き直して、写しをしまい直す
 * 3. 書庫の本文はスマホの手もとの箱だけ（公開の置き場には置かない）。シークレットと、装いを知らないときは隠す
 * 4. 鍵はこのスマホの localStorage だけ（⚙️ の欄か、#鍵=… の付いた URL を1回開く。URL の印はすぐ消す）
 * まだ: 送り待ち（チャット・郵便箱）は移す順番の4で足す（手もとの箱.js に列はある）
 */
(function () {
  'use strict';
  var 設定 = { API: 'https://script.google.com/macros/s/AKfycbxYLTt4rW874cOe9fReXd-GO3NuACL07eBIiEW2XL6VKWusxZy8Boz-bEhydjR9RAtAMw/exec', 本番の宿: '../', 鍵: '' };
  function 設定を読む() { try { var s = JSON.parse(localStorage.getItem('honkan-shell/設定') || '{}'); Object.keys(s).forEach(function (k) { if (s[k]) 設定[k] = s[k]; }); } catch (e) { /* なし */ } }
  function 鍵をしまう(k) {
    var s = {}; try { s = JSON.parse(localStorage.getItem('honkan-shell/設定') || '{}'); } catch (e) { s = {}; }
    s.鍵 = k; 設定.鍵 = k;
    try { localStorage.setItem('honkan-shell/設定', JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  設定を読む();
  // #鍵=… で来たら、しまってから URL の印を消す（履歴にも残さない）
  var h = /^#鍵=(.+)$/.exec(decodeURIComponent(location.hash || ''));
  if (h) { 鍵をしまう(h[1].trim()); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* なし */ } }

  var t0 = performance.now();
  var 箱, 前の写し = {}, モード = null;
  try { モード = localStorage.getItem('honkan-shell/モード'); } catch (e) { /* なし */ }
  // ?mode= は隠す側（シークレット）へだけ変えられる
  var qm = new URLSearchParams(location.search).get('mode');
  if (qm === 'シークレット') モード = qm;

  function $(id) { return document.getElementById(id); }
  function 字(el, t) { el.textContent = t; }
  function 帯(t, 色) { var b = $('帯'); 字(b, t); b.setAttribute('data-色', 色 || ''); }
  function 鍵の様子() { 字($('鍵の様子'), 設定.鍵 ? 'しまってある' : 'まだない（⚙️ で入れてね）'); }

  // ---- 区画ごとの描き方（変わった区画だけ呼ぶ）
  var 描く = {
    '掲示板': function (v) { var ul = $('掲示板'); ul.textContent = ''; (v || []).forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); }); },
    '書庫': function (v) { var ul = $('書庫'); ul.textContent = ''; (v || []).forEach(function (x) { var li = document.createElement('li'); var b = document.createElement('button'); b.textContent = x.題; b.onclick = function () { 本を開く(x.道); }; li.appendChild(b); ul.appendChild(li); }); }
  };
  var 描いた回数 = {};
  function 区画を描く(名前, v) { if (!描く[名前]) return; 描いた回数[名前] = (描いた回数[名前] || 0) + 1; 描く[名前](v); }
  function 隠しを当てる() {
    document.querySelectorAll('[data-区画]').forEach(function (el) { el.hidden = 手もとの箱.隠すか(el.getAttribute('data-区画'), モード); });
    字($('モード'), モード || '（まだ宿から聞いていない → 掲示板のほかは隠す）');
    if (手もとの箱.隠すか('書庫', モード)) 字($('本'), '');
  }
  function 装いを受ける(m) {
    if (!m || m === モード) return;
    モード = m; try { localStorage.setItem('honkan-shell/モード', m); } catch (e) { /* なし */ }
    隠しを当てる();
  }

  // ---- JSON の口へ（text/plain で送る: よその場所からでも前の確かめ=preflight が要らない）
  function APIを呼ぶ(塊, すること, データ) {
    if (!設定.鍵) return Promise.reject(new Error('鍵がまだない。⚙️ で入れてね'));
    var ctl = new AbortController(); var tm = setTimeout(function () { ctl.abort(); }, 15000);
    return fetch(設定.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ 鍵: 設定.鍵, 塊: 塊, すること: すること, データ: データ, id: null }), signal: ctl.signal, redirect: 'follow' })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('サーバー ' + r.status); return r.text(); })
      .then(function (t) { var j; try { j = JSON.parse(t); } catch (e) { throw new Error('口がまだ開いていない'); } if (j && j.まちがい) throw new Error(j.まちがい); return j; });
  }

  // ---- 1. 前回の写しをすぐ出す
  function 写しを出す() {
    return 箱.読む('写し', '今').then(function (w) {
      前の写し = (w && w.区画) || {};
      Object.keys(前の写し).forEach(function (k) { 区画を描く(k, 前の写し[k]); });
      隠しを当てる();
      var ms = Math.round(performance.now() - t0);
      字($('速さ'), w ? '前回の写しを ' + ms + 'ms で出した（' + new Date(w.時刻).toLocaleString('ja-JP') + ' の分）' : 'はじめて開いた（写しはまだない）');
    });
  }
  // ---- 2. 裏で今を聞いて、変わった区画だけ描き直す
  function 裏で読む() {
    if (!navigator.onLine) { 帯('電波なし（手もとの写しで動いているよ）', '黄'); return Promise.resolve(); }
    帯('裏で新しい分を読んでいるよ…', '');
    return APIを呼ぶ('根幹', '今', { 前: Object.keys(前の写し) }).then(function (r) {
      装いを受ける(r.装い);
      var 今 = r.区画 || {}; var 変わった = 手もとの箱.区画を比べる(前の写し, 今);
      変わった.forEach(function (k) { 区画を描く(k, 今[k]); });
      隠しを当てる();
      前の写し = 今;
      帯('つながっている（描き直したのは ' + (変わった.join('・') || 'なし') + '）', '緑');
      return 箱.しまう('写し', '今', { 時刻: Date.now(), 区画: 今 });
    }).catch(function (e) { 帯('つながらなかった（' + (e.name === 'AbortError' ? '時間切れ' : e.message) + '）。手もとの写しのまま', '黄'); });
  }
  // ---- 3. 書庫（本文は手もとの箱だけ）
  function 本を開く(道) {
    if (手もとの箱.隠すか('書庫', モード)) return;
    var 出す = function (t) { 字($('本'), t || '（まだスマホにない。つながったら読むよ）'); };
    箱.読む('書庫', 道).then(function (b) {
      出す(b && b.本文);
      if (!navigator.onLine) return;
      APIを呼ぶ('知識の書庫', '読む', { 道: 道, 版: b && b.版 }).then(function (r) {
        if (r.同じ) return; // 変わっていなければ描き直さない
        if (!r.本文) { if (!b) 出す('（' + (r.わけ || '読めなかった') + '）'); return; }
        出す(r.本文); return 箱.しまう('書庫', 道, { 本文: r.本文, 版: r.版, 時刻: Date.now() });
      }).catch(function () { /* 写しのまま */ });
    });
  }

  function 始める() {
    鍵の様子();
    手もとの箱.箱を開く('honkan-tenomoto').then(function (b) { 箱 = b; return 写しを出す(); }).then(裏で読む);
    $('本番').onclick = function () {
      if (!navigator.onLine) { 帯('宿の本番はつながっているときだけ開くよ', '黄'); return; }
      location.href = 設定.本番の宿;
    };
    $('鍵をしまう').onclick = function () {
      var k = $('鍵の欄').value.trim(); $('鍵の欄').value = '';
      if (k.length < 32) { 字($('鍵の様子'), '短すぎるよ（パソコンで作った鍵をそのまま）'); return; }
      鍵をしまう(k); 鍵の様子(); 裏で読む();
    };
    window.addEventListener('online', 裏で読む);
    window.addEventListener('offline', function () { 帯('電波なし（手もとの写しで動いているよ）', '黄'); });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 番頭さんなしでも動く */ });
      navigator.serviceWorker.addEventListener('message', function (ev) { if (ev.data && ev.data.番頭 === '新しい版') 字($('版'), '新しい版（' + ev.data.版 + '）を覚えたよ。次に開いたときから使うね'); });
    }
  }
  window.本館の殻 = { 様子: function () { return { 描いた回数: 描いた回数, モード: モード, 写し: Object.keys(前の写し), 鍵: !!設定.鍵 }; } };
  始める();
})();
