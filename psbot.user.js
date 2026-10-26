// ==UserScript==
// @name         PokeSurvivor Bot
// @namespace    https://github.com/damhieu2808/PokeSurvivorTool
// @version      1.3.0
// @description  Bot tự chơi pokesurvivor.com + pokesurvivor.doofcraft.com — luôn tải bản phát hành mới nhất từ repo gốc
// @author       damhieu2808
// @homepageURL  https://github.com/damhieu2808/PokeSurvivorTool
// @license      MIT
// @match        https://pokesurvivor.com/*
// @match        https://pokesurvivor.doofcraft.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==
// Installs once (Tampermonkey / Userscripts app), then on every visit fetches the bot from the original repo's
// "release" branch, so released updates to the bot never need a reinstall.
(() => {
  const BASE = 'https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/';
  // Same files, same order as manifest.json / loader.js
  const site = /doofcraft/i.test(location.hostname) ? 'doofcraft' : 'default';
  const FILES = [`sites/${site}/site.js`, `sites/${site}/data.js`, 'core/moves.js', 'core/bot.js', 'core/farmMoney.js'];
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
  status('đang tải…');
  // Tampermonkey: fetched through the manager and added with GM_addElement, which the page's Content-Security-Policy
  // can't block (an inline <script> may be refused); the bot runs in the page itself either way
  if (typeof GM_xmlhttpRequest === 'function' && typeof GM_addElement === 'function') {
    const get = f => new Promise((ok, fail) => GM_xmlhttpRequest({
      method: 'GET', url: `${BASE}${f}?t=${Date.now()}`, timeout: 20000,
      onload: r => (r.status === 200 ? ok(r.responseText) : fail(new Error(`${f}: HTTP ${r.status}`))),
      onerror: r => fail(new Error(`${f}: ${(r && r.error) || 'bị chặn — cho phép Tampermonkey truy cập raw.githubusercontent.com'}`)),
      ontimeout: () => fail(new Error(`${f}: hết thời gian chờ`)),
    }));
    Promise.all(FILES.map(get))
      .then(code => {
        code.forEach((c, i) => GM_addElement('script', { textContent: `${c}\n//# sourceURL=psbot/${FILES[i]}` }));
        // The page's window (this script runs sandboxed); bot.js removes the line itself once its panel is up
        const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (!page.PSBotSite) status('đã tải nhưng trang không chạy được code bot');
        else if (document.getElementById('psbot-status')) status('đã tải, chờ game…');
      })
      .catch(e => { status(`lỗi tải — ${e.message}`); console.warn('[PSBot] không tải được bot', e); });
    return;
  }
  // Other managers: loader.js in an inline <script>
  fetch(`${BASE}loader.js?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.text())
    .then(t => { const s = document.createElement('script'); s.textContent = t; document.body.append(s); s.remove(); })
    .catch(e => console.warn('[PSBot] không tải được loader', e));
})();
