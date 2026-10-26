// ==UserScript==
// @name         PokeSurvivor Bot
// @namespace    https://github.com/damhieu2808/PokeSurvivorTool
// @version      1.2.0
// @description  Bot tự chơi pokesurvivor.com + pokesurvivor.doofcraft.com — luôn tải bản phát hành mới nhất từ repo gốc
// @author       damhieu2808
// @homepageURL  https://github.com/damhieu2808/PokeSurvivorTool
// @license      MIT
// @match        https://pokesurvivor.com/*
// @match        https://pokesurvivor.doofcraft.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
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
  // Tampermonkey: fetched through the manager and added with GM_addElement, which the page's Content-Security-Policy
  // can't block (an inline <script> may be refused); the bot runs in the page itself either way
  if (typeof GM_xmlhttpRequest === 'function' && typeof GM_addElement === 'function') {
    const get = f => new Promise((ok, fail) => GM_xmlhttpRequest({
      method: 'GET', url: `${BASE}${f}?t=${Date.now()}`,
      onload: r => (r.status === 200 ? ok(r.responseText) : fail(new Error(`${f}: ${r.status}`))),
      onerror: () => fail(new Error(f)),
    }));
    Promise.all(FILES.map(get))
      .then(code => code.forEach((c, i) => GM_addElement('script', { textContent: `${c}\n//# sourceURL=psbot/${FILES[i]}` })))
      .catch(e => console.warn('[PSBot] không tải được bot', e));
    return;
  }
  // Other managers: loader.js in an inline <script>
  fetch(`${BASE}loader.js?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.text())
    .then(t => { const s = document.createElement('script'); s.textContent = t; document.body.append(s); s.remove(); })
    .catch(e => console.warn('[PSBot] không tải được loader', e));
})();
