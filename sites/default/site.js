// PokeSurvivor Bot — profile for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.

// The game's dev page (/dev.html) leaves the game on window.G (scene() below reads it), but since 26-10-2026 it runs
// offline on the website: no account, no cloud save, no ranking. Bot 1.5.0-1.5.6 sent players there; they are now
// sent back to the home page, unless localStorage['psbot.dev'] = '1' (playing offline on purpose)
(() => {
  let keep = false;
  try { keep = localStorage.getItem('psbot.dev') === '1'; } catch {}
  if (!keep && location.pathname === '/dev.html' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) location.replace('/' + location.search + location.hash);
})();
// The game's Halloween (js/systems/halloween.js): 30-10 to 1-11, Spain time. No separate mode: every run started then
// is a Halloween run (night map, ghosts, candy, the big Gengar at minute 30)
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
      for (const e of box.querySelectorAll('*')) {
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
    const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const leaves = [...card.querySelectorAll('*')].filter(e => e !== k && /\D/.test(own(e)));
    const title = leaves.reduce((b, e) => (!b || fontSize(e) > fontSize(b) ? e : b), null);
    const name = title ? own(title) : '';
    const shownLv = t.match(/\b(?:Lv|Nv|Niv)\.?\s*(\d+)/i);                 // "Lv. 3" chip on owned skills, if the game shows one
    return { ...h.scoreCard({
      key, name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), shownLv ? +shownLv[1] - 1 : 0),
      isNew: /\bNew\b|Nuevo|Novo|Mới/i.test(t),
      evo: CFG.evoRe.test(t) || /evo|awaken|ultimate/i.test(card.className + ' ' + [...card.querySelectorAll('[class]')].map(e => e.className).join(' ')),
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
    const out = { me: { x: X(P.x), y: Y(P.y) }, enemies: [], hazard: [], xp: [], good: [], case: [], buff: [], rift: [], wall: [], break: [], prize: [] };
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
      else if (p.type === 'trap' && p.hp > 0) out.hazard.push({ ...d, y: Y(p.y - 8), w: 26 * s, h: 26 * s });
    }
    const rift = G.Rift.rift;
    // A rift is worth a long walk: seen even off screen. Entered within 30 of 10 above its base (js/systems/rift.js)
    if (rift && !G.Rift.inArena && near(rift, 2500)) out.rift.push(box({ x: rift.x, y: rift.y - 10 }, 40, 'G:rift'));
    const TS = G.World.TS;
    out.terrain = terrainNear(P.x, P.y).map(t => ({ x: X(t.x), y: Y(t.y), w: TS * s, kind: t.kind }));
    return out;
  }

  // The game canvas: #game on desktop; if a layout (phones?) has none, the biggest visible canvas that isn't the bot's own
  const gameCanvas = () => document.getElementById('game') || [...document.querySelectorAll('canvas:not([data-psbot-ui])')]
    .filter(c => c.width * c.height >= 200000 && c.getClientRects().length).sort((a, b) => b.width * b.height - a.width * a.height)[0] || null;

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
    tags: { 'canvas:14x14': 'hazard', 'canvas:12x12': 'hazard' },
    sizeTags: true,           // a size-only tag ("canvas:14x14") also matches every hash of that size
    scene,
    // Move slots of the player, a bonded group being one (/dev.html only; else the core counts picks)
    moveSlots: () => { const P = window.G && G.Game && G.Game.player; return P && P.slots ? { used: P.slots.length, max: P.maxMoves } : null; },
    // The big chest is solid (player + chest radius ~25 apart at best) and opens within ~48 of its centre
    cfg: { caseReach: 40 },
    levelUp() {
      const lvl = document.getElementById('lvl-num');
      if (!h.visible(lvl)) return null;
      const rerolls = +(document.getElementById('lvl-rr-n') || {}).innerText || 0;
      // Desktop: visible hotkey digits, picked with the key
      const shown = [...document.querySelectorAll('div.key')].filter(h.visible);
      if (shown.length) return { cards: shown.map(k => readCard(cardOf(k), k.innerText.trim(), k, null)), rerolls };
      // Phones hide the digits (no keyboard): cards from the hidden digits of the level-up box, else the row of
      // look-alike blocks; the card is tapped
      let box = lvl;
      while (box.parentElement && box !== document.body && !box.querySelector('div.key')) box = box.parentElement;
      const hidden = box === document.body ? [] : [...box.querySelectorAll('div.key')].map(k => ({ k, card: cardOf(k) })).filter(o => h.visible(o.card));
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
