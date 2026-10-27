// ==UserScript==
// @name         PokeSurvivor Bot
// @namespace    https://github.com/damhieu2808/PokeSurvivorTool
// @version      1.5.12
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
  // Shown on the status line so a stale install (old script still on the phone) is obvious at a glance
  const V = '1.5.12';
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
    el.textContent = `PSBot v${V}: ${msg}`;
  };
  // pokesurvivor.com's Content-Security-Policy refuses scripts added to the page, so a Chromium phone (Kiwi) can never
  // inject one. Firefox userscripts do not inject a script at all: see the "Firefox" branch below
  const BLOCKED = 'trình duyệt này chặn script chèn vào trang — Android: cài Firefox + Violentmonkey/Tampermonkey; PC: extension Chrome';
  status('đang tải…');

  // One fetch path for every manager: GM_xmlhttpRequest (privileged, no CORS / CSP) or plain fetch
  const get = f => new Promise((ok, fail) => {
    const url = `${BASE}${f}?t=${Date.now()}`;
    if (typeof GM_xmlhttpRequest === 'function') return void GM_xmlhttpRequest({
      method: 'GET', url, timeout: 20000,
      onload: r => (r.status === 200 ? ok(r.responseText) : fail(new Error(`${f}: HTTP ${r.status}`))),
      onerror: r => fail(new Error(`${f}: ${(r && r.error) || 'lỗi mạng hoặc chưa cho phép Tampermonkey truy cập raw.githubusercontent.com'}`)),
      ontimeout: () => fail(new Error(`${f}: hết thời gian chờ`)),
    });
    fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.text() : Promise.reject(new Error(`${f}: HTTP ${r.status}`)))).then(ok, fail);
  });

  // ---------- Firefox (Gecko): run the bot with the userscript manager's privileges ----------
  // A Firefox userscript runs in a sandbox, but it can reach the page's own window through unsafeWindow /
  // wrappedJSObject, and the page's CSP does not govern code run under the manager's privileges (no <script> is added
  // to the page). `with (page)` makes every bare global in the fetched files — window, document,
  // CanvasRenderingContext2D, XMLHttpRequest, firebase, … — the page's own object, so bot.js hooks the game's canvas
  // and sends its keys exactly as the PC extension does. This is the only mobile route for pokesurvivor.com: a
  // Chromium phone has no such bridge (isolated world), and its managers have to add a <script>, which the CSP blocks.
  // Gecko = Firefox / Firefox for Android; Chromium phones send "Chrome/" and skip this.
  const gecko = /Gecko\//.test(navigator.userAgent) && !/Chrome\/|Chromium\/|CriOS\//.test(navigator.userAgent);
  const pageWindow = (() => {
    if (!gecko) return null;
    for (const find of [() => unsafeWindow, () => wrappedJSObject, () => window.wrappedJSObject]) {
      try { const w = find(); if (w && w.document) return w; } catch {}
    }
    return null;
  })();
  if (pageWindow) {
    Promise.all(FILES.map(get)).then(code => {
      const body = code.join('\n;\n');
      // The page-realm path runs everything at once and reports "psbot/page.js:1234": turn that line into a file name
      const starts = code.map((_, i) => 1 + code.slice(0, i).reduce((n, c) => n + c.split('\n').length + 2, 0));
      const report = e => {
        const m = /psbot\/page\.js:(\d+)/.exec(String((e && e.stack) || ''));
        const at = m ? FILES.reduce((f, _, i) => (starts[i] <= +m[1] ? FILES[i] : f), '') : '';
        return `${(e && e.message) || e}${at ? ` (${at})` : ''}`;
      };
      // Preferred: run inside the page's own realm, exactly like the extension does on a PC. No object crosses the
      // sandbox/page boundary, so none of the realm errors (Intl options / sequence<> arguments: "Permission denied
      // to access property …") can happen. Firefox keys the CSP eval check on the caller's principal, and a userscript
      // is privileged, so the page's own script-src does not apply — if a build does refuse it, we fall back below.
      let inPage = false;
      if (typeof pageWindow.eval === 'function') {
        try { pageWindow.eval(`${body}\n//# sourceURL=psbot/page.js`); inPage = true; }
        // site.js already ran → the failure is in the bot itself, not the CSP: report it instead of running twice
        catch (e) { if (pageWindow.PSBotSite) return status(`lỗi — ${report(e)}`); }
      }
      if (!inPage) {
        // Sandbox fallback: `with (pageWindow)` gives each file the page's own globals (document, canvas prototypes,
        // keys, firebase), and new Function bodies are non-strict so `with` is allowed. Files run one at a time, like
        // separate <script> tags, so a failure is reported with its exact file and line.
        // The flag keeps bot.js from handing the page's Blob/Worker an array built in the sandbox (Firefox:
        // "Permission denied to access property Symbol.iterator"); blob: is CSP-blocked on this site anyway.
        pageWindow.__psbotSandbox = true;
        for (let i = 0; i < code.length; i++) {
          try { new Function('W', `with (W) {\n${code[i]}\n}\n//# sourceURL=psbot/${FILES[i]}`)(pageWindow); }
          catch (e) {
            const at = new RegExp(`psbot/${FILES[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\d+`).exec(String((e && e.stack) || ''));
            return status(`lỗi — ${(e && e.message) || e} (${at ? at[0] : FILES[i]})`);
          }
        }
      }
      // site.js sets PSBotSite; when that fails the page really is blocking us (or the manager hides the page window)
      if (!pageWindow.PSBotSite) return status(BLOCKED);
      status('đã tải, chờ game…');
    }).catch(e => { status(`lỗi — ${e.message}`); console.warn('[PSBot] không chạy được trong trang', e); });
    return;
  }

  // ---------- Chrome / Chromium desktop: GM_addElement injects through the extension API, past the page's CSP ----------
  // Tampermonkey: fetched through the manager and added with GM_addElement; the bot runs in the page itself
  if (typeof GM_xmlhttpRequest === 'function' && typeof GM_addElement === 'function') {
    Promise.all(FILES.map(get))
      .then(code => {
        code.forEach((c, i) => GM_addElement('script', { textContent: `${c}\n//# sourceURL=psbot/${FILES[i]}` }));
        // The page's window (this script runs sandboxed); bot.js removes the line itself once its panel is up
        const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (!page.PSBotSite) status(BLOCKED);
        else if (document.getElementById('psbot-status')) status('đã tải, chờ game…');
      })
      .catch(e => { status(`lỗi tải — ${e.message}`); console.warn('[PSBot] không tải được bot', e); });
    return;
  }
  // Other managers: loader.js in an inline <script> (only where the page has no CSP, e.g. doofcraft)
  fetch(`${BASE}loader.js?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.text())
    .then(t => {
      const s = document.createElement('script'); s.textContent = t; document.body.append(s); s.remove();
      setTimeout(() => { if (!window.PSBotSite && !document.querySelector('[data-psbot-ctl]') && document.getElementById('psbot-status')) status(BLOCKED); }, 8000);
    })
    .catch(e => { status(`lỗi tải — ${e.message}`); console.warn('[PSBot] không tải được loader', e); });
})();
