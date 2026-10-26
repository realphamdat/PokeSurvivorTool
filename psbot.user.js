// ==UserScript==
// @name         PokeSurvivor Bot
// @namespace    https://github.com/damhieu2808/PokeSurvivorTool
// @version      1.4.0
// @description  Bot tự chơi pokesurvivor.com + pokesurvivor.doofcraft.com — luôn tải bản phát hành mới nhất từ repo gốc
// @author       damhieu2808
// @homepageURL  https://github.com/damhieu2808/PokeSurvivorTool
// @license      MIT
// @match        https://pokesurvivor.com/*
// @match        https://pokesurvivor.doofcraft.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==
// Installs once (Tampermonkey / Userscripts app), then keeps the bot from the original repo's "release" branch.
// pokesurvivor.com has a <meta> Content-Security-Policy refusing scripts added to the page, which phone Tampermonkey
// can't get round. A <meta> policy only applies once the page has parsed it, so the bot is added at document-start
// from the copy saved last time, and the latest release is fetched in the background for the next visit (first visit:
// fetch, save, reload once).
(() => {
  const BASE = 'https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/';
  // Same files, same order as manifest.json / loader.js
  const site = /doofcraft/i.test(location.hostname) ? 'doofcraft' : 'default';
  const FILES = [`sites/${site}/site.js`, `sites/${site}/data.js`, 'core/moves.js', 'core/bot.js', 'core/farmMoney.js'];
  const KEY = `bot:${site}`;
  const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  // A line on screen until the bot's panel replaces it (bot.js removes #psbot-status): phones have no console
  const status = msg => {
    let el = document.getElementById('psbot-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'psbot-status';
      el.style.cssText = 'position:fixed;left:4px;top:4px;z-index:2147483647;max-width:90vw;font:12px monospace;background:#000c;color:#fc3;padding:3px 6px;border-radius:4px;pointer-events:none';
      document.documentElement.append(el);
    }
    el.textContent = `PSBot: ${msg}`;
  };
  // GM_addElement where the manager has it (it also gets round header policies), else a plain inline <script>
  const inject = code => code.forEach((c, i) => {
    const text = `${c}\n//# sourceURL=psbot/${FILES[i]}`;
    if (typeof GM_addElement === 'function') GM_addElement('script', { textContent: text });
    else { const s = document.createElement('script'); s.textContent = text; document.documentElement.append(s); s.remove(); }
  });
  const ran = () => !!page.PSBotSite;
  // At document-start even <html> may not exist yet: run as soon as it does (still before <head>'s policy is read)
  const whenRoot = fn => (document.documentElement ? fn()
    : new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); fn(); } }).observe(document, { childList: true }));

  const saved = typeof GM_getValue === 'function' ? GM_getValue(KEY, null) : null;
  whenRoot(() => {
    if (saved && saved.length === FILES.length) {
      inject(saved);
      if (!ran()) status('đã tải nhưng trang không chạy được code bot');
    } else status('đang tải lần đầu…');
  });

  const get = f => new Promise((ok, fail) => {
    const url = `${BASE}${f}?t=${Date.now()}`;
    if (typeof GM_xmlhttpRequest !== 'function') {
      fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.text() : Promise.reject(new Error(`${f}: HTTP ${r.status}`)))).then(ok, fail);
      return;
    }
    GM_xmlhttpRequest({
      method: 'GET', url, timeout: 20000,
      onload: r => (r.status === 200 ? ok(r.responseText) : fail(new Error(`${f}: HTTP ${r.status}`))),
      onerror: r => fail(new Error(`${f}: ${(r && r.error) || 'lỗi mạng hoặc chưa cho phép Tampermonkey truy cập raw.githubusercontent.com'}`)),
      ontimeout: () => fail(new Error(`${f}: hết thời gian chờ`)),
    });
  });
  Promise.all(FILES.map(get)).then(code => {
    if (typeof GM_setValue === 'function' && (!saved || saved.join('\n') !== code.join('\n'))) GM_setValue(KEY, code);
    if (saved) return;                                                // running already; the new copy is for next time
    inject(code);                                                     // first visit: works where no policy refuses it
    if (!ran()) status('đã tải bot — tải lại trang một lần để bot chạy');
    else if (document.getElementById('psbot-status')) status('đã tải, chờ game…');
  }).catch(e => { if (!saved) status(`lỗi tải — ${e.message}`); console.warn('[PSBot] không tải được bot', e); });
})();
