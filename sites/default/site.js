// PokeSurvivor Bot — profile for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.

// The game's dev page (/dev.html) leaves the game on window.G (scene() below reads it), but since 26-10-2026 it runs
// offline on the website: no account, no cloud save, no ranking. Bot 1.5.0-1.5.6 sent players there; they are now
// sent back to the home page, unless localStorage['psbot.dev'] = '1' (playing offline on purpose). On the home page
// hook.js (run at document_start by the extension / userscript) puts the same object on window.G
(() => {
  let keep = false;
  try { keep = localStorage.getItem('psbot.dev') === '1'; } catch {}
  if (!keep && location.pathname === '/dev.html' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) location.replace('/' + location.search + location.hash);
})();
// Leaderboard: runs the bot plays are not submitted while the panel's checkbox is on (SITE.noRank). Wrapped once per
// page; the live bot (window.PSBot, replaced when bot.js is reloaded) decides at submit time
(() => {
  let tries = 0;
  const t = setInterval(() => {
    const R = window.G && window.G.Ranking;
    if (!R && ++tries < 60) return;
    clearInterval(t);
    if (R) for (const k of ['submitSolo', 'submitGroup']) {
      const orig = R[k];
      if (typeof orig !== 'function' || orig.psbot) continue;
      R[k] = Object.assign(function () {
        const bot = window.PSBot;
        if (bot && bot.state.on && bot.SITE.noRank && bot.SITE.noRank.get()) {
          console.log('%c[PSBot]', 'color:#7cf', 'ván do bot chơi: không gửi bảng xếp hạng');
          return Promise.resolve(null);
        }
        return orig.apply(this, arguments);
      }, { psbot: true });
    }
  }, 1000);
})();
// Realm-safe copy of a DOM list. `[...nodeList]` / `for..of` read Symbol.iterator from a page object, and a Firefox
// userscript sandbox refuses that ("Permission denied to access property Symbol.iterator"); index access never does.
// Shared by all files as window.PSBotList — site.js always loads first (manifest, loader and psbot.user.js).
window.PSBotList = window.PSBotList || (list => {
  const l = typeof list === 'string' ? document.querySelectorAll(list) : list, a = [];
  for (let i = 0; i < l.length; i++) a.push(l[i]);
  return a;
});

