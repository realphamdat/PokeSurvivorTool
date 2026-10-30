// PokeSurvivor Bot — profile for pokesurvivor.doofcraft.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// A rewrite of the game with its own canvas, sprite paths and menus.
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.

// Realm-safe copy of a DOM list (same helper as sites/default/site.js): `[...nodeList]` / `for..of` read
// Symbol.iterator from a page object and a Firefox userscript sandbox refuses that; index access never does
window.PSBotList = window.PSBotList || (list => {
  const l = typeof list === 'string' ? document.querySelectorAll(list) : list, a = [];
  for (let i = 0; i < l.length; i++) a.push(l[i]);
  return a;
});

window.PSBotSite = h => {
  // Choice dialog: answerable once "armed" (input is locked for 1 s after it opens) and not yet submitted
  const dcBox = () => { const b = document.querySelector('.ps-choice:not(.hidden) .ps-box.armed'); return b && !b.querySelector('.ps-cards.done') ? b : null; };
  const dcTitle = box => ((box.querySelector('h2') || {}).innerText || '').trim();
  // Card = button.ps-card > .txt > .nm (title text + chips "New · Fire" / "Lv.2 > 3" / "EVOLUTION") + .ds (description)
  const dcName = c => { const nm = c.querySelector('.nm'); return nm ? PSBotList(nm.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : ''; };
  // Phones (touch screen): the card button is tapped instead of pressing its digit key
  const tapTarget = c => (matchMedia('(pointer: coarse)').matches ? c : null);

  // ---------- terrain: walls and liquid are baked into the map ----------
  // The map is drawn as 256x256 chunk canvases of 16x16 tiles (16 px each, 32 world units), every pixel taken from the
  // biome's palette. The palettes are read from the game's own scripts (22 biomes in its config; most list only base
  // colours, the rest derived as the game does), so counting a tile's wall / liquid colours tells what it is.
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (c, t) => c.map(e => Math.round(t >= 0 ? e + (255 - e) * t : e * (1 + t)));   // the game's q()
  const blend = (a, b, t) => a.map((e, i) => Math.round(e + (b[i] - e) * t));
  const key = c => (c[0] << 16) | (c[1] << 8) | c[2];
  const palettes = [];                                                // { floor, wall, liquid }: Sets of rgb keys
  function addPalette(text) {
    const get = k => { const m = text.match(new RegExp(`\\b${k}:(\\[[^\\]]*\\]|\`#[0-9a-fA-F]{6}\`)`)); return m ? m[1].match(/#[0-9a-fA-F]{6}/g).map(rgb) : []; };
    const n = get('floor'), r = get('wall')[0], i = get('liquid')[0];
    if (!n.length || !i) return;
    const foam = get('foam')[0] || shade(i, 0.55);
    const p = r
      ? { floor: [n[0], shade(n[0], 0.05), shade(n[0], -0.06), shade(n[0], -0.16), shade(n[0], -0.12), shade(n[0], -0.2)],
        wall: [r, shade(r, 0.07), shade(r, -0.07), shade(r, 0.32), shade(r, -0.7), shade(r, -0.3), shade(r, -0.38), shade(r, -0.55)],
        liquid: [i, shade(i, -0.22), foam, blend(i, foam, 0.28)] }
      : { floor: [...n, ...get('dirt')],
        wall: ['wallTop', 'wallLight', 'wallEdge', 'wallFace', 'wallFaceDark'].flatMap(get),
        liquid: [i, ...get('liquidDeep'), foam, blend(i, foam, 0.28)] };
    palettes.push({ floor: new Set(p.floor.map(key)), wall: new Set(p.wall.map(key)), liquid: new Set(p.liquid.map(key)) });
  }
  // Evolutions: a maxed move evolves once the passive it "requires" is owned. Move name (lower-case) -> name of that
  // passive's level-up card ("Power" for attack, "Reflexes" for cooldown, …), from the game config as well
  const evolveNeeds = new Map();
  // What each pokémon learns, from the game config too (the wiki's lists are pokesurvivor.com's): moves, pokédex,
  // starters, the Poké Mart's TM table. An object / array literal (or JSON.parse(`…`)) at i, evaluated
  const dc = { moves: null, dex: null, starters: null, tms: null, byName: new Map(), byDex: new Map(), byId: new Map() };
  // This game's move table for the core, in moves.js's shape (filled once read): moves [{ name, kind, cat ('status' =
  // buff, no physical / special here), dmg, cd }], mons[name] = indices of its natural moves
  const moveTable = { moves: [], mons: {} };
  const literal = (src, i) => {
    let depth = 0, q = null;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
      if (c === '`' || c === '"' || c === "'") q = c;
      else if ('{[('.includes(c)) depth++;
      else if ('}])'.includes(c) && --depth === 0) return Function(`return ${src.slice(i, j + 1)}`)();
    }
  };
  const config = (src, re) => { const m = re.exec(src); return m ? literal(src, m.index + m[0].indexOf('=') + 1) : null; };
  (async () => {
    try {
      const entry = PSBotList(document.scripts).map(s => s.src).find(s => /\/assets\/index-[\w-]+\.js/.test(s));
      if (!entry) return;
      const names = new Set([...(await (await fetch(entry)).text()).matchAll(/assets\/([\w-]+\.js)/g)].map(m => m[1]));
      const passiveCard = {}, requires = [];
      for (const name of names) {
        const src = await (await fetch(new URL(name, entry))).text();
        for (const m of src.matchAll(/palette:\{/g)) {
          let depth = 0, j = m.index + 8;
          for (; j < src.length; j++) if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break;
          addPalette(src.slice(m.index + 8, j + 1));
        }
        // The level-up passives come first, the shop upgrades (same ids) after them
        for (const m of src.matchAll(/\{id:`([\w-]+)`,icon:`\w+`,name:`([^`]+)`/g)) passiveCard[m[1]] ??= m[2];
        for (const m of src.matchAll(/name:`([^`]+)`,type:`\w+`,kind:`\w+`,description:`[^`]*`,stats:\{[^}]*\},evolution:\{requires:`(\w+)`\}/g)) requires.push([m[1], m[2]]);
        try {
          dc.moves ??= config(src, /[,;\s]\w+=\{modifierRules:/);
          dc.dex ??= config(src, /[,;\s]\w+=JSON\.parse\(`\[\{"dex":1,/);
          dc.starters ??= config(src, /[,;\s]\w+=\{traits:\[/);
          dc.tms ??= config(src, /[,;\s]\w+=\{source:\{repository:/);
        } catch (e) { console.warn('[PSBot] không đọc được bảng move của game', e); }
      }
      // A form shares its base's name: the first entry is the base
      for (const p of dc.dex || []) { dc.byName.has(p.name.toLowerCase()) || dc.byName.set(p.name.toLowerCase(), p); dc.byDex.set(p.dex, p); }
      if (dc.moves) {
        for (const m of dc.moves.moves) {
          const info = { id: m.id, name: m.name, type: m.type, kind: m.kind, cat: m.kind === 'buff' ? 'status' : null, dmg: m.stats.damage, cd: m.stats.cooldown };
          dc.byId.set(m.id, { cfg: m, info, i: moveTable.moves.push(info) - 1 });
        }
        for (const [name, mon] of dc.byName) moveTable.mons[name] = [...poolOf(mon)].map(id => dc.byId.get(id).i);
      }
      for (const [move, id] of requires) if (passiveCard[id]) evolveNeeds.set(move.toLowerCase(), passiveCard[id]);
    } catch (e) { console.warn('[PSBot] không đọc được cấu hình game (bảng màu / tiến hoá)', e); }
  })();
  // The account's save (/api/save, as the game's own fetchSave): TMs taught per dex (taughtMoves; disabledTms = turned
  // off, never offered in a run), chosen starting move, partner. Refreshed in the background at most every 30 s
  let save = null, saveAt = -Infinity;
  const accountSave = () => {
    if (performance.now() - saveAt > 30000) {
      saveAt = performance.now();
      fetch('/api/save', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)).then(s => { save = s; }).catch(() => {});
    }
    return save;
  };
  // The game's move pool (movePool): normal + its own types' moves (not exclusive), those listing it as a learner, no
  // signature moves, starterFor only its own
  const learnable = (mon, m) => m && !m.signature && (!m.starterFor || m.starterFor.includes(mon.dex));
  function poolOf(mon) {
    const pool = new Set(), all = dc.moves.moves;
    for (const type of ['normal', ...mon.types]) for (const m of all) if (m.type === type && !m.exclusive && learnable(mon, m)) pool.add(m.id);
    for (const m of all) if (m.learners && m.learners.includes(mon.dex) && learnable(mon, m)) pool.add(m.id);
    return pool;
  }
  // Its pool, then the TMs taught. Starting move: the one chosen in the save, else the starter's, a move made for it,
  // its first type's
  function learnset(name) {
    const mon = dc.byName.get(name), cfg = dc.moves;
    if (!mon || !cfg || !dc.byId.size) return null;
    const key = String(mon.dex), sv = accountSave() || {}, pool = poolOf(mon);
    const ok = id => learnable(mon, (dc.byId.get(id) || {}).cfg);
    const move = id => (dc.byId.get(id) || {}).info;
    const starter = ((dc.starters && dc.starters.starters) || []).find(s => s.dex === mon.dex);
    const taughtIds = ((sv.taughtMoves || {})[key] || []).filter(id => ok(id) && !pool.has(id));
    const taught = new Set(taughtIds), chosen = (sv.startingMoves || {})[key];
    const start = chosen && (pool.has(chosen) || taught.has(chosen)) ? chosen
      : (starter && starter.startingMove) || (cfg.moves.find(m => m.starterFor && m.starterFor.includes(mon.dex)) || {}).id || cfg.startingMoves[mon.types[0] || 'normal'];
    return {
      natural: [...new Set([start, ...pool])].map(move).filter(Boolean),
      taught: taughtIds.filter(id => id !== start).map(move).filter(Boolean),
      tms: ((dc.tms && dc.tms.pokemon[key]) || []).filter(id => !taught.has(id) && !pool.has(id) && ok(id)).map(move).filter(Boolean),
    };
  }
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
      tiles[t] = wall > 128 ? 1 : liquid > 128 ? 2 : 0;
    }
    return tiles;
  }
  function terrain(d) {
    const img = d.img;
    if (!palettes.length || d.rect || !img || img.width !== 256 || img.height !== 256 || !img.getContext) return null;
    if (!terrainCache.has(img)) terrainCache.set(img, classify(img));
    return terrainCache.get(img);
  }
  function readDcCard(c, i, name = dcName(c)) {
    const { state, CFG } = h;
    const t = c.innerText;
    const lv = t.match(/\bLv\.?\s*(\d+)\s*>/i);                          // upgrade chip: current level > next
    // Z crystal ("Firium Z", chip "Z-Move"): its own slot, fired with F (SITE.zMove). Its text ("Mega Evolving removes
    // it") reads as an evolution, so it is ranked here: under a passive an owned move needs, over move upgrades
    const z = PSBotList(c.querySelectorAll('.tag-chip')).some(e => e.textContent.trim() === 'Z-Move');
    return { ...h.scoreCard({
      key: String(i + 1), name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), lv ? +lv[1] : 0),
      isNew: /\bNew\b/i.test(t), evo: c.classList.contains('evo') || CFG.evoRe.test(t), fitLow: false, fitHigh: false,
    }), ...(z && { score: 690, why: 'Z-move (bấm F: nổ quanh mình, hồi 120 s)', isNew: false, inBuild: false }), el: tapTarget(c) };
  }

  // ---------- run modes: Halloween event "Waves", Hyper ----------
  // The game keeps the run mode in localStorage['ps.runMode'] (normal / hyper / waves) and offers waves only while the
  // event lasts, through the menu's event card (Play Waves). Solo -> Play then starts whatever mode is stored, so
  // replays stay in it. The Solo screen reads it once when opened: if that screen is up, its own mode tab is clicked
  // (solo-mode-<mode>). The mode the player had is put back when the bot stops
  const MODE_KEY = 'ps.runMode';
  let eventSeen = false, prevMode, wanted = null;      // wanted: the mode a mode button runs
  const setMode = mode => {
    wanted = mode;
    try { prevMode = localStorage.getItem(MODE_KEY); localStorage.setItem(MODE_KEY, mode); } catch {}
    const tab = document.querySelector(`[data-testid="solo-mode-${mode}"]`);
    if (tab && h.visible(tab)) tab.click();
  };
  const restoreMode = () => {
    wanted = null;
    try { if (prevMode == null) localStorage.removeItem(MODE_KEY); else localStorage.setItem(MODE_KEY, prevMode); } catch {}
  };
  const event = {
    label: '🎃 Event Halloween',
    title: 'Chơi chế độ Waves của event Halloween (các vòng liên tiếp, rương giữa vòng, boss mỗi 25 vòng)',
    available() {
      if (document.querySelector('[data-testid="event-card-play"]')) eventSeen = true;
      return eventSeen;
    },
    start() {
      setMode('waves');
      const card = document.querySelector('[data-testid="event-card-play"]');
      if (card && h.visible(card)) card.click();
    },
    stop: restoreMode,
  };
  // Hyper: the game's tuning scales time ×2 (enemies, Eternatus at 30:00, Z-moves from 7:30), ×1.3 xp, ×1.5 coins
  const hyper = {
    label: '⚡ Hyper',
    title: 'Chơi chế độ HYPER: mọi thứ mạnh lên nhanh gấp đôi, Eternatus ở 30:00, ×1,5 xu, bảng xếp hạng riêng. Nên dùng pokémon đã nâng max',
    available: () => true,
    start() { setMode('hyper'); },
    stop: restoreMode,
  };

  // ---------- Halloween objectives (Haunted Hollow, 1-2 a round), drawn as the game's renderer does ----------
  // Active ones are listed by title in the HUD panel (done / failed ones get a ✓ / ✗). On screen: an open door glows
  // (radius 46, 30 above it), a lantern that went out glows blue above it, a caged pokémon is drawn inside its cage, a
  // lost one stands on a #7dffb0 ellipse and its goal (the chapel door) is a #5fe08a ellipse. Off screen, an arrow on
  // the screen edge points at the nearest one (#ffb347; lost pokémon / goal #7dffb0), labelled "<title> · N m" (1 m =
  // 32 world units). hold = how close to stand, in world units (the game's range around the prop, less some margin)
  const TITLES = { doors: 'Trick-or-treat', lanterns: 'Light the lanterns', cage: 'Free the caged Pokémon', escort: 'Escort the lost Pokémon' };
  // A lost pokémon stands still until touched (within ~45 of it), then follows, which the game says ("<name> is following
  // you! Take it to the green marker", 3 s). It only steps after us, so standing next to it shows no movement: the
  // message decides, moving off where it was first seen (world units) is the fallback
  let lostFrom = null, lostFollows = false;
  function objective(world, me, cam) {
    const s = cam.s, hide = new Set(), hud = h.state.hudTexts;
    const active = k => hud.has(TITLES[k]);
    const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / s;
    const nearest = list => list.reduce((b, d) => (!b || gap(d, me) < gap(b, me) ? d : b), null);
    const at = (d, dy, kind, hold) => ({ src: `quest:${kind}`, x: d.x, y: d.y + dy * s, w: 0, h: 0, hold });
    const pokes = world.filter(d => /\/sprites\//.test(d.src));
    const onTop = (p, d) => Math.abs(p.x - d.x) < 12 * s && d.y > p.y - Math.abs(p.h) / 2 && d.y < p.y + Math.abs(p.h) / 2 + 12 * s;
    // Not pickups: #5fe08a bigger than a heal berry (the lost pokémon's HP bar, the escort goal). Not enemies: the lost
    // pokémon and caged ones. The arrows aren't telegraphs
    const goal = world.find(d => d.src === 'fill:#5fe08a' && Math.abs(d.w) / s > 80);
    for (const d of world) if (d.src === 'fill:#5fe08a' && Math.max(Math.abs(d.w), Math.abs(d.h)) / s > 20) hide.add(d);
    const arrows = world.filter(d => /^fill:#(ffb347|7dffb0)$/.test(d.src) && d.pts && d.pts.length === 3);
    arrows.forEach(d => hide.add(d));
    const lost = world.find(d => d.src === 'fill:#7dffb0' && d.pts && d.pts.length > 8);
    if (lost) pokes.filter(p => onTop(p, lost)).forEach(p => hide.add(p));
    const cages = world.filter(d => /^canvas:24x28#/.test(d.src));
    // A caged one idles centred in the cage, its sprite ~15 below the cage's centre
    const inCage = (p, c) => /\/Idle\.png/.test(p.src) && Math.abs(p.x - c.x) < 3 * s && p.y - c.y > 5 * s && p.y - c.y < 25 * s;
    const caged = cages.filter(c => pokes.some(p => inCage(p, c)));
    for (const c of caged) pokes.filter(p => inCage(p, c)).forEach(p => hide.add(p));
    let target = null;
    // Escort first (it has a time limit): walked into the lost pokémon until it follows, then to the goal. Telling them
    // apart by distance failed: one still waiting ~70 away was taken for following, so the bot circled it
    if (!active('escort')) { lostFrom = null; lostFollows = false; }
    else {
      if ([...hud].some(t => /is following you/i.test(t))) lostFollows = true;
      if (lost) {
        const w = { x: (lost.x - cam.e) / s, y: (lost.y - cam.f) / s };
        if (!lostFrom) lostFrom = w;
        else if (Math.hypot(w.x - lostFrom.x, w.y - lostFrom.y) > 24) lostFollows = true;
      }
      if (lost && !lostFollows) target = at(lost, 0, 'escort', 0);
      // The goal counts the pokémon, not us: it has to get within 56 of the centre while trailing ~40 behind. Walked
      // through the centre, never stood still short of it (stopping 30 out left it ~70 away and the escort never ended)
      else if (goal) target = at(goal, 0, 'escort', 0);
    }
    if (!target && active('doors')) {
      const g = nearest(world.filter(d => d.src === 'fill:gradient:rgba(255,170,60,0.9)' && Math.abs(d.w) / s > 70));
      if (g) target = at(g, 30, 'doors', 26);
    }
    if (!target && active('lanterns')) {
      const g = nearest(world.filter(d => d.src === 'fill:gradient:rgba(160,190,255,0.7)'));
      const lamp = g && nearest(world.filter(d => /^canvas:8x23#/.test(d.src) && gap(d, g) < 60));
      if (lamp) target = at(lamp, Math.abs(lamp.h) / 2 / s, 'lanterns', 30);
    }
    if (!target && active('cage')) {
      const c = nearest(caged);
      if (c) target = at(c, Math.abs(c.h) / 2 / s, 'cage', 36);
    }
    // Off screen: along the arrow, at the labelled distance from the player. The lost pokémon's arrow first, then the
    // objectives' (thieves / roaming legends have arrows of other colours)
    if (!target) {
      const texts = [...hud], titles = Object.values(TITLES);
      const metres = d => {
        const quest = d.src === 'fill:#ffb347';
        const t = texts.find(t => / m$/.test(t) && titles.some(x => t.startsWith(x + ' ·')) === quest);
        return t ? +(t.match(/(\d+) m$/) || [])[1] : 0;
      };
      const a = arrows.find(d => d.src === 'fill:#7dffb0' && active('escort')) || arrows.find(d => d.src === 'fill:#ffb347');
      if (a) {
        const ux = a.pts[0].x - a.e, uy = a.pts[0].y - a.f, l = Math.hypot(ux, uy) || 1;
        const dx = ux / l, dy = uy / l, wx = a.e - me.x, wy = a.f - me.y, r = (metres(a) || 20) * 32 * s;
        const b = wx * dx + wy * dy, t = -b + Math.sqrt(Math.max(0, b * b - (wx * wx + wy * wy) + r * r));
        target = { src: `quest:arrow`, x: a.e + dx * t, y: a.f + dy * t, w: 0, h: 0, hold: 0 };
      }
    }
    return { target, hide };
  }

  const MENU = '[data-testid="menu-solo"], [data-testid="solo-start"]';
  const RESTART = ['[data-testid="game-exit"]', '[data-testid="saved-run-new-confirm"] [data-testid="dialog-confirm"]',
    '[data-testid="saved-run-resume"]', '[data-testid="solo-start"]', '[data-testid="menu-solo"]'];
  // Panel box: the Waves chest takes the gacha tickets (kept after the run) over Rare Candy / an upgrade. Level-up cards
  // never offer currency (game's card types: new, upgrade, evolution, stat, mega, plate, zmove, revive)
  const FARM_KEY = 'psbot.farmitems';
  const farmItems = {
    label: 'Farm vé: rương chọn Tickets',
    title: 'Rương giữa vòng (chế độ Waves) cho chọn Rare Candy / Upgrade / Tickets. Bật: luôn lấy Tickets (vé gacha, giữ lại sau khi chết). Tắt: nâng move build > Rare Candy > nâng khác > vé',
    get: () => { try { return localStorage.getItem(FARM_KEY) === '1'; } catch { return false; } },
    set: on => { try { localStorage.setItem(FARM_KEY, on ? '1' : '0'); } catch {} },
  };

  return {
    id: 'doofcraft', label: 'Doofcraft · pokesurvivor.doofcraft.com',
    events: [event, hyper],
    // Z-move: F (KeyF, the game's useZMove), a burst on every foe within 400 world units, 120 s to recharge
    zMove: { key: ['f', 'KeyF', 70], radius: 400 },
    objective,               // Halloween objectives: target + sprites that aren't enemies / pickups
    ready: () => !!document.getElementById('app'),
    canvas: () => document.querySelector('canvas.ps-canvas'),
    // The whole frame is scaled by devicePixelRatio; the world also gets the camera translation, the HUD doesn't
    isWorld: d => d.e !== 0 || d.f !== 0,
    // Effects (beams, slashes) add their own translate / rotate: pokémon sprites carry the plain camera transform
    camera: (world, pokes) => pokes[0] || world[0],
    enemyRe: /\/sprites\/[\w-]+\/(?:s\/)?(?!Faint)\w+\.png/,
    // Colours from the game's source: xp / big xp diamonds, heal berry and magnet orbs, item / chest halo; every enemy
    // and boss attack zone / beam is filled with #ff2445, and each enemy shot has a rgba(255,60,80,.35) ring under it
    // The Halloween fence's rail section is 16x14 like a chest, so it is tagged by its hash (one palette for every biome,
    // "h/fence/0"): untagged, the bot walked into the rails between the posts and got stuck
    tags: { 'fill:#7fe0ff': 'xp', 'fill:#ffd95e': 'xp', 'fill:#5fe08a': 'good', 'fill:#ff9ed8': 'good', 'fill:#ffe14d': 'good',
      'fill:#ff2445': 'hazard', 'fill:rgba(255,60,80,0.35)': 'shot', 'canvas:16x14#12u4dbo': 'wall' },
    sizeTags: false,
    // Prop sprites by size, from the game's sprite generators: rock (solid, breaks into xp / coins / heals), trap
    // (hurts 10% max HP), the biome's tree (forest 30x40, crystal 26x40, dead 28x40: solid, never breaks), Halloween
    // lantern / cage / fence post (solid) and pumpkin (breaks), healing spring (heals while stood on, every biome). Not
    // by size: the 16x14 fence rail (same size as a chest), tagged by hash above
    bySize: { 'canvas:34x16': 'heal', 'canvas:22x17': 'break', 'canvas:14x14': 'hazard', 'canvas:30x40': 'wall', 'canvas:26x40': 'wall', 'canvas:28x40': 'wall',
      'canvas:8x23': 'wall', 'canvas:24x28': 'wall', 'canvas:6x20': 'wall', 'canvas:14x11': 'break' },
    evolveNeeds,              // move name -> passive card it needs to evolve
    moveTable,                // this game's moves (the core never uses the wiki's moves.js here)
    learnset,                 // what a pokémon learns here: natural moves (starting move first), TMs taught / not yet
    // The partner picked on the menu, from the account's save
    partnerName() {
      const sv = accountSave(), mon = sv && sv.partner && dc.byDex.get(sv.partner.dex);
      return mon ? mon.name.toLowerCase() : '';
    },
    // Armor cards worth taking: +0.1 defence each up to 2 (damage taken / (1 + defence): ~67 % less), game config
    armorCards: 20,
    terrain,                  // map chunk -> 16x16 tiles (0 floor, 1 wall, 2 liquid) for path finding
    // Digits 1-4 pick the active slot (no consumable hotkeys); E sends a cycleSlot request to the server, so not every frame
    // Chests are solid here (radius 12): "next to" one is farther than a walk-over suitcase
    cfg: { useItems: false, swapEvery: 200, blockRank: false, caseReach: 45 },
    levelUp() {
      const box = dcBox();
      if (!box || !/^level|cleared/i.test(dcTitle(box))) return null;
      const rr = box.querySelector('[data-testid="reroll"]');
      return { cards: PSBotList(box.querySelectorAll('button.ps-card')).map((c, i) => readDcCard(c, i)), rerolls: rr ? +((rr.innerText.match(/\((\d+)\)/) || [])[1] || 0) : 0 };
    },
    choiceOpen: () => !!document.querySelector('.ps-choice:not(.hidden) .ps-box'),
    // Waves chest (between rounds, "Pick one: this run, or currency"): upgrading a build move first, then Rare Candy (a
    // level = a level-up pick), any other upgrade, gacha tickets last (first with farmItems). Other choices (Choice Band slot…): the first
    // option
    farmItems,
    otherChoice() {
      const box = dcBox();
      if (!box || /^level|cleared|an item|bond/i.test(dcTitle(box))) return;
      const cards = PSBotList(box.querySelectorAll('button.ps-card'));
      if (!cards.length) return;
      if (/^chest/i.test(dcTitle(box))) {
        return h.pickRow('rương', cards.map((c, i) => {
          const name = dcName(c), up = name.match(/^upgrade:\s*(.+)/i), o = { key: String(i + 1), name, text: c.innerText.replace(/\s+/g, ' ').slice(0, 80), el: tapTarget(c) };
          if (/^rare candy/i.test(name)) return { ...o, score: 2, why: 'lên 1 cấp' };
          if (!up) return farmItems.get() ? { ...o, score: 9, why: 'vé gacha (farm vé)' } : { ...o, score: 0, why: 'vé gacha' };
          const s = readDcCard(c, i, up[1].trim());
          return { ...o, score: s.inBuild ? 3 : 1, why: `nâng ${up[1].trim()} (${s.why || 'ngoài build'})` };
        }));
      }
      h.pickRow(dcTitle(box) || 'chọn', cards.map((c, i) => ({ key: String(i + 1), name: dcName(c), score: -i, text: c.innerText.replace(/\s+/g, ' ').slice(0, 80), el: tapTarget(c) })));
    },
    // The core only passes buttons that are on top at their centre; on phones (zoom, rotation, scrolling) that test can
    // miss them all, so the game's own test ids are also looked up directly (visible ones)
    menu: buttons => buttons.some(b => b.matches(MENU)) || PSBotList(document.querySelectorAll(MENU)).some(h.visible),
    // Results -> menu, continue a saved run (or confirm ending it), Solo -> Play
    restartButton(buttons) {
      // A mode button never continues a saved run of another mode (its card says which: Normal / HYPER / WAVES), nor
      // ends it: the bot stops and says so
      const resume = document.querySelector('[data-testid="saved-run-resume"]');
      if (wanted && resume && h.visible(resume)) {
        const m = ((document.querySelector('[data-testid="saved-run-mode"]') || {}).textContent || '').trim();
        const saved = /hyper/i.test(m) ? 'hyper' : /waves/i.test(m) ? 'waves' : 'normal';
        if (saved !== wanted) return { halt: `Có ván ${m || saved} lưu dở: chơi tiếp hoặc bấm End run trong game trước, rồi bấm lại nút.` };
      }
      for (const sel of RESTART) {
        const b = buttons.find(b => b.matches(sel));
        if (b) return b;
      }
      for (const sel of RESTART) {
        const b = PSBotList(document.querySelectorAll(sel)).find(h.visible);
        if (b) return b;
      }
    },
  };
};
