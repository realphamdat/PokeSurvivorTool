// PokeSurvivor Bot loader (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// For browsers without Chrome extensions (Android / iOS): a bookmarklet runs this on pokesurvivor.com (or pokesurvivor.doofcraft.com),
// it fetches the released files from the original repo and runs them in the same order as manifest.json.
// This runs in the page's own context, so it is blocked by pokesurvivor.com's CSP (script-src 'self') and only works
// on doofcraft. Android userscript installs go through psbot.user.js instead, which has a Firefox branch for that.
(async () => {
  // Stays at the repo root, on main as well as release: userscripts / bookmarklets installed earlier fetch it from main.
  // The bot files themselves come from the "release" branch (main = work in progress)
  const site = /doofcraft/i.test(location.hostname) ? 'doofcraft' : 'default';
  // moves.js is pokesurvivor.com's table; doofcraft reads its own from the game (SITE.moveTable, since 1.7.10)
  const FILES = [`sites/${site}/site.js`, `sites/${site}/data.js`, ...(site === 'default' ? ['core/moves.js'] : []), 'core/bot.js', 'core/farmMoney.js'];
  const SOURCES = [
    f => `https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/${f}?t=${Date.now()}`,
    f => `https://cdn.jsdelivr.net/gh/damhieu2808/PokeSurvivorTool@release/${f}`,
  ];
  const get = async f => {
    for (const src of SOURCES) {
      try { const r = await fetch(src(f), { cache: 'no-store' }); if (r.ok) return await r.text(); } catch {}
    }
    throw new Error(`không tải được ${f}`);
  };
  try {
    const code = await Promise.all(FILES.map(get));
    // Inline <script> runs in the page itself, like the extension's "world": "MAIN"
    code.forEach((c, i) => { const s = document.createElement('script'); s.textContent = `${c}\n//# sourceURL=psbot/${FILES[i]}`; document.body.append(s); s.remove(); });
  } catch (e) {
    alert(`[PSBot] ${e.message} — kiểm tra mạng rồi thử lại`);
  }
})();