// The game's Halloween (js/systems/halloween.js): 30-10 to 1-11, Spain time. No separate mode: every run started then// is a Halloween run (night map, ghosts, candy, the big Gengar at minute 30)
// Spain's date by hand instead of Intl: under a Firefox userscript sandbox (phones) the options object would be a
// sandbox object handed to the page's Intl, which Firefox refuses ("Permission denied to access property
// 'localeMatcher'"). Europe/Madrid is UTC+1, or UTC+2 while EU summer time runs: last Sunday of March 01:00 UTC
// until the last Sunday of October 01:00 UTC.
const madridDate = now => {
  const y = new Date(now).getUTCFullYear();
  const lastSunday = (month, hour) => {
    const last = new Date(Date.UTC(y, month + 1, 0, hour));
    return Date.UTC(y, month, last.getUTCDate() - last.getUTCDay(), hour);
  };
  const summer = now >= lastSunday(2, 1) && now < lastSunday(9, 1);
  const d = new Date(now + (summer ? 2 : 1) * 3600e3);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

window.PSBotSite = h => {
  // Card = the block around one hotkey digit (div.key), widened while it holds no other digit
  const cardOf = k => {
    let card = k;
    while (card.parentElement && card.parentElement.querySelectorAll('div.key').length === 1) card = card.parentElement;
    return card;
  };
  // Phones without any hotkey digit: the cards are the biggest row (2-6) of look-alike sibling blocks (same tag + class)
  // around the level number, the reroll / skip buttons left out
  function cardRow(lvl) {
    for (let box = lvl.parentElement; box && box !== document.body; box = box.parentElement) {
      const groups = new Map();                                       // parent -> visible blocks
      for (const e of PSBotList(box.querySelectorAll('*'))) {
        if (e.contains(lvl) || !h.visible(e) || e.querySelector('#lvl-rr-n') || /reroll|skip|banish/i.test(e.innerText)) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 60 || r.height < 40 || !e.innerText.trim()) continue;
        groups.set(e.parentElement, [...(groups.get(e.parentElement) || []), e]);
      }
      const best = [...groups.values()].map(g => g.filter(e => e.tagName === g[0].tagName && e.className === g[0].className))
        .filter(g => g.length >= 2 && g.length <= 6).sort((a, b) => b.length - a.length)[0];
      if (best) return best;
    }
    return [];
  }
  // key = digit for the log / key press; k = its div.key (if any); el = the card to tap instead of pressing the key
  function readCard(card, key, k, el) {
    const { state, CFG, fontSize } = h;
    const t = card.innerText;
    // Card title = the largest text in the card that is not the hotkey digit. Own text only: the title box
    // also holds the tag chips ("Ember <span>New · Fire</span>")
    const own = e => PSBotList(e.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const leaves = PSBotList(card.querySelectorAll('*')).filter(e => e !== k && /\D/.test(own(e)));
    const title = leaves.reduce((b, e) => (!b || fontSize(e) > fontSize(b) ? e : b), null);
    const name = title ? own(title) : '';
    const shownLv = t.match(/\b(?:Lv|Nv|Niv)\.?\s*(\d+)/i);                 // "Lv. 3" chip on owned skills, if the game shows one
    return { ...h.scoreCard({
      key, name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), shownLv ? +shownLv[1] - 1 : 0),
      isNew: /\bNew\b|Nuevo|Novo|Mới/i.test(t),
      evo: CFG.evoRe.test(t) || /evo|awaken|ultimate/i.test(card.className + ' ' + PSBotList(card.querySelectorAll('[class]')).map(e => e.className).join(' ')),
      fitLow: !!card.querySelector('.fit-low'), fitHigh: !!card.querySelector('.fit-high'),
    }), el };
  }
  // ---------- scene from the game's own state (window.G, /dev.html) ----------
  // Prop types (js/world/world.js): trees block, rocks / small chests break (and block), the big chest opens while
  // standing next to it, an altar gives a power, a trap springs when stepped on
  const GOOD = new Set(['heal', 'magnet', 'bomb', 'coin', 'ticket', 'ticket10', 'item', 'sphere']);
  const circle = (x, y, r) => Array.from({ length: 12 }, (_, i) => ({ x: x + r * Math.cos(i * Math.PI / 6), y: y + r * Math.sin(i * Math.PI / 6) }));
  let tiles = null;                                                  // terrain around the player: { key, at, list } (world)
  function terrainNear(px, py) {
    const W = G.World, TS = W.TS, R = 40, tx = Math.floor(px / TS), ty = Math.floor(py / TS), now = performance.now();
    if (tiles && tiles.key === `${tx},${ty}` && now - tiles.at < 1000) return tiles.list;
    // Liquid that hurts (lava, poison) is as good as a wall: the game's own path finding treats it so
    const deadly = !!W.liquidEffect([]).dmg, list = [];
    for (let j = ty - R; j <= ty + R; j++) for (let i = tx - R; i <= tx + R; i++) {
      const x = i * TS + TS / 2, y = j * TS + TS / 2;
      const kind = W.isWall(x, y) ? 1 : W.isLiquid(x, y) ? (deadly ? 1 : 2) : 0;
      if (kind) list.push({ x: i * TS, y: j * TS, kind });
    }
    tiles = { key: `${tx},${ty}`, at: now, list };
    return list;
  }
  // cam = the canvas transform of a world sprite this frame (screen = world * s + e / f). Null outside a run, or
  // without G (the home page: minified, nothing exposed), and the core then reads the sprites
  function scene(cam) {
    const G = window.G, P = G && G.Game && G.Game.player;
    if (!P || !G.World || !/playing|levelup|choice/.test(G.Game.state)) return null;
    const { s, e, f } = cam;
    const X = x => x * s + e, Y = y => y * s + f;
    const near = (o, r) => Math.abs(o.x - P.x) < r && Math.abs(o.y - P.y) < r;
    const box = (o, size, src) => ({ src, x: X(o.x), y: Y(o.y), w: size * s, h: size * s, s, e, f });
    h.state.selfDex = String(P.dex);
    h.state.magnet = P.magnet;
    const out = { me: { x: X(P.x), y: Y(P.y) }, enemies: [], hazard: [], xp: [], good: [], case: [], buff: [], heal: [], rift: [], wall: [], break: [], prize: [] };
    // Enemies whose type hits ours super-effectively count as bigger (kept farther away). Prizes: the coin thief (never
    // hits, flees, gone after 15 s: 100 coins or a ×10 ticket) is only chased; a shiny (caught when beaten) is fought
    for (const o of G.EnemyMgr.all()) {
      if (o.dead || !near(o, 1400)) continue;
      if (o.behavior === 'thief') { out.prize.push(box(o, 2 * o.r + 16, 'G:thief')); continue; }
      const k = G.Types.mult(o.atkType, P.mon.types);
      out.enemies.push(box(o, 2 * o.r + 16 + 24 * Math.max(0, Math.min(2, k - 1)), `G:enemy:${o.dex}`));
      if (o.shiny) out.prize.push({ ...box(o, 2 * o.r + 16, 'G:shiny'), engage: true });
    }
    // Telegraphs: a circle (zone) or a straight beam from the enemy
    for (const z of G.Hazards.all) {
      let pts;
      if (z.kind === 'zone') pts = circle(z.x, z.y, z.r);
      else {
        const c = Math.cos(z.angle), n = Math.sin(z.angle), hw = z.w / 2, x1 = z.x + c * z.len, y1 = z.y + n * z.len;
        pts = [[z.x - n * hw, z.y + c * hw], [x1 - n * hw, y1 + c * hw], [x1 + n * hw, y1 - c * hw], [z.x + n * hw, z.y - c * hw]].map(([x, y]) => ({ x, y }));
      }
      out.hazard.push({ src: `G:hazard:${z.kind}`, shape: 'poly', lw: 0, pts: pts.map(p => ({ x: X(p.x), y: Y(p.y) })), x: X(z.x), y: Y(z.y), w: 0, h: 0 });
    }
    // Enemy shots: a line over where they fly in the next CFG.shotLookahead ms, as wide as shot + player
    const ahead = h.CFG.shotLookahead / 1000;
    for (const p of G.Projectiles.all()) {
      if (p.friendly !== false || !near(p, 1400)) continue;
      out.hazard.push({ src: 'G:shot', shape: 'line', lw: 2 * (p.r + P.r) * s, x: X(p.x), y: Y(p.y), w: 0, h: 0,
        pts: [{ x: X(p.x), y: Y(p.y) }, { x: X(p.x + p.vx * ahead), y: Y(p.y + p.vy * ahead) }] });
    }
    // Pickups and props only on screen (plus a margin), as when read off the canvas: the core's ranges are tuned for that,
    // and items across the map would pull the player away from the fight
    for (const p of G.Pickups.all()) {
      if (!G.Camera.sees(p.x, p.y, 60)) continue;
      if (p.kind === 'xp' || p.kind === 'xpBig') out.xp.push(box(p, 12, `G:${p.kind}`));
      else if (GOOD.has(p.kind)) out.good.push(box(p, 14, `G:${p.kind}`));
    }
    // Props: size 2.5 r, so the core's footprint (40 % of the width) blocks exactly the game's collision radius
    // The big chest (a level's worth of XP + coins) also off screen, within 1200
    const props = new Set(G.World.visibleProps(G.Camera));
    for (const p of G.World.specialsNear(P.x, P.y, 1200)) if (p.type === 'bigchest') props.add(p);
    for (const p of props) {
      const d = box(p, 2.5 * p.r, `G:${p.type}`);
      // Rocks / small chests only block: walking up to break them cost runs (~half the time spent on them, into hordes)
      if (p.type === 'tree' || ((p.type === 'rock' || p.type === 'chest') && p.hp > 0)) out.wall.push(d);
      else if (p.type === 'bigchest' && p.hp > 0) out.case.push(d);
      else if (p.type === 'altar' && !p.used) out.buff.push(d);
      // Healing spring: drawn and healing around 8 above its base (js/systems/interact.js); dried below 0.02 charge
      else if (p.type === 'spring' && p.charge > 0.1) out.heal.push({ ...d, y: Y(p.y - 8) });
      else if (p.type === 'trap' && p.hp > 0) out.hazard.push({ ...d, y: Y(p.y - 8), w: 26 * s, h: 26 * s });
    }
    const rift = G.Rift.rift;
    // A rift is worth a long walk: seen even off screen. Entered within 30 of 10 above its base (js/systems/rift.js)
    if (rift && !G.Rift.inArena && near(rift, 2500)) out.rift.push(box({ x: rift.x, y: rift.y - 10 }, 40, 'G:rift'));
    const TS = G.World.TS;
    out.terrain = terrainNear(P.x, P.y).map(t => ({ x: X(t.x), y: Y(t.y), w: TS * s, kind: t.kind }));
    return out;
  }

  // ---------- terrain off the canvas (home page, no G) ----------
  // The map is drawn as 256x256 chunk canvases of 16x16 tiles (16 px each, 32 world units), every pixel taken from the
  // biome's palette (js/world/tiles.js: BIOMES, ARENA_THEMES via arenaBiome(), the Halloween night biomes). Counting
  // a tile's wall / liquid colours tells what it is. Lava, poison and spark hurt: walls, as in the game's own pathing
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (c, t) => c.map(e => Math.round(t >= 0 ? e + (255 - e) * t : e * (1 + t)));
  const blend = (a, b, t) => a.map((e, i) => Math.round(e + (b[i] - e) * t));
  const ckey = c => (c[0] << 16) | (c[1] << 8) | c[2];
  const DEADLY = new Set(['lava', 'poison', 'spark']);
  // Full biomes: floor + dirt, wallTop + wallLight / wallEdge / wallFace / wallFaceDark, liq / liqDeep / foam, liquid
  const BIOMES = [
    ['#3e7a39 #44813d #397134 #7d6742 #735e3b #86704a', '#5d6e49 #677a50 #566544 #88a06e #26301f #3e4934 #363f2d #232a1d', '#3b7fc6 #2c64a6 #b3defa', 'water'],
    ['#4d5778 #535e81 #47506f #3c4462 #424a69 #37405b', '#5f5089 #695996 #56497d #a08ddc #1f1934 #3f3463 #382e59 #221c3a', '#2a9cab #1d7c8a #aaf4f7', 'water'],
    ['#5b4537 #644c3c #533f32 #403530 #473b34 #392f2b', '#3c3634 #443d3a #35302e #625752 #141110 #2b2624 #25201f #151211', '#e45a1f #b9401a #ffd46a', 'lava'],
    ['#2f3a26 #34402a #2a3322 #4a3a2a #423426 #51402e', '#3d3446 #45394f #362e3e #6a5a7a #140f18 #2a2330 #241e2a #130f16', '#3e5a2a #2c4220 #9ac25a', 'swamp'],
    ['#34303f #393446 #2f2b39 #2a2631 #26222c #2e2a36', '#4a4652 #524e5c #423e49 #7a7684 #121016 #2e2b34 #28252e #141217', '#3a3a6a #2a2a52 #a6a6ff', 'water'],
    ['#1f2a2a #233030 #1b2525 #2e2622 #29221f #332a25', '#2e2838 #352e40 #282231 #584c66 #0e0b12 #211c28 #1c1823 #0f0d13', '#6a3a8a #4e2a6a #e0a6ff', 'poison'],
  ].map(([floor, wall, liq, liquid]) => ({ floor: floor.split(' ').map(rgb), wall: wall.split(' ').map(rgb), liq: liq.split(' ').map(rgb), liquid }));
  // Rift arenas: floor, wall, liquid colour, foam ('' = derived), liquid
  for (const a of ('#6f8a4f #8a7f6a #4f8fd0 - water|#5b3a2e #3a2826 #e45a1f #ffd46a lava|#3c6a80 #2a4660 #2f86d6 #bfeaff water|' +
    '#3a7a32 #4a6a36 #4f6b2a #9ac25a swamp|#4a4840 #3a3a48 #e8c020 #fff6c0 spark|#b8cfe0 #7f9fc0 #9fd8f0 #ffffff ice|' +
    '#8a6a46 #5e4232 #4f8fd0 - water|#46384f #33263f #9a4fc0 #e0a6ff poison|#b08a52 #8a5e34 #9a7a48 #d6b98a swamp|' +
    '#9fb8d8 #dfe8f4 #7fb8ff - water|#5e4470 #3e2a55 #8a5ad0 - water|#5a6a2a #5e4a26 #6a7a2a #c4d65a swamp|' +
    '#7a6a58 #55473a #4f8fd0 - water|#383447 #24202e #3a3a6a - water|#363a5e #24264a #7b5cff #c9a6ff lava|' +
    '#2c282e #1c181f #2a2a3a - water|#6d7888 #465060 #4f8fd0 - water|#4f7f5a #7a5a8a #8fd8ff #ffe0f4 water|' +
    '#4a4240 #2e2829 #e8a82a #fff1b8 lava').split('|')) {
    const [f, w, l, foam, liquid] = a.split(' '), F = rgb(f), W = rgb(w), L = rgb(l);
    BIOMES.push({ floor: [F, shade(F, 0.05), shade(F, -0.06), shade(F, -0.16), shade(F, -0.12), shade(F, -0.2)],
      wall: [W, shade(W, 0.07), shade(W, -0.07), shade(W, 0.32), shade(W, -0.7), shade(W, -0.3), shade(W, -0.38), shade(W, -0.55)],
      liq: [L, shade(L, -0.22), foam === '-' ? shade(L, 0.55) : rgb(foam)], liquid });
  }
  const palettes = BIOMES.map(b => ({ floor: new Set(b.floor.map(ckey)), wall: new Set(b.wall.map(ckey)),
    liquid: new Set([...b.liq, blend(b.liq[0], b.liq[2], 0.28)].map(ckey)), deadly: DEADLY.has(b.liquid) }));
  // Chunk canvas -> Uint8Array(256) of tiles (0 floor, 1 wall, 2 liquid), or null for any other canvas. The biome is the
  // palette matching most pixels; a tile is wall / liquid when over half its pixels are
  const terrainCache = new WeakMap();
  function classify(img) {
    let px;
    try { px = img.getContext('2d').getImageData(0, 0, 256, 256).data; } catch { return null; }
    const at = (x, y) => { const o = (y * 256 + x) * 4; return (px[o] << 16) | (px[o + 1] << 8) | px[o + 2]; };
    let best = null, bestHits = 0;
    for (const p of palettes) {
      let hits = 0;
      for (let y = 1; y < 256; y += 4) for (let x = 1; x < 256; x += 4) { const k = at(x, y); if (p.floor.has(k) || p.wall.has(k) || p.liquid.has(k)) hits++; }
      if (hits > bestHits) { best = p; bestHits = hits; }
    }
    if (!best || bestHits < 4096 * 0.3) return null;
    const tiles = new Uint8Array(256);
    for (let t = 0; t < 256; t++) {
      const tx = (t % 16) * 16, ty = Math.floor(t / 16) * 16;
      let wall = 0, liquid = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = at(tx + x, ty + y); if (best.wall.has(k)) wall++; else if (best.liquid.has(k)) liquid++; }
      tiles[t] = wall > 128 ? 1 : liquid > 128 ? (best.deadly ? 1 : 2) : 0;
    }
    return tiles;
  }
  function terrain(d) {
    const img = d.img;
    if (d.rect || !img || img.width !== 256 || img.height !== 256 || !img.getContext) return null;
    if (!terrainCache.has(img)) terrainCache.set(img, classify(img));
    return terrainCache.get(img);
  }

  // The game canvas: #game on desktop; if a layout (phones?) has none, the biggest visible canvas that isn't the bot's own
  const gameCanvas = () => document.getElementById('game') || PSBotList(document.querySelectorAll('canvas:not([data-psbot-ui])'))
    .filter(c => c.width * c.height >= 200000 && c.getClientRects().length).sort((a, b) => b.width * b.height - a.width * a.height)[0] || null;

  const pilot = window.PSBotPilot ? window.PSBotPilot(h) : null;
  // Level-up cards as the game dealt them (pilot.js wraps G.LevelUp.offer), picked with G.RunUI.pick: no reading or
  // tapping the DOM, which phones lay out differently. Null without G (DOM path below)
  function dealtCards() {
    const g = window.G, offer = window.__psbotOffer, p = g && g.Game && g.Game.player;
    if (!p || !g.RunUI || !g.RunUI.pick || !g.UI || !g.UI.isOpen('scr-levelup') || !offer || !offer.length) return null;
    // The game ignores a pick right after the cards appear (run-ui.js guarded()): an empty list = try again later
    if (performance.now() - (window.__psbotOfferAt || 0) < 700) return { cards: [], rerolls: 0 };
    const rr = document.getElementById('lvl-reroll');
    const rerolls = rr && !rr.classList.contains('hidden') ? +(document.getElementById('lvl-rr-n') || {}).textContent || 0 : 0;
    return {
      cards: offer.map((c, i) => {
        const id = String(c.key).split(':').slice(1).join(':'), m = p.moves.find(x => x.id === id);
        const name = String(c.title || '').split(' → ')[0];
        return { ...h.scoreCard({
          key: String(i + 1), name, t: `${c.title || ''} ${c.tag || ''} ${c.desc || ''}`,
          level: c.type === 'new' ? 0 : m ? m.lvl || 1 : 0, isNew: c.type === 'new',
          evo: c.type === 'evo' || (c.type === 'stat' && c.color === '#ffd23f'), fitLow: false, fitHigh: false,
        }), pick: () => g.RunUI.pick(i) };
      }),
      rerolls, reroll: () => g.RunUI.reroll(),
    };
  }

  return {
    id: 'default', label: 'Mặc định · pokesurvivor.com',
    // Event button: runs like ▶ Chạy, only while the game's Halloween is on (checked once a minute)
    event: {
      label: '🎃 Event Halloween',
      title: 'Event Halloween (30/10 – 1/11, giờ Tây Ban Nha): mọi trận trong thời gian này đều là trận Halloween (bản đồ đêm, pokémon Ma, kẹo, Gengar khổng lồ ở phút 30)',
      available() {
        const now = Date.now();
        if (!(now - (this.at || 0) < 60000)) {
          const p = madridDate(now);
          this.on = (p.month === 10 && p.day >= 30) || (p.month === 11 && p.day === 1);
          this.at = now;
        }
        return this.on;
      },
      start() {}, stop() {},
    },
    ready: () => !!gameCanvas(),
    canvas: gameCanvas,
    // World sprites are drawn scaled by the camera zoom, the HUD untransformed
    isWorld: d => d.s !== 1,
    camera: world => world[0],
    enemyRe: /\/assets\/pokemon\/\d+\/(?!Faint)\w+\.png/,
    // 34x16 = healing spring (js/world/tiles.js), every biome; a dried one is skipped by the core when HP stops rising
    // Solid props (js/world/tiles.js PAINT, same size in every biome): tree 30x40 / crystal 26x40 / dead tree 28x40,
    // rock 22x17, Halloween pumpkin 22x20. Rocks and pumpkins break, but only block here (as in scene())
    // Enemy telegraphs (js/systems/hazards.js) are outlined dashed in the attacker's type colour: a zone [4,4], a beam
    // [6,4], width 2 (the player's own meteor zone is [4,4] at 1.5). Each enemy shot has a red ring under it
    // (js/entities/projectile.js), as on doofcraft
    tags: { 'dash:4,4/2': 'hazard', 'dash:6,4/2': 'hazard', 'fill:rgba(255,60,80,0.35)': 'shot',
      'canvas:14x14': 'hazard', 'canvas:12x12': 'hazard', 'canvas:34x16': 'heal',
      'canvas:30x40': 'wall', 'canvas:26x40': 'wall', 'canvas:28x40': 'wall', 'canvas:22x17': 'wall', 'canvas:22x20': 'wall' },
    sizeTags: true,           // a size-only tag ("canvas:14x14") also matches every hash of that size
    // Solid props collide as a circle at their base (js/world/world.js: tree r 13, rock 12, pumpkin 11), drawn with the
    // sprite's bottom 2 below it; the core's guess from the sprite shape put it 13-15 too high
    propFoot: { up: 2, r: 13 },
    // The glow under a boss (js/entities/enemy.js draw: ellipse r*1.6 wide at its feet), #ff4a4a once enraged. Same
    // colour as big XP gems (tagged xp in data.js), told apart by size in the core
    bossAura: src => /^fill:#(ffd95e|ff4a4a)$/i.test(src),
    // A zone telegraph is drawn as an ellipse 0.75 as tall as wide, but hits as a circle of the width
    // (js/systems/hazards.js inside): stretched to that circle, else dodging up / down stopped ~30 short
    hazardShape: d => d.src === 'dash:4,4/2' && d.pts && d.h > 0
      ? { ...d, h: d.w, pts: d.pts.map(p => ({ x: p.x, y: d.y + (p.y - d.y) * d.w / d.h })) } : null,
    scene,
    terrain,                  // map chunk -> 16x16 tiles (0 floor, 1 wall, 2 liquid) for path finding, when scene() is null
    // Move slots of the player, a bonded group being one (/dev.html only; else the core counts picks)
    moveSlots: () => { const P = window.G && G.Game && G.Game.player; return P && P.slots ? { used: P.slots.length, max: P.maxMoves } : null; },
    // Plays from G when there is one (pilot.js): steering, orbs, active slot, auto-unpause, dialogs; and the results
    // screen / menu by the game's ids (also without G)
    pilot,
    // Survival card rules (core levelUp), from the cards the game dealt: Sitrus Berry, a passive that evolves a move at
    // once, Coraza (armour: -6 % damage taken a card, up to 70 %, js/systems/levelup.js)
    cardFacts(c, i) {
      const g = pilot && pilot.card(i);
      if (!g) return null;
      return { heal: g.type === 'stat' && g.id === 'heal', evoNow: g.evoNow, armor: g.type === 'stat' && g.id === 'def' && g.armor < 0.69,
        why: `đang giảm ${Math.round(g.armor * 100)}% sát thương, tối đa 70%` };
    },
    // Panel checkbox "don't submit to the leaderboard" (wrapper at the top), on by default; only with G
    noRank: window.G ? {
      get: () => { try { return localStorage.getItem('psbot.norank') !== '0'; } catch { return true; } },
      set: on => { try { localStorage.setItem('psbot.norank', on ? '1' : '0'); } catch {} },
    } : null,
    // The big chest is solid (player + chest radius ~25 apart at best) and opens within ~48 of its centre.
    // Telegraphs are known by their dash (tags above): red-ish shapes are hit sparks and weather particles here, often
    // 100+ at once (a rift arena's forced weather), and as hazards they left no safe step
    cfg: { caseReach: 40, autoTelegraph: false },
    levelUp() {
      const dealt = dealtCards();
      if (dealt) return dealt;
      const lvl = document.getElementById('lvl-num');
      if (!h.visible(lvl)) return null;
      const rerolls = +(document.getElementById('lvl-rr-n') || {}).innerText || 0;
      // Desktop: visible hotkey digits, picked with the key
      const shown = PSBotList(document.querySelectorAll('div.key')).filter(h.visible);
      if (shown.length) return { cards: shown.map(k => readCard(cardOf(k), k.innerText.trim(), k, null)), rerolls };
      // Phones hide the digits (no keyboard): cards from the hidden digits of the level-up box, else the row of
      // look-alike blocks; the card is tapped
      let box = lvl;
      while (box.parentElement && box !== document.body && !box.querySelector('div.key')) box = box.parentElement;
      const hidden = box === document.body ? [] : PSBotList(box.querySelectorAll('div.key')).map(k => ({ k, card: cardOf(k) })).filter(o => h.visible(o.card));
      const list = hidden.length ? hidden : cardRow(lvl).map(card => ({ k: null, card }));
      return { cards: list.map(({ k, card }, i) => readCard(card, k ? k.textContent.trim() || String(i + 1) : String(i + 1), k, card)), rerolls };
    },
    choiceOpen: () => h.visible(document.getElementById('lvl-num')),
    otherChoice() {},
    menu: buttons => buttons.some(b => /^(play|jugar)/i.test((b.innerText || '').trim()) && /dungeon|mazmorra/i.test(b.innerText)),
    restartButton(buttons) {
      for (const re of h.CFG.restartSteps) {
        const b = buttons.find(b => { const x = (b.innerText || '').trim(); return re.test(x) && !h.CFG.restartAvoid.test(x); });
        if (b) return b;
      }
    },
  };
};
