// PokeSurvivor coin-farming preset. Paste into the DevTools Console AFTER bot.js.
// Plays real runs, tuned for Pokécoins per hour, and tracks coins from each "You fell" screen.
// Run results are summed in localStorage ("psbot.farm"). PSFarm.stats() = per-run table, PSFarm.reset() = clear.
//
// Coins (end-of-run screen): Time + Defeated + Bosses + collected pickups, × Fortune.
// Every term grows with the time survived, so held items are ranked for survival (core itemScores), not Amulet Coin.
(function start(tries = 0) {
  // bot.js may still be waiting for the game canvas (extension load): retry for a while
  if (!window.PSBot) {
    if (tries < 120) return void setTimeout(() => start(tries + 1), 500);
    console.warn('[PSFarm] chạy bot.js trước'); return;
  }
  if (window.PSFarm) window.PSFarm.unload();
  const { CFG } = window.PSBot;
  const log = (...a) => console.log('%c[PSFarm]', 'color:#fc3', ...a);

  // ---------- bot tuning ----------
  Object.assign(CFG, {
    goodRange: 2500, goodWeight: 7,     // chase every pickup on screen (tag coin drops as "Tốt" in F6)
    xpRange: 1400,                      // more levels = longer runs = more kills/bosses
    autoRestart: true,
    // Level-up: prefer pickup radius / XP / coin passives
    bonusRe: /magnet|pickup|pick-up|attract|radius|coin|fortune|luck|experience|\bxp\b|exp\b|imán|monedas|suerte/i,
    bonusScore: 4,
  });

  // ---------- coin tracking ----------
  const KEY = 'psbot.farm';
  let data = { runs: [], since: Date.now() };
  try { data = JSON.parse(localStorage.getItem(KEY)) || data; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

  const num = s => +String(s || '0').replace(/[^\d]/g, '') || 0;
  const visible = el => el.getClientRects().length > 0;
  let onScreen = false;
  function scan() {
    const head = PSBotList(document.querySelectorAll('body *')).find(e => !e.children.length && visible(e) && /you fell|run over|game over|has caído/i.test(e.innerText || ''));
    if (!head) { onScreen = false; return; }
    if (onScreen) return;                                         // already counted this screen
    let box = head;
    while (box.parentElement && !/coins/i.test(box.innerText)) box = box.parentElement;
    const t = box.innerText.replace(/\s+/g, ' ');
    const coins = num((t.match(/coins earned\s*\+?\s*([\d.,]+)/i) || [])[1]);
    if (!coins) return;                                           // numbers may still be animating in
    onScreen = true;
    const run = {
      at: Date.now(), coins,
      time: (t.match(/time\s*(\d+:\d\d)/i) || [])[1] || '',
      kills: num((t.match(/defeated\s*(\d+)/i) || [])[1]),
      bosses: num((t.match(/bosses\s*(\d+)/i) || [])[1]),
      level: num((t.match(/level\s*(\d+)/i) || [])[1]),
      v: window.PSBot.version,                                    // bot version, to compare survival across releases
    };
    data.runs.push(run); save();
    log(`trận ${data.runs.length}: +${coins} xu (${run.time}, ${run.kills} quái, ${run.bosses} boss) · tổng ${total()}`);
  }
  const total = () => data.runs.reduce((a, r) => a + r.coins, 0);
  const perHour = () => {
    const h = (Date.now() - data.since) / 3600000;
    return h > 0.01 ? Math.round(total() / h) : 0;
  };

  // ---------- HUD (a line in bot.js's control panel, top-left; own corner box if there is none) ----------
  const hud = document.createElement('div');
  if (window.PSBot.ctl) {
    hud.style.cssText = 'color:#f5c542;border-top:1px solid #2e3646;padding:7px 12px;font-size:12px;white-space:pre-line';
    window.PSBot.ctl.append(hud);
  } else {
    hud.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:99999;font:12px monospace;background:#000b;color:#fc3;padding:4px 6px;border-radius:4px;pointer-events:none';
    document.body.append(hud);
  }
  // Survival over the last 10 runs of this bot version (older runs ran other code)
  const secs = s => { const m = /^(\d+):(\d\d)$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : 0; };
  const clock = n => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
  const render = () => {
    const last = data.runs[data.runs.length - 1];
    const mine = data.runs.filter(r => r.v === window.PSBot.version && secs(r.time)).slice(-10).map(r => secs(r.time));
    hud.textContent = `farm: ${total()} xu · ${data.runs.length} trận · ${perHour()} xu/giờ${last ? ` · trận cuối +${last.coins}` : ''}` +
      (mine.length ? `\nsống (${mine.length} trận gần nhất, v${window.PSBot.version}): TB ${clock(mine.reduce((a, b) => a + b, 0) / mine.length)} · dài nhất ${clock(Math.max(...mine))}` : '');
  };

  const timer = setInterval(() => { scan(); render(); }, 1000);
  render();

  window.PSFarm = {
    stats() {
      console.table(data.runs.map((r, i) => ({ '#': i + 1, coins: r.coins, time: r.time, kills: r.kills, bosses: r.bosses, level: r.level, v: r.v || '', at: new Date(r.at).toLocaleTimeString() })));
      log(`tổng ${total()} xu · ${data.runs.length} trận · ${perHour()} xu/giờ`);
    },
    reset() { data = { runs: [], since: Date.now() }; save(); render(); log('đã xoá thống kê'); },
    unload() { clearInterval(timer); hud.remove(); delete window.PSFarm; },
  };
  log('preset farm xu đã bật — PSFarm.stats() xem từng trận, PSFarm.reset() xoá thống kê');
})();
