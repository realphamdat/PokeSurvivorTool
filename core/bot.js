// ==UserScript==
// @name         PokeSurvivor Bot
// @author       damhieu2808
// @homepageURL  https://github.com/damhieu2808/PokeSurvivorTool
// @match        https://pokesurvivor.com/*
// @match        https://www.pokesurvivor.com/*
// @match        https://pokesurvivor.doofcraft.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
//
// PokeSurvivor Bot — tác giả: damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool
// MIT License (xem LICENSE): dùng lại / chỉnh sửa thì phải giữ dòng bản quyền và giấy phép.
//
// Load the repo folder as a Chrome extension (manifest.json), or run loader.js / psbot.user.js. Pasting into the Console:
// sites/<bản game>/site.js + data.js and core/moves.js first, then this file. Per-version code lives in sites/<id>/.
// F6 = danh mục mọi sprite (ảnh + chỉ số + nút gắn nhãn) · F7 = gắn nhãn bằng click (1 tốt / 2 nguy hiểm / 3 rift / 4 vật cản / 5 buff / 6 kinh nghiệm / 7 vali / 8 phá được / 9 hồi máu / 0 xoá)
// F8 = bật/tắt bot · F9 = overlay · PSBot.catalog() = in + copy danh mục · PSBot.tags() = xem nhãn đã lưu
// PSBot.exportConfig() / nút "Xuất data.js" (F6) = tải data.js chứa nhãn + build; chép đè vào sites/<bản game>/ để máy khác có sẵn
// While loaded, Firestore/RTDB writes whose path matches CFG.rankRe are replaced by no-ops.
// Reload the page to play normally (unblocked) again.
(function start(tries = 0) {
  // Game version profile (sites/<id>/site.js, picked by the manifest / loader from the host). Its methods run later,
  // once the helpers they use (h, filled in below) exist
  if (!window.PSBotSite) return void console.warn('[PSBot] chạy sites/<bản game>/site.js trước bot.js');
  const h = {};
  const SITE = window.PSBotSite(h);
  // Loaded by the extension at document_idle the game page may not exist yet: retry until it does
  if (!SITE.ready()) {
    // The on-screen loading line the userscript puts up (phones have no console): say what we are waiting for
    const status = document.getElementById('psbot-status');
    if (status && tries === 20) status.textContent = 'PSBot: chưa thấy màn hình game — vào game rồi đợi, hoặc tải lại trang';
    return void setTimeout(() => start(tries + 1), 500);
  }
  if (window.PSBot) window.PSBot.unload();
  // Keep VERSION equal to "version" in manifest.json: a higher version on GitHub shows the update notice
  const VERSION = '1.7.5';
  const REPO = 'https://github.com/damhieu2808/PokeSurvivorTool';

  const CFG = {
    // Each frame one target is chosen: rift > good item (within goodRange) > nearest enemy.
    contact: 80,          // world units (from enemy edge): only this close do enemies push the player away
    engage: 120,          // world units: distance kept from the targeted enemy's edge while fighting it
    // Bosses (profile's bossAura): pushed away within bossRange of their feet, fought from bossEngage. pokesurvivor.com:
    // a boss stomps when the player is within 125 of it, a zone ~125 wide with 0.7-0.85 s warning (no time to run out)
    bossRange: 170,
    bossEngage: 210,
    lowHp: 0.5,           // HP share under which the bot only survives: no xp / breakables / hunting, enemies avoided harder
    hurtDrop: 0.25,       // ... and so does losing this share of HP within hurtWindow ms (a hard hitter: by 50 % it's too late),
    hurtWindow: 2000,     //     for hurtHold ms after
    hurtHold: 4000,
    fleeWeight: 15,       // low: steps away from the crowd as a whole too (enemies within 400, nearer ones count more)
    // Same with fleeCrowdWeight once crowdFlee enemies' edges are within 250, at any HP. Off (Infinity): it slowed the
    // kills (fewer levels later on) and one run can't tell whether it helps; try with PSBot.CFG.crowdFlee = 10
    crowdFlee: Infinity,
    fleeCrowdWeight: 8,
    huntWeight: 3,
    huntHp: 0.75,         // enemies are only walked up to above this HP, and with fewer than huntCrowd enemies' edges within
    huntCrowd: 8,         // 200; else the player holds back and lets moves fire (walking up to one dragged it into the horde)
    goodRange: 1500,      // world units: good items within this become the target
    goodWeight: 5,
    riftWeight: 40,       // outweighs hazard / enemy avoidance (up to ~35): a rift is worth walking through them for
    riftIgnore: 3000,     // ms a rift / event objective is skipped after finding no path to it (other targets: 20 s); never for getting stuck
    // Prizes ("prize" tag, from the site's scene): a fleeing coin thief, a shiny to catch. Chased right after rifts, unless
    // inside a hazard; an enemy one (engage: true) is fought at CFG.engage like any enemy, the others walked into
    prizeWeight: 10,
    questWeight: 10,      // event objectives (profile's objective()) while stood on: a cage takes 6 s, often in a horde
    questHp: 0.7,         // ... only while HP is above this and fewer than questCrowd enemies' edges are within contact: a
    questCrowd: 3,        //     cage's ambush and the round's horde killed runs that kept at it
    magnet: 100,          // world units: initial XP pickup radius; re-learned while playing (state.magnet)
    xpRange: 900,         // world units: XP orbs within this (but outside the pickup radius) become the target
    xpWeight: 4,
    caseReach: 25,        // world units: player must stand on top of a suitcase ("case" tag) to open it
    caseTime: 5500,       // ms of (unpaused) game time to stay next to a suitcase
    // Once stood on something that takes time (suitcase, healing spring, event objective), stay until it's done: hazards,
    // enemies and low HP no longer move the player off it (the heals it drops make up for the hits), unless HP < holdHp
    holdHp: 0.25,
    // Pinned in a corner: walking for pinTime ms with all positions within pinMove world units, a wall nearby -> escape run
    // away from the walls (dodging back and forth there travels, so the stuck check never fires)
    pinTime: 2000,
    pinMove: 30,
    breakRange: 500,      // world units: breakables ("break" tag) farther than this are not worth the walk
    buffReach: 80,        // world units: this close to a buff shrine (gem pillar) counts as "visited"
    buffCooldown: 30000,  // ms before going back to the same shrine
    // Healing spring ("heal" tag): heals while standing on it, only when HP isn't full. Walked to under healBelow HP, then
    // stood on until full; skipped for healIgnore ms when HP stops rising on it for healIdle ms (dried up)
    healBelow: 0.8,
    healReach: 18,        // world units: the game heals within 26 of its centre
    healIdle: 1500,
    healIgnore: 45000,
    lookahead: 140,       // world units: how far ahead each candidate direction is evaluated
    // Path finding (A*) around "wall" sprites and walls we got stuck on, when the straight line to the target is blocked
    cell: 32,             // world units per grid cell
    pathRadius: 48,       // cells around the player (the grid is (2r+1)²)
    bodyRadius: 14,       // world units added around obstacles: the player's own size
    pathMaxNodes: 6000,   // A* gives up (target treated as unreachable) after expanding this many cells
    aim: false,           // true = move the mouse cursor onto the nearest enemy (if moves aim at the cursor)
    hazardMargin: 40,     // world units added around hazard effects
    shotLookahead: 600,   // ms: an enemy shot ("shot" tag) counts as a hazard along the path it flies in that time
    autoTelegraph: true,  // untagged red-ish path shapes (attack range previews) count as hazards
    enemyRe: SITE.enemyRe,
    // src -> 'good' | 'hazard' | 'rift' | 'wall' | 'buff' | 'heal' | 'safe'; edit with F6/F7, saved in localStorage
    tags: { ...SITE.tags },
    autoPick: true,
    // Consumable item slots (hotkeys 5-8): pressed blindly while a run is unpaused, so any item gets used at once
    useItems: true,
    itemKeys: ['5', '6', '7', '8'],
    itemEvery: 1000,      // ms between presses
    // Only the active move fires: cycle it (E = next) so every move's cooldown gets used
    swapSkills: true,
    swapEvery: 10,        // ms between switches; the bot loop runs once per frame (~16 ms), so below that = every frame
    // Held items to drop for any other item, even an unknown one
    swapAwayItems: ['choice band'],
    // Held items ("An item! You can only hold one"): higher = better. Survival first, the order
    // BoundlessEgret/pokesurvivor-autofarm settled on (runs last longer = more coins). Edit freely.
    itemScores: {
      'shell bell': 11,     // heal 4% of damage dealt: the more the moves hit, the more it heals
      'leftovers': 10,      // 1.5% max HP/s regen
      'quick claw': 9,      // -20% cooldown on every move, no downside
      'focus sash': 8,      // survive a KO hit once per 60 s
      'assault vest': 7,    // -20% damage taken (doofcraft: +32% defence)
      'rocky helmet': 6,    // only punishes melee attackers
      'lucky egg': 5,       // +30% XP -> more levels
      'amulet coin': 4,     // more coins at the end of the run, no combat effect
      'choice scarf': 3,    // +35% speed
      'life orb': 1,        // +30% damage, small HP cost per attack (never KOs)
      'choice band': 0,     // +40% damage, but locks moves (breaks E skill cycling): only when nothing else is offered
    },
    // Card text that marks "this pick unlocks the evolution of a maxed skill" (adjust once the real wording is known)
    evoRe: /evol|evoluc|awaken|despert|unlock|desbloq|tiến hoá|★|⭐/i,
    // Active move slots (incl. the starting move), unless the site reads the game's own (SITE.moveSlots). Moves are
    // cycled (swapSkills), so every slot is filled before anything is upgraded; with a build, slots its missing moves
    // still need are kept free
    maxSkills: 4,
    // Pokémon name (as shown in the HUD, lower-case) -> moves in priority order. Build moves are always
    // taken/levelled first; moves outside the build are avoided. Set them in the "Moveset" popup (saved to data.js on export).
    builds: {},
    // Auto replay: when no run is active, click the first visible button matching these, in order
    autoRestart: true,
    restartSteps: [
      /^(play again|try again|retry|restart|jugar de nuevo|volver a jugar|reintentar|otra vez|chơi lại)/i,
      /^(back to menu|volver al men[uú]|về menu)/i,
      /^(play|jugar|chơi)/i,
      /^(start|go!?|let'?s go|comenzar|empezar|bắt đầu)/i,
      /^(back|menu|volver|ok|aceptar|close|cerrar|đóng|not now|ahora no|got it|entendido)$/i,
    ],
    restartAvoid: /together|juntos|friend|amigo|gacha|shop|tienda|log ?out|sign|link|delete|borrar|revive|revivir|gem|buy|comprar/i,
    background: true,     // keep the game running when the tab is hidden / window covered (see "keep running")
    blockRank: true,
    rankRe: /rank|leader|board|score|season/i,
    logNet: true,
    ...SITE.cfg,
  };

  // Doofcraft builds a new game canvas for every run: re-looked up each frame (a detached placeholder until then)
  let canvas = SITE.canvas() || document.createElement('canvas');
  const state = {
    // Idle until ▶ Chạy in the control panel (or F8); target = runs to play (0 = forever), done = runs finished
    on: false, target: 0, done: 0, debug: false, keys: {}, dir: null, frame: [], lastFrame: [], texts: [], hudTexts: new Set(),
    posHist: [], walls: [], ignore: [], stuck: [], escape: null, pickAt: 0, netBlocked: 0, picks: {}, newSkills: 0,
    magnet: CFG.magnet, prevXp: [],
  };
  const log = (...a) => console.log('%c[PSBot]', 'color:#7cf', ...a);
  // Priority: defaults above < data.js (bundled with the extension, same on every machine) < localStorage (this browser)
  const DATA = window.PSBotData || {};
  Object.assign(CFG.tags, DATA.tags);
  const userBuilds = { ...DATA.builds };
  // Only what the user changed is saved (null = a default label removed), so a fixed default in data.js reaches them.
  // Up to 1.5.14 the whole table was saved: that copy of the old data.js (the healing spring as "good") is dropped
  // once, keeping only labels for sprites the defaults don't know
  const TAG_KEY = 'psbot.tags', TAG_VER = 'psbot.tagsV', defaultTags = { ...CFG.tags };
  try {
    let saved = JSON.parse(localStorage.getItem(TAG_KEY) || '{}');
    if (localStorage.getItem(TAG_VER) !== '2') {
      const sizeTag = k => defaultTags[k.split('#')[0]] || (SITE.bySize && SITE.bySize[k.split('#')[0]]);
      saved = Object.fromEntries(Object.entries(saved).filter(([k, v]) => !(k in defaultTags) && !(v === 'good' && sizeTag(k) === 'heal')));
      localStorage.setItem(TAG_KEY, JSON.stringify(saved)); localStorage.setItem(TAG_VER, '2');
    }
    for (const [k, v] of Object.entries(saved)) if (v === null) delete CFG.tags[k]; else CFG.tags[k] = v;
  } catch {}
  const saveTags = () => {
    const diff = {};
    for (const k in CFG.tags) if (CFG.tags[k] !== defaultTags[k]) diff[k] = CFG.tags[k];
    for (const k in defaultTags) if (!(k in CFG.tags)) diff[k] = null;
    try { localStorage.setItem(TAG_KEY, JSON.stringify(diff)); } catch {}
  };
  const BUILD_KEY = 'psbot.builds';
  try { Object.assign(userBuilds, JSON.parse(localStorage.getItem(BUILD_KEY) || '{}')); } catch {}
  // Below data.js: the builds BoundlessEgret/pokesurvivor-autofarm ships (all with Shell Bell, Bulbasaur's needs Energy
  // Ball bought as its starting move). Any other pokémon without a Moveset picks its moves itself (scoreCard: autoNew)
  const defaultBuilds = {
    mewtwo: ['Confusion', 'Harden', 'Nasty Plot', 'Psychic'],
    kyogre: ['Bubble', 'Nasty Plot', 'Aqua Ring', 'Hydro Pump'],
    bulbasaur: ['Energy Ball', 'Nasty Plot', 'Leaf Storm', 'Giga Drain'],
  };
  const isDefaultBuild = (n, b) => String(defaultBuilds[n]) === String(b);
  Object.assign(CFG.builds, defaultBuilds, userBuilds);
  for (const k in CFG.builds) if (!CFG.builds[k].length) delete CFG.builds[k];   // [] = build deleted on this machine

  // ---------- frame capture ----------
  const P = CanvasRenderingContext2D.prototype;
  const origDraw = P.drawImage, origArc = P.arc;
  // Offscreen canvases are keyed by size + pixel hash so same-sized sprites (chest vs bush) differ
  const canvasKeys = new WeakMap();
  const srcName = img => {
    if (img.src) return img.src.replace(location.origin, '');
    let k = canvasKeys.get(img);
    if (!k) {
      k = `canvas:${img.width}x${img.height}`;
      try {
        const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13 + d[i + 3] * 17) | 0;
        k += '#' + (h >>> 0).toString(36);
      } catch {}
      canvasKeys.set(img, k);
    }
    return k;
  };
  // Exact key first, then the size-only key (older tags / defaults), then the site's own tags by sprite size (doofcraft
  // builds each prop sprite at a size of its own: "canvas:22x17" = rock)
  const tagOf = src => CFG.tags[src] || (SITE.sizeTags ? CFG.tags[src.split('#')[0]] : SITE.bySize && SITE.bySize[src.split('#')[0]]) || undefined;
  const record = (ctx, src, cx, cy, w, h, img, rect) => {
    const m = ctx.getTransform();
    state.frame.push({ src, x: m.a * cx + m.c * cy + m.e, y: m.b * cx + m.d * cy + m.f, w: w * m.a, h: h * m.d, s: m.a, e: m.e, f: m.f, img, rect });
  };
  P.drawImage = function (img, ...a) {
    if (this.canvas === canvas) {
      const [dx, dy, dw, dh] = a.length === 8 ? a.slice(4) : a.length === 4 ? a : [a[0], a[1], img.width, img.height];
      record(this, srcName(img), dx + dw / 2, dy + dh / 2, dw, dh, img, a.length === 8 ? a.slice(0, 4) : null);
    }
    return origDraw.call(this, img, ...a);
  };
  P.arc = function (x, y, r, a0, a1, ccw) {
    if (this.canvas === canvas) { record(this, `arc:${this.fillStyle}`, x, y, r * 2, r * 2); addArc(this, x, y, r, r, 0, a0, a1, ccw); }
    return origArc.call(this, x, y, r, a0, a1, ccw);
  };
  // HUD text (move names, timer) tells which skills the player already owns
  const origText = P.fillText;
  P.fillText = function (text, ...a) {
    if (this.canvas === canvas) state.texts.push(String(text).trim());
    return origText.call(this, text, ...a);
  };

  // Attack telegraphs (lines, beams, circles, cones) are drawn as paths, not sprites.
  // Path points are tracked in screen space; on fill/stroke the shape is recorded as
  // a frame item with geometry (poly / line) keyed "fill:<style>" or "stroke:<style>".
  const PATH = { subs: [], cur: null };
  const pathOrig = { beginPath: P.beginPath, moveTo: P.moveTo, lineTo: P.lineTo, rect: P.rect, ellipse: P.ellipse, fill: P.fill, stroke: P.stroke, fillRect: P.fillRect, strokeRect: P.strokeRect };
  const tp = (ctx, x, y) => { const m = ctx.getTransform(); return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }; };
  const addPt = (ctx, x, y, fresh) => {
    if (fresh || !PATH.cur) PATH.subs.push(PATH.cur = []);
    PATH.cur.push(tp(ctx, x, y));
  };
  const addArc = (ctx, x, y, rx, ry, rot, a0, a1, ccw) => {
    let span = ccw ? a0 - a1 : a1 - a0;
    if (span < 0 || span > Math.PI * 2) span = Math.PI * 2;
    const n = Math.max(6, Math.ceil(span / (Math.PI / 8)));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (ccw ? -1 : 1) * span * i / n;
      const ex = rx * Math.cos(a), ey = ry * Math.sin(a);
      addPt(ctx, x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot));
    }
  };
  // A gradient keys by its first colour stop ("gradient:rgba(255,170,60,0.9)"): glows of different props differ
  const G2 = CanvasGradient.prototype, origStop = G2.addColorStop, gradColor = new WeakMap();
  G2.addColorStop = function (at, color) { if (!gradColor.has(this)) gradColor.set(this, String(color).replace(/\s+/g, '')); return origStop.call(this, at, color); };
  const styleKey = s => typeof s === 'string' ? s.replace(/\s+/g, '') : gradColor.has(s) ? `gradient:${gradColor.get(s)}` : 'gradient';
  const recordShape = (ctx, kind, pts, style, src = `${kind === 'line' ? 'stroke' : 'fill'}:${styleKey(style)}`) => {
    const m = ctx.getTransform(), s = m.a;
    if (!SITE.isWorld({ s, e: m.e, f: m.f }) || pts.length < 2) return;   // HUD / UI
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const lw = kind === 'line' ? ctx.lineWidth * s : 0;
    if ((x1 - x0 + lw) * (y1 - y0 + lw) < 150 && !tagOf(src)) return;   // ignore tiny particles (tagged ones, e.g. shots, kept)
    state.frame.push({ src, x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0 + lw, h: y1 - y0 + lw,
      s, e: m.e, f: m.f, shape: kind, pts, lw, alpha: ctx.globalAlpha });
  };
  P.beginPath = function () { if (this.canvas === canvas) { PATH.subs = []; PATH.cur = null; } return pathOrig.beginPath.call(this); };
  P.moveTo = function (x, y) { if (this.canvas === canvas) addPt(this, x, y, true); return pathOrig.moveTo.call(this, x, y); };
  P.lineTo = function (x, y) { if (this.canvas === canvas) addPt(this, x, y); return pathOrig.lineTo.call(this, x, y); };
  P.rect = function (x, y, w, h) {
    if (this.canvas === canvas) { addPt(this, x, y, true); addPt(this, x + w, y); addPt(this, x + w, y + h); addPt(this, x, y + h); }
    return pathOrig.rect.call(this, x, y, w, h);
  };
  P.ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) {
    if (this.canvas === canvas) addArc(this, x, y, rx, ry, rot, a0, a1, ccw);
    return pathOrig.ellipse.call(this, x, y, rx, ry, rot, a0, a1, ccw);
  };
  P.fill = function (...a) {
    // fill() / fill('evenodd') fill the tracked path (doofcraft passes the rule); fill(path2D) is not tracked
    if (this.canvas === canvas && typeof a[0] !== 'object') PATH.subs.forEach(sp => sp.length >= 3 && recordShape(this, 'poly', sp, this.fillStyle));
    return pathOrig.fill.apply(this, a);
  };
  // A dashed outline is also recorded as the area it closes, keyed by its dash and width ("dash:4,4/2"), whatever its
  // colour: pokesurvivor.com outlines every enemy telegraph so, in the attacker's type colour
  const dashKey = ctx => { const d = ctx.getLineDash(); return d.length ? `dash:${d.join(',')}/${ctx.lineWidth}` : null; };
  P.stroke = function (...a) {
    if (this.canvas === canvas && !a.length) {
      const dash = dashKey(this);
      PATH.subs.forEach(sp => { recordShape(this, 'line', sp, this.strokeStyle); if (dash && sp.length >= 3) recordShape(this, 'poly', sp, null, dash); });
    }
    return pathOrig.stroke.apply(this, a);
  };
  P.strokeRect = function (x, y, w, h) {
    const dash = this.canvas === canvas && dashKey(this);
    if (dash) recordShape(this, 'poly', [tp(this, x, y), tp(this, x + w, y), tp(this, x + w, y + h), tp(this, x, y + h)], null, dash);
    return pathOrig.strokeRect.call(this, x, y, w, h);
  };
  P.fillRect = function (x, y, w, h) {
    if (this.canvas === canvas) recordShape(this, 'poly', [tp(this, x, y), tp(this, x + w, y), tp(this, x + w, y + h), tp(this, x, y + h)], this.fillStyle);
    return pathOrig.fillRect.call(this, x, y, w, h);
  };
  // Untagged shapes in a reddish colour are treated as telegraphs by default
  const isTelegraph = d => {
    const m = d.src.match(/(?:fill|stroke):(?:#([0-9a-f]{6})|rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\))/i);
    if (!m) return false;
    const [r, g, b] = m[1] ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : [+m[2], +m[3], +m[4]];
    return r >= 170 && g <= 120 && b <= 120;
  };

  // ---------- input ----------
  const KEYS = { up: ['w', 'KeyW', 87], down: ['s', 'KeyS', 83], left: ['a', 'KeyA', 65], right: ['d', 'KeyD', 68] };
  const sendKey = (type, key, code, keyCode) =>
    window.dispatchEvent(new KeyboardEvent(type, { key, code, keyCode, which: keyCode, bubbles: true }));
  const setKey = (k, down) => {
    if (!!state.keys[k] === down) return;
    state.keys[k] = down;
    sendKey(down ? 'keydown' : 'keyup', ...KEYS[k]);
  };
  const releaseAll = () => Object.keys(KEYS).forEach(k => setKey(k, false));
  const tap = (key, code, keyCode) => { sendKey('keydown', key, code, keyCode); setTimeout(() => sendKey('keyup', key, code, keyCode), 60); };
  // Phones: the game hides the hotkey digits, so a choice is tapped instead (never a key on top: it could hit the next
  // dialog). One pointerdown / pointerup / click on the topmost node at its centre, where the game's handler may sit
  const tapEl = el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const t = document.elementsFromPoint(x, y).find(e => el.contains(e)) || el;
    const o = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true };
    t.dispatchEvent(new PointerEvent('pointerdown', o)); t.dispatchEvent(new PointerEvent('pointerup', o)); t.click();
  };

  function applyDir(dir) {
    state.dir = dir;
    const [x, y] = dir || [0, 0];
    setKey('left', x < -0.38); setKey('right', x > 0.38);
    setKey('up', y < -0.38); setKey('down', y > 0.38);
  }

  // ---------- movement ----------
  const segDist = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  // Screen-space distance from point p to a recorded shape; negative when inside
  function shapeDist(h, p) {
    const pts = h.pts;
    let edge = Infinity;
    for (let i = 0; i < pts.length - 1; i++) edge = Math.min(edge, segDist(p, pts[i], pts[i + 1]));
    if (h.shape === 'line') return edge - h.lw / 2;
    edge = Math.min(edge, segDist(p, pts[pts.length - 1], pts[0]));
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if ((pts[i].y > p.y) !== (pts[j].y > p.y) && p.x < (pts[j].x - pts[i].x) * (p.y - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x) inside = !inside;
    }
    return inside ? -edge : edge;
  }
  const DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);

  // ---------- path finding ----------
  // A grid of CFG.cell world units around the player, rebuilt for each search: cells under walls are blocked,
  // hazards and enemy contact zones only cost more. fill(box, fn) calls fn(cell index, cell centre x, y) for the
  // cells overlapping a world-space box
  function makeGrid(cx, cy) {
    const R = CFG.pathRadius, n = 2 * R + 1, cell = CFG.cell;
    const g = { n, ox: Math.floor(cx / cell) - R, oy: Math.floor(cy / cell) - R, blocked: new Uint8Array(n * n), cost: new Float32Array(n * n) };
    g.at = (x, y) => [Math.floor(x / cell) - g.ox, Math.floor(y / cell) - g.oy];
    g.fill = (x0, y0, x1, y1, fn) => {
      const [i0, j0] = g.at(x0, y0), [i1, j1] = g.at(x1, y1);
      for (let j = Math.max(0, j0); j <= Math.min(n - 1, j1); j++)
        for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) fn(j * n + i, (g.ox + i + 0.5) * cell, (g.oy + j + 0.5) * cell);
    };
    return g;
  }
  // Straight walk from a to b (world) crosses no blocked cell; a's own cell is skipped (we may stand against a wall),
  // cells outside the grid count as free. pad: also the two lines pad to each side (the body's width), so a corner
  // isn't clipped on the way
  function lineClear(g, a, b, pad = 0) {
    const len = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(len / (CFG.cell / 2));
    const nx = pad * (a.y - b.y) / (len || 1), ny = pad * (b.x - a.x) / (len || 1);
    for (const [ox, oy] of pad ? [[0, 0], [nx, ny], [-nx, -ny]] : [[0, 0]]) {
      const [si, sj] = g.at(a.x + ox, a.y + oy);
      for (let k = 1; k <= steps; k++) {
        const [i, j] = g.at(a.x + ox + (b.x - a.x) * k / steps, a.y + oy + (b.y - a.y) * k / steps);
        if ((i !== si || j !== sj) && i >= 0 && j >= 0 && i < g.n && j < g.n && g.blocked[j * g.n + i]) return false;
      }
    }
    return true;
  }
  const heapPush = (h, e) => { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= e[0]) break; h[i] = h[p]; i = p; } h[i] = e; };
  const heapPop = h => {
    const top = h[0], last = h.pop();
    if (h.length) {
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= h.length) break; if (c + 1 < h.length && h[c + 1][0] < h[c][0]) c++; if (h[c][0] >= last[0]) break; h[i] = h[c]; i = c; }
      h[i] = last;
    }
    return top;
  };
  // A*, 8 directions, no diagonal squeeze between two blocked cells. The start (we may overlap a wall's margin) and
  // the goal (an item next to a wall) are never treated as blocked. Returns cell indices start -> goal, null when the
  // goal is unreachable, [] when the search gave up (CFG.pathMaxNodes; a horde makes many cells costly) or ran out of
  // cells almost at once (the start boxed in by wall margins: nothing to say about the goal). The heuristic is
  // weighted a little (x1.2): slightly longer paths, far fewer cells expanded
  function findPath(g, start, goal) {
    const n = g.n, gi = goal % n, gj = (goal - gi) / n;
    const h = idx => { const i = idx % n, dx = Math.abs(i - gi), dy = Math.abs((idx - i) / n - gj); return 1.2 * (dx + dy - 0.586 * Math.min(dx, dy)); };
    const cost = new Float32Array(n * n).fill(Infinity), from = new Int32Array(n * n).fill(-1), done = new Uint8Array(n * n);
    const open = [[h(start), start]];
    cost[start] = 0;
    let expanded = 0;
    for (; open.length && expanded < CFG.pathMaxNodes; expanded++) {
      const cur = heapPop(open)[1];
      if (cur === goal) { const path = [cur]; while (path[0] !== start) path.unshift(from[path[0]]); return path; }
      if (done[cur]) continue;
      done[cur] = 1;
      const ci = cur % n, cj = (cur - ci) / n;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ni = ci + dx, nj = cj + dy, idx = nj * n + ni;
        if ((!dx && !dy) || ni < 0 || nj < 0 || ni >= n || nj >= n || done[idx] || (g.blocked[idx] && idx !== goal)) continue;
        if (dx && dy && (g.blocked[cj * n + ni] || g.blocked[nj * n + ci])) continue;
        const c = cost[cur] + (dx && dy ? 1.414 : 1) + g.cost[idx];
        if (c < cost[idx]) { cost[idx] = c; from[idx] = cur; heapPush(open, [c + h(idx), idx]); }
      }
    }
    return open.length || expanded < 30 ? [] : null;
  }

  function tick(frame) {
    // The profile's pilot drives from the game's own state (pokesurvivor.com with G): no keys from here meanwhile, or
    // the game would take them for the player's own and the pilot would yield. The scene is still read for the F9 overlay
    const piloted = !!(SITE.pilot && SITE.pilot.active());
    if (piloted && state.dir) applyDir(null);
    let world = frame.filter(SITE.isWorld);
    if (!world.length) return;
    const pokes = world.filter(d => CFG.enemyRe.test(d.src));
    const cam = SITE.camera(world, pokes);
    const s = cam.s;
    const me = { x: canvas.width / 2, y: canvas.height / 2 };
    // A profile that can read the game's own state (pokesurvivor.com/dev.html: window.G) hands over the whole scene, in
    // screen space and sorted by tag (enemy shots already turned into hazard lines); else it is read off the sprites
    const sc = SITE.scene && SITE.scene(cam);
    // The player is the sprite of its own pokémon (dex number in the sprite path) nearest the camera centre, else the
    // sprite closest to the centre. Its own dex is the one picked most often this run, so an enemy that once stood
    // nearer the centre doesn't take its place
    const dexOf = src => (src.match(/\/(\d+)\//) || [])[1];
    const centre = d => Math.hypot(d.x - me.x, d.y - me.y);
    const closest = (list, max) => list.reduce((b, d) => { const r = centre(d); return r < max && (!b || r < b.r) ? { d, r } : b; }, null);
    const self = !sc && ((state.selfDex && closest(pokes.filter(d => dexOf(d.src) === state.selfDex), 120 * s)) || closest(pokes, 40 * s));
    if (self && dexOf(self.d.src)) {
      const v = state.selfVotes = state.selfVotes || {};
      v[dexOf(self.d.src)] = (v[dexOf(self.d.src)] || 0) + 1;
      state.selfDex = Object.keys(v).reduce((a, b) => (v[b] > v[a] ? b : a));
    }
    // Its attack frames (Shoot / Attack sprites are bigger and drawn off-centre) are the player too, not an enemy on top
    let enemies = sc ? sc.enemies : pokes.filter(d => d !== (self && self.d) && !(state.selfDex && dexOf(d.src) === state.selfDex && centre(d) < 120 * s));
    if (sc) { me.x = sc.me.x; me.y = sc.me.y; } else if (self) { me.x = self.d.x; me.y = self.d.y; }
    // Event objectives the profile reads off the frame (doofcraft Halloween): a target, and what only looks like an
    // enemy / pickup (a lost or caged pokémon, its HP bar), left out of everything below
    const obj = !sc && SITE.objective ? SITE.objective(world, me, cam) : null;
    if (obj && obj.hide.size) { world = world.filter(d => !obj.hide.has(d)); enemies = enemies.filter(d => !obj.hide.has(d)); }
    const byTag = t => sc ? sc[t] || [] : world.filter(d => tagOf(d.src) === t);
    // Bosses: the profile's bossAura is the glow drawn at a boss's feet (its position in the game). Such an enemy gets
    // .boss = that glow, and is kept CFG.bossRange off; the glow is no pickup even if its colour is tagged one
    const auras = !sc && SITE.bossAura ? world.filter(d => d.shape && SITE.bossAura(d.src) && Math.abs(d.w) / s >= 40) : [];
    for (const a of auras) {
      const e = enemies.reduce((b, e) => (!b || Math.hypot(e.x - a.x, e.y - a.y) < Math.hypot(b.x - a.x, b.y - a.y) ? e : b), null);
      if (e && Math.hypot(e.x - a.x, e.y - a.y) < Math.max(Math.abs(e.h), Math.abs(a.w))) e.boss = a;
    }
    const goods = byTag('good'), rifts = byTag('rift'), buffs = byTag('buff'), xps = byTag('xp').filter(d => !auras.includes(d)), cases = byTag('case');
    // hazardShape: the profile's fix for a hazard drawn other than it hits (pokesurvivor.com zones)
    const hazards = sc ? sc.hazard.slice() : world.filter(d => tagOf(d.src) === 'hazard' || (d.shape && !tagOf(d.src) && CFG.autoTelegraph && isTelegraph(d)))
      .map(d => (SITE.hazardShape && SITE.hazardShape(d)) || d);
    // Enemy shots: matched to last frame's (nearest within 80 world units) for their speed, then added as a hazard
    // line over where they fly in the next CFG.shotLookahead ms
    {
      const now = performance.now(), dt = Math.max(1, now - (state.shotsAt || now)), prev = state.shots || [];
      const shots = byTag('shot').map(d => ({ d, x: (d.x - cam.e) / s, y: (d.y - cam.f) / s }));
      for (const p of shots) {
        const q = prev.reduce((b, q) => { const r = Math.hypot(q.x - p.x, q.y - p.y); return r < 80 && (!b || r < b.r) ? { q, r } : b; }, null);
        const k = q ? CFG.shotLookahead / dt : 0, end = { x: p.x + (p.x - (q ? q.q.x : p.x)) * k, y: p.y + (p.y - (q ? q.q.y : p.y)) * k };
        hazards.push({ src: p.d.src, shape: 'line', lw: Math.max(Math.abs(p.d.w), Math.abs(p.d.h)), x: p.d.x, y: p.d.y, w: p.d.w, h: p.d.h,
          pts: [{ x: p.d.x, y: p.d.y }, { x: end.x * s + cam.e, y: end.y * s + cam.f }] });
      }
      state.shots = shots; state.shotsAt = now;
    }
    // Terrain tiles the site profile reads off the map (doofcraft: walls / liquid baked into the chunk images), in
    // screen space: kind 1 = wall (blocks), 2 = liquid (walkable, may hurt)
    const terrain = sc ? sc.terrain || [] : SITE.terrain ? world.flatMap(d => {
      const tiles = SITE.terrain(d);
      if (!tiles) return [];
      const tw = Math.abs(d.w) / 16, x0 = d.x - Math.abs(d.w) / 2, y0 = d.y - Math.abs(d.h) / 2, out = [];
      for (let t = 0; t < 256; t++) if (tiles[t]) out.push({ x: x0 + (t % 16) * tw, y: y0 + Math.floor(t / 16) * tw, w: tw, kind: tiles[t] });
      return out;
    }) : [];
    const prizes = byTag('prize'), heals = byTag('heal');
    state.view = { me, enemies, goods, hazards, rifts, buffs, heals, xps, cases, prizes, s, terrain };
    // Where walls block: a tall prop (tree: only the trunk is solid) around the bottom of the sprite, a squat one (rock)
    // around its middle, a big tile (128+ world units) over its whole box. rw = blocking radius in world units, 0 for
    // points we got stuck on
    const footprint = d => {
      const w = Math.abs(d.w) / s, h = Math.abs(d.h) / s;
      // Read from the game (site.js scene: "G:tree"…): already at its collision centre, boxed 2.5 x its radius
      if (/^G:/.test(d.src)) return { x: d.x, y: d.y, rw: w / 2.5, of: d };
      if (Math.max(w, h) >= 128) return { x: d.x, y: d.y, rw: Math.max(w, h) / 2, box: d, of: d };
      // The site knows where its props are solid: a circle of radius r, `up` above the sprite's bottom
      const pf = SITE.propFoot;
      if (pf) return { x: d.x, y: d.y + (h / 2 - pf.up) * s, rw: pf.r, of: d };
      return h > w * 1.2 ? { x: d.x, y: d.y + (h / 2 - w / 4) * s, rw: w / 4, of: d } : { x: d.x, y: d.y, rw: w * 0.4, of: d };
    };
    // Piloted: the overlay shows what the pilot is after (target, A* route, direction) instead of the keys' decisions,
    // with the solid props (trees, rocks, small chests) it steers around
    if (piloted) {
      state.view.walls = byTag('wall').concat(byTag('break')).map(footprint);
      if (SITE.pilot.overlay) Object.assign(state.view, SITE.pilot.overlay(cam));
      return;
    }

    // Stuck detection: player's world position barely changes while a key is held.
    // Each stuck event leaves a "wall" point ahead of the player, kept for the whole run (path finding goes around
    // it); repeated stuck events trigger an escape run in a random direction away from the nearby ones.
    const now = performance.now();
    const e0 = cam.e, f0 = cam.f;
    const toScreen = w => ({ x: w.x * s + e0, y: w.y * s + f0 });
    const meW = { x: (me.x - e0) / s, y: (me.y - f0) / s };
    state.walls = state.walls.filter(w => w.until > now);
    state.ignore = state.ignore.filter(w => w.until > now);

    // Learn the XP pickup radius: an orb that was resting and starts moving (pulled in)
    // or vanishes was at about the pickup radius from the player one frame earlier.
    const xpNow = xps.map(d => ({ x: (d.x - e0) / s, y: (d.y - f0) / s, sx: d.x, sy: d.y, rest: false }));
    for (const p of xpNow) p.rest = state.prevXp.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 4);
    for (const q of state.prevXp) {
      if (!q.rest || xpNow.some(p => Math.hypot(p.x - q.x, p.y - q.y) < 4)) continue;
      const onScreen = q.sx > 30 && q.sy > 30 && q.sx < canvas.width - 30 && q.sy < canvas.height - 30;
      const d = Math.hypot(q.x - state.prevMe.x, q.y - state.prevMe.y);
      if (onScreen && d > 20 && d < state.magnet * 3) state.magnet = state.magnet * 0.8 + d * 0.2;
    }
    state.prevXp = xpNow; state.prevMe = meW;
    // While the game is paused (level-up / item dialogs) the player can't move: not "stuck". The frozen timer only
    // shows that after 1.5 s, so an open dialog counts at once (else each level-up could leave a wall in open ground)
    // Standing still on purpose (fighting from range, holding a spot) is not stuck either: only frames spent walking
    // count, else the first step after a stop looked held in place and left a wall in open ground
    if (now - (state.timerChangedAt || now) > 1500 || SITE.choiceOpen() || !state.dir) state.posHist.length = 0;
    else state.posHist.push(meW);
    if (state.posHist.length > 20) {
      const old = state.posHist.shift();
      // Truly held in place: little net movement AND little movement at all (dodging back and forth in front of a
      // telegraph is not a wall, and a "wall" learnt there would close the way out)
      const travel = state.posHist.reduce((a, p, i) => a + (i ? Math.hypot(p.x - state.posHist[i - 1].x, p.y - state.posHist[i - 1].y) : 0), 0);
      if (state.on && state.dir && Math.hypot(meW.x - old.x, meW.y - old.y) < 3 && travel < 12) {
        const ahead = { x: meW.x + state.dir[0] * 40, y: meW.y + state.dir[1] * 40 };
        // Held back by a crowd of enemies is not a wall, nor a reason for a random escape run (it went into them)
        const crowd = enemies.some(e => Math.hypot((e.x - e0) / s - ahead.x, (e.y - f0) / s - ahead.y) - Math.max(Math.abs(e.w), Math.abs(e.h)) / 2 / s < CFG.contact + 20);
        if (!crowd) state.walls = state.walls.concat({ ...ahead, until: Infinity }).slice(-300);
        if (!crowd) state.stuck = state.stuck.filter(t => t > now - 3000).concat(now);
        if (!crowd && state.stuck.length >= 2) {
          // Stuck again with no path around (wall not tagged / not learnt yet): give the target up for a while. While
          // following an A* path, clipping a corner only adds the learnt wall and the path is planned again
          // A rift / event objective is never given up for that: the escape run and the learnt wall are enough to get around
          if (state.prevTarget && !state.prevTarget.enemy && !state.prevTarget.rift && !state.prevTarget.quest && !(state.path && state.path.cells.length)) state.ignore.push({ ...state.prevTarget.w, until: now + 20000 });
          const away = state.walls.filter(w => Math.hypot(meW.x - w.x, meW.y - w.y) < 200).reduce((a, w) => [a[0] + meW.x - w.x, a[1] + meW.y - w.y], [0, 0]);
          const ang = Math.atan2(away[1], away[0]) + (Math.random() - 0.5) * Math.PI / 1.5;
          state.escape = { dir: [Math.cos(ang), Math.sin(ang)], until: now + 900 };
          state.stuck = [];
        }
        state.posHist.length = 0;
      }
    }
    if (!state.on) return;
    if (state.dead) return void applyDir(null);

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / s;
    const edge = e => dist(e, me) - Math.max(Math.abs(e.w), Math.abs(e.h)) / 2 / s;   // to an enemy's edge, world units
    const nearestTo = list => list.reduce((b, d) => (!b || dist(d, me) < dist(b, me) ? d : b), null);
    // Pickups inside a telegraph / a shot's path wait until it is over; items that got us stuck (behind a wall) are
    // ignored for a while
    const inHazard = d => hazards.some(h => (h.shape ? shapeDist(h, d) : Math.hypot(d.x - h.x, d.y - h.y) - Math.max(Math.abs(h.w), Math.abs(h.h)) / 2) < 0);
    // Nor are pickups with an enemy right on them worth walking into a horde for
    const crowded = d => enemies.some(e => dist(d, e) - Math.max(Math.abs(e.w), Math.abs(e.h)) / 2 / s < CFG.contact * 0.75);
    // ... nor through one on the way there (an enemy close to the straight line, ourselves included: step away first)
    const inLane = d => enemies.some(e => segDist(e, me, d) / s - Math.max(Math.abs(e.w), Math.abs(e.h)) / 2 / s < CFG.contact * 0.5);
    const reachable = list => list.filter(d => !inHazard(d) && !crowded(d) && !inLane(d) && !state.ignore.some(w => Math.hypot((d.x - e0) / s - w.x, (d.y - f0) / s - w.y) < 50));
    // Low HP, or just lost a big share of it: survive first (no xp / breakables / hunting, enemies pushed away twice as hard)
    const hp = state.hpRatio ?? 1;
    state.hpLog = (state.hpLog || []).filter(([t]) => now - t < CFG.hurtWindow);
    state.hpLog.push([now, hp]);
    if (Math.max(...state.hpLog.map(([, v]) => v)) - hp >= CFG.hurtDrop) state.hurtUntil = now + CFG.hurtHold;
    const low = hp < CFG.lowHp || now < (state.hurtUntil || 0);
    // A map chunk once tagged "wall" with F7 (it blocked its whole 512 units) counts by its terrain tiles instead
    const solid = d => !(!sc && SITE.terrain && SITE.terrain(d));
    const walls = state.walls.map(w => ({ ...toScreen(w), rw: 0 })).concat(byTag('wall').filter(solid).map(footprint), byTag('break').map(footprint));
    // A rift is always worth it: never put off by hazards / enemies around it, only by an unreachable spot
    const unignored = list => list.filter(d => !state.ignore.some(w => Math.hypot((d.x - e0) / s - w.x, (d.y - f0) / s - w.y) < 50));
    const rift = nearestTo(unignored(rifts)), good = nearestTo(reachable(goods)), foe = nearestTo(enemies);
    const prize = nearestTo(unignored(prizes).filter(d => !inHazard(d) && !(low && d.engage)));
    const buff = nearestTo(reachable(buffs)), quest = obj && obj.target && unignored([obj.target])[0];
    // Once next to a buff shrine the buff is granted; skip that shrine for buffCooldown
    if (buff && dist(buff, me) < CFG.buffReach) state.ignore.push({ x: (buff.x - e0) / s, y: (buff.y - f0) / s, until: now + CFG.buffCooldown });
    // Suitcase / breakable ("break": rock, …): stay within caseReach for caseTime of game time (paused time doesn't
    // count), then skip it for a minute. Leaving the radius restarts the countdown. A breakable is only worth it when
    // nothing better is around (lower priority below), and only within breakRange
    // Already opening one (state.dwell, last frame) or about to (the game starts opening it from farther than caseReach):
    // kept even with a hazard / enemies on it
    const atDwell = d => dist(d, me) < CFG.caseReach * 2 || (state.dwell && Math.hypot((d.x - e0) / s - state.dwell.x, (d.y - f0) / s - state.dwell.y) < 30);
    const dwellCase = hp >= CFG.holdHp ? nearestTo(unignored(cases).filter(atDwell)) : null;
    const kase = dwellCase || nearestTo(reachable(cases));
    const rock = nearestTo(reachable(byTag('break')).filter(d => dist(d, me) < CFG.breakRange));
    const paused = now - (state.timerChangedAt || now) > 1500;
    const dt = Math.min(100, now - (state.lastTick || now)); state.lastTick = now;
    const dwellOn = [kase, rock].find(d => d && dist(d, me) < CFG.caseReach);
    if (dwellOn) {
      const kw = { x: (dwellOn.x - e0) / s, y: (dwellOn.y - f0) / s };
      if (!state.dwell || Math.hypot(state.dwell.x - kw.x, state.dwell.y - kw.y) > 30) state.dwell = { ...kw, t: 0 };
      if (!paused) state.dwell.t += dt;
      if (state.dwell.t > CFG.caseTime) { state.ignore.push({ ...kw, until: now + 60000 }); state.dwell = null; log(dwellOn === kase ? 'mở vali xong' : 'đứng cạnh vật phá được xong'); }
    } else state.dwell = null;
    // Healing spring: only when hurt; once standing on one, stay until full (state.healing: where, best HP, since when)
    const atHealing = d => state.healing && Math.hypot((d.x - e0) / s - state.healing.x, (d.y - f0) / s - state.healing.y) < 30;
    const heal = hp < (state.healing ? 0.99 : CFG.healBelow)
      ? (hp >= CFG.holdHp && nearestTo(unignored(heals).filter(atHealing))) || nearestTo(reachable(heals)) : null;
    if (heal && dist(heal, me) < CFG.healReach) {
      const hw = { x: (heal.x - e0) / s, y: (heal.y - f0) / s };
      if (!state.healing || Math.hypot(state.healing.x - hw.x, state.healing.y - hw.y) > 30 || paused || hp > state.healing.hp + 0.01) state.healing = { ...hw, hp, t: now };
      else if (now - state.healing.t > CFG.healIdle) { state.ignore.push({ ...hw, until: now + CFG.healIgnore }); state.healing = null; log('hồ hồi máu đã cạn, bỏ qua'); }
    } else if (!heal) state.healing = null;

    // hold = stand right on the target (suitcase) instead of walking through it
    let target = null, weight = 0, stop = 0, hold = false, xp;
    if (rift) { target = rift; weight = CFG.riftWeight; }
    else if (prize) { target = prize; weight = CFG.prizeWeight; stop = prize.engage ? CFG.engage : 0; }
    else if (heal && dist(heal, me) < CFG.goodRange) { target = heal; weight = CFG.goodWeight; hold = dist(heal, me) < CFG.healReach; }
    // Event objective: not when hurt or pressed (questHp / questCrowd), not put off by a few enemies right at it (a cage
    // brings an ambush), only by a spot found unreachable. Stood on within its hold radius (world units)
    else if (quest && ((!low && hp > CFG.questHp && enemies.filter(e => edge(e) < CFG.contact).length < CFG.questCrowd) || (dist(quest, me) < quest.hold && hp >= CFG.holdHp))) {
      target = quest; hold = dist(quest, me) < quest.hold; weight = hold ? CFG.questWeight : CFG.goodWeight;
    }
    else if (kase && (!low || kase === dwellCase) && dist(kase, me) < CFG.goodRange) { target = kase; weight = CFG.goodWeight; hold = dist(kase, me) < CFG.caseReach; }
    else if (buff && dist(buff, me) >= CFG.buffReach && dist(buff, me) < CFG.goodRange) { target = buff; weight = CFG.goodWeight; }
    else if (good && dist(good, me) < CFG.goodRange) { target = good; weight = CFG.goodWeight; }
    // XP: only walk until the orb is inside the pickup radius; it flies in by itself from there
    else if (!low && (xp = nearestTo(xps.filter(d => dist(d, me) > state.magnet * 0.8 && !inHazard(d) && !crowded(d) && !inLane(d)))) && dist(xp, me) < CFG.xpRange) {
      target = xp; weight = CFG.xpWeight; stop = state.magnet * 0.6;
    }
    // Breakable: stand next to it while fighting, so area moves / stray shots break it (drops xp, coins, heals). One
    // close by (a small detour) comes before xp, farther ones after it
    if (rock && !low && (!target || (target === xp && dist(rock, me) < 150))) { target = rock; weight = CFG.goodWeight; stop = 0; hold = dist(rock, me) < CFG.caseReach; }
    // Kept at engage from its edge: big sprites (late rounds, bosses) were fought from inside their contact zone
    else if (!target && foe && !low && hp >= CFG.huntHp && enemies.filter(e => edge(e) < 200).length < CFG.huntCrowd) { target = foe; weight = CFG.huntWeight; stop = foe.boss ? CFG.bossEngage : CFG.engage + Math.max(Math.abs(foe.w), Math.abs(foe.h)) / 2 / s; }
    state.view.target = target; state.view.quest = quest;
    // Kept on state (state.view is rebuilt every frame, before the stuck check reads this)
    state.prevTarget = target && { enemy: target === foe, rift: target === rift, quest: target === quest, w:{ x: (target.x - e0) / s, y: (target.y - f0) / s } };
    state.view.walls = walls;
    // Pinned in a corner (CFG.pinTime): run away from the walls within reach, hazards ignored (see cost)
    // Not while already where it wants to be: shuffling at fighting range next to a wall is no corner
    state.pin = (state.pin || []).filter(p => now - p.t < CFG.pinTime);
    const atGoal = target && Math.abs(dist(target, me) - stop) < CFG.pinMove * 2;
    if (paused || SITE.choiceOpen() || !state.dir || hold || atGoal || (state.escape && state.escape.until > now)) state.pin.length = 0;
    else state.pin.push({ t: now, ...meW });
    if (state.pin.length > 1 && now - state.pin[0].t > CFG.pinTime * 0.9 && state.pin.every(p => Math.hypot(p.x - meW.x, p.y - meW.y) < CFG.pinMove)) {
      const W = (x, y, r) => ({ x, y, r });
      const near = state.walls.map(w => W(w.x, w.y, 60))
        .concat(walls.filter(w => w.rw).map(w => W((w.x - e0) / s, (w.y - f0) / s, w.rw + 60)))
        .concat(terrain.filter(t => t.kind === 1).map(t => W((t.x + t.w / 2 - e0) / s, (t.y + t.w / 2 - f0) / s, t.w / s / 2 + 50)))
        .filter(w => Math.hypot(meW.x - w.x, meW.y - w.y) < w.r);
      if (near.length) {
        const away = near.reduce((a, w) => { const l = Math.hypot(meW.x - w.x, meW.y - w.y) || 1; return [a[0] + (meW.x - w.x) / l, a[1] + (meW.y - w.y) / l]; }, [0, 0]);
        const ang = Math.atan2(away[1], away[0]) + (Math.random() - 0.5) * Math.PI / 3;
        state.escape = { dir: [Math.cos(ang), Math.sin(ang)], until: now + 900 };
        log('kẹt góc tường — thoát ra trước, bỏ qua né skill');
      }
      state.pin.length = 0;
    }
    const escape = state.escape && state.escape.until > now ? state.escape.dir : null;
    // Stood on a suitcase / healing spring / event objective: stay put through hazards and enemies (CFG.holdHp)
    const stay = hold && target !== rock && hp >= CFG.holdHp;
    // Terrain wall tiles by world tile index, for the per-frame step check (cost): walking into one only gets the
    // player stuck, so no dodge is worth it
    const tileW = terrain.length ? terrain[0].w / s : 0;
    const wallTiles = new Set(terrain.filter(t => t.kind === 1).map(t => `${Math.round((t.x - e0) / s / tileW)},${Math.round((t.y - f0) / s / tileW)}`));
    const wallAt = (x, y) => wallTiles.size > 0 && wallTiles.has(`${Math.floor(x / tileW)},${Math.floor(y / tileW)}`);

    // Path finding: a wall between us and the target -> walk to the farthest cell of an A* path around it that we can
    // reach in a straight line (wp). Re-planned every 300 ms, when the target moves or once that cell is reached
    function planPath(from, to) {
      const g = makeGrid(from.x, from.y), pad = CFG.bodyRadius, W = d => ({ x: (d.x - e0) / s, y: (d.y - f0) / s });
      // Blocked: "wall" sprites (their box) and the walls we got stuck on
      for (const d of walls) {
        if (!d.rw || d.of === target) continue;                       // stuck points: below; the target itself (a rock to break) stays reachable
        const c = W(d);
        if (d.box) {
          const hw = Math.abs(d.box.w) / 2 / s + pad, hh = Math.abs(d.box.h) / 2 / s + pad;
          g.fill(c.x - hw, c.y - hh, c.x + hw, c.y + hh, i => { g.blocked[i] = 1; });
          continue;
        }
        // Cells whose centre is within reach of the base, plus the cell holding it (props sit on tile centres)
        const r = d.rw + pad, [ci, cj] = g.at(c.x, c.y);
        g.fill(c.x - r, c.y - r, c.x + r, c.y + r, (i, x, y) => { if (Math.hypot(x - c.x, y - c.y) < r) g.blocked[i] = 1; });
        if (ci >= 0 && cj >= 0 && ci < g.n && cj < g.n) g.blocked[cj * g.n + ci] = 1;
      }
      for (const w of state.walls) g.fill(w.x - 24 - pad, w.y - 24 - pad, w.x + 24 + pad, w.y + 24 + pad, i => { g.blocked[i] = 1; });
      // Terrain: the cells under a wall tile (no margin: tiles line up with the grid, and a corridor one tile wide must
      // stay open), extra cost under liquid
      for (const t of terrain) {
        const x = (t.x - e0) / s, y = (t.y - f0) / s, w = t.w / s;
        g.fill(x + 1, y + 1, x + w - 1, y + w - 1, t.kind === 1 ? i => { g.blocked[i] = 1; } : i => { g.cost[i] += 15; });
      }
      // Extra cost: hazards (telegraphs, tagged hazard sprites) and enemy contact zones
      for (const h of hazards) {
        if (h.shape) {
          const xs = h.pts.map(p => (p.x - e0) / s), ys = h.pts.map(p => (p.y - f0) / s), m = CFG.hazardMargin + h.lw / 2 / s;
          g.fill(Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m, (i, x, y) => {
            const d = shapeDist(h, { x: x * s + e0, y: y * s + f0 }) / s;
            if (d < CFG.hazardMargin) g.cost[i] += d < 0 ? 35 : 25;
          });
        } else {
          const c = W(h), r = Math.max(Math.abs(h.w), Math.abs(h.h)) / 2 / s + CFG.hazardMargin;
          g.fill(c.x - r, c.y - r, c.x + r, c.y + r, (i, x, y) => { if (Math.hypot(x - c.x, y - c.y) < r) g.cost[i] += 25; });
        }
      }
      for (const e of enemies) {
        const c = W(e), r = Math.max(Math.abs(e.w), Math.abs(e.h)) / 2 / s + CFG.contact;
        g.fill(c.x - r, c.y - r, c.x + r, c.y + r, (i, x, y) => { if (Math.hypot(x - c.x, y - c.y) < r) g.cost[i] += 3; });
      }
      const plan = { at: now, goal: to, wp: null, cells: [], none: false };
      if (lineClear(g, from, to)) return plan;
      // Goal outside the grid: aim at the grid edge on the way to it
      const R = CFG.pathRadius - 1, [ti, tj] = g.at(to.x, to.y), [si, sj] = g.at(from.x, from.y);
      const k = Math.min(1, R / Math.max(Math.abs(ti - si), Math.abs(tj - sj), 1));
      const gi = Math.round(si + (ti - si) * k), gj = Math.round(sj + (tj - sj) * k);
      const path = findPath(g, sj * g.n + si, gj * g.n + gi);
      if (!path) return { ...plan, none: true };
      if (!path.length) return { ...plan, gaveUp: true };             // gave up: steer straight as before
      plan.cells = path.map(idx => ({ x: (g.ox + idx % g.n + 0.5) * CFG.cell, y: (g.oy + Math.floor(idx / g.n) + 0.5) * CFG.cell }));
      plan.wp = plan.cells[1] || to;
      for (let i = plan.cells.length - 1; i > 1; i--) if (lineClear(g, from, plan.cells[i], CFG.bodyRadius)) { plan.wp = plan.cells[i]; break; }
      return plan;
    }
    let wp = null;
    if (target && !hold && !escape) {
      const tW = { x: (target.x - e0) / s, y: (target.y - f0) / s }, p = state.path;
      if (!p || now - p.at > 300 || Math.hypot(p.goal.x - tW.x, p.goal.y - tW.y) > CFG.cell || (p.wp && Math.hypot(p.wp.x - meW.x, p.wp.y - meW.y) < CFG.cell)) {
        state.path = planPath(meW, tW);
        // A search giving up again and again on the same target (~10 searches, escapes in between included) is treated
        // like no path at all
        const g = state.giveUps;
        state.giveUps = state.path.gaveUp ? { ...tW, n: (g && Math.hypot(g.x - tW.x, g.y - tW.y) <= CFG.cell ? g.n : 0) + 1 } : null;
        if ((state.path.none || (state.giveUps && state.giveUps.n >= 10)) && target !== foe) {
          const skip = target === rift || target === quest ? CFG.riftIgnore : 20000;
          state.ignore.push({ ...tW, until: now + skip }); state.giveUps = null;
          log(`không có đường tới ${target === rift ? 'rift' : target === quest ? 'nhiệm vụ' : 'mục tiêu'} — bỏ qua ${skip / 1000}s`);
        }
      }
      wp = state.path.wp;
    } else state.path = null;
    const wpS = wp && toScreen(wp);
    state.view.path = state.path && state.path.cells.map(toScreen);
    state.view.wp = wpS;

    // Unit vector away from the enemies within 400 (weight 1 / distance to their edge), when low or a horde gathers
    let flee = null;
    const fleeW = low ? CFG.fleeWeight : enemies.filter(e => edge(e) < 250).length >= CFG.crowdFlee ? CFG.fleeCrowdWeight : 0;
    if (fleeW) {
      let fx = 0, fy = 0;
      for (const e of enemies) {
        const d = edge(e);
        if (d > 400) continue;
        const r = dist(e, me) || 1, k = 1 / Math.max(d, 20);
        fx += (me.x - e.x) / s / r * k; fy += (me.y - e.y) / s / r * k;
      }
      const l = Math.hypot(fx, fy);
      if (l > 0) flee = [fx / l, fy / l];
    }
    const cost = dir => {
      const at = k => ({ x: me.x + (dir ? dir[0] : 0) * CFG.lookahead * s * k, y: me.y + (dir ? dir[1] : 0) * CFG.lookahead * s * k });
      const p = at(1);
      let c = 0;
      const half = at(0.5);
      for (const e of stay ? [] : enemies) {
        // Closest along the step (half and full), so the step doesn't pass through an enemy; bigger sprites (bosses)
        // count as closer. A boss pushes from CFG.bossRange off its feet
        const d = e.boss ? Math.min(dist(half, e.boss), dist(p, e.boss)) - CFG.bossRange + CFG.contact
          : Math.min(dist(half, e), dist(p, e)) - Math.max(e.w, e.h) / 2 / s;
        if (d < CFG.contact) c += (low ? 20 : 10) * ((CFG.contact - Math.max(d, 0)) / CFG.contact) ** 2;
      }
      // Hazards are checked along the way (half and full step) so the path doesn't cross a telegraph. Not while getting
      // unpinned from a corner or staying on a suitcase: taking the hit beats both
      for (const q of [at(0.5), p]) {
        for (const h of stay || escape ? [] : hazards) {
          if (h.shape) {
            const d = shapeDist(h, q) / s;                            // < 0 = inside
            if (d < CFG.hazardMargin) c += 25 * Math.min(1, (CFG.hazardMargin - d) / CFG.hazardMargin) + (d < 0 ? 10 : 0);
          } else {
            const d = dist(q, h), r = Math.max(h.w, h.h) / 2 / s + CFG.hazardMargin;
            if (d < r) c += 20 * (1 - d / r) + 5;
          }
        }
      }
      for (const w of walls) {
        const d = dist(p, w), r = (w.rw + 70) * 0.4;
        if (d < r) c += 15 * (1 - d / r) + 3;
      }
      // Terrain walls: right in front of the body (pressing into it) costs more than any hazard; farther along the step
      // less, so walking along a wall stays fine
      if (dir && wallTiles.size) {
        const hit = d => wallAt(meW.x + dir[0] * d, meW.y + dir[1] * d);
        if (hit(CFG.bodyRadius + 6)) c += 60;
        else if (hit(CFG.lookahead / 2)) c += 20;
        else if (hit(CFG.lookahead)) c += 6;
      }
      // Away from the crowd as a whole, not just the enemies touching us (a horde closes in from every side)
      if (dir && flee && !stay) c -=fleeW * (dir[0] * flee[0] + dir[1] * flee[1]);
      // Getting unstuck comes first (hazards are skipped above): better take a hit than stay pinned against a wall
      if (escape) c -= dir ? 40 * (dir[0] * escape[0] + dir[1] * escape[1]) : 0;
      else if (target && hold) c += weight * dist(p, target) / CFG.lookahead;     // already on top: stay put
      else if (wpS) c += weight * (segDist(wpS, me, p) / s + 0.2 * dist(p, wpS)) / CFG.lookahead;   // around a wall
      // Pickups: score by how close the step passes over the item (not where it ends), so the
      // player walks straight through it instead of stopping a few pixels short
      else if (target && !stop) c += weight * (segDist(target, me, p) / s + 0.2 * dist(p, target)) / CFG.lookahead;
      else if (target) c += weight * Math.abs(dist(p, target) - stop) / CFG.lookahead;
      if (dir && dir === state.dir) c -= 0.15;                       // keep heading, avoid jitter
      return c;
    };
    // Standing still is never chosen while heading for a pickup / buff / rift
    let pick = null, pickCost = target && (!stop || wpS) && !hold && !escape ? Infinity : cost(null) + (hold ? 0 : 0.1);
    DIRS.forEach(d => {
      const c = cost(d);
      if (c < pickCost) { pick = d; pickCost = c; }
    });
    applyDir(pick);

    if (CFG.aim && foe) {
      const r = canvas.getBoundingClientRect();
      const clientX = r.left + foe.x * r.width / canvas.width, clientY = r.top + foe.y * r.height / canvas.height;
      window.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
    }
  }

  // ---------- level-up ----------
  // Without a build: new skill (while a move slot is free) > level up an owned skill (most-levelled first) > offensive
  // passive > defensive passive. Status / no-damage moves rank lower. With a build: see scoreCard
  // getClientRects (not offsetParent, which is null for position:fixed menus) + not hidden
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  // Level-up passives by card name (both sites, English / Spanish) -> stat id, and their order once armour is capped,
  // from BoundlessEgret/pokesurvivor-autofarm: power > reflexes > armour > vigor > synthesis > learning > magnet > sprint
  // > berry (doofcraft's crit cards, not in that game, sit with the attack ones)
  const STAT_OF = { vigor: 'hp', power: 'atk', potencia: 'atk', sprint: 'spd', carrera: 'spd', reflexes: 'cd', reflejos: 'cd',
    armor: 'def', coraza: 'def', synthesis: 'rgn', 'síntesis': 'rgn', magnet: 'mag', 'imán': 'mag', learning: 'xp',
    aprendizaje: 'xp', 'sitrus berry': 'heal', 'baya zidra': 'heal', focus: 'crit', sniper: 'crit' };
  const STAT_PRI = { atk: 60, cd: 55, crit: 50, def: 45, hp: 40, rgn: 35, xp: 30, mag: 25, spd: 15 };
  // New moves without a build, as that tool picks them (scoreNewMove): one damage move on the pokémon's better attack
  // side 860 > the buff for that side 850 > Harden 845 > Aqua Ring 838 > a 2nd damage move 815 > more 780; a damage
  // move off its side -40, on it +10, plus how well its kind hits unaimed (KIND_PRI). Speed buff 300, others 150
  const KIND_PRI = { homing: 13, nova: 12, aura: 12, orbit: 11, chain: 10, projectile: 9, boomerang: 8, beam: 8, meteor: 8, turret: 7, mine: 6, cone: 6, melee: 4, dash: 3, trail: 3 };
  const BUFF_STAT = { 'nasty plot': 'satk', 'swords dance': 'patk', 'dragon dance': 'patk', harden: 'def', 'aqua ring': 'regen', agility: 'spd' };
  // g (site, from the game): { kind, cat, stat, fit, side, dmgOwned }. Else moves.js, the card's fit marks, and the side
  // the owned damage moves are on (doofcraft has no physical / special split: no side, no fit)
  // A move's [score, why]: buff = its stat (satk / patk / def / regen / spd), else a damage move of kind / cat, fit
  // true / false / null (unknown), n = damage moves already owned
  // (atkBuff: an attack buff is owned already, so another one is no better than an off-side one)
  function autoScore({ buff, stat, kind, fit, n, side, atkBuff }) {
    if (buff) {
      if ((stat === 'satk' || stat === 'patk') && !atkBuff && (!side || (stat === 'satk') === (side === 'special'))) return [850, 'buff tấn công hợp pokémon'];
      if (stat === 'def') return [845, 'buff phòng thủ'];
      if (stat === 'regen') return [838, 'buff hồi máu'];
      return stat === 'spd' ? [300, 'buff tốc độ'] : [150, 'buff không hợp'];
    }
    const score = (n === 0 ? 860 : n === 1 ? 815 : 780) + (fit === true ? 10 : fit === false ? -40 : 0) + (KIND_PRI[kind] || 5);
    return [score, `move sát thương thứ ${n + 1}${fit === false ? ', không hợp chỉ số' : fit ? ', hợp chỉ số' : ''}`];
  }
  function autoNew(lname, noDmg, fitLow, fitHigh, g = {}) {
    const m = moveByName.get(lname) || {};
    const kind = g.kind || m.kind, cat = g.cat || (m.cat !== 'status' ? m.cat : null);
    const ownedNames = [...Object.keys(state.picks), ...state.hudTexts].map(n => n.toLowerCase());
    const ownedDmg = [...new Set(ownedNames.map(n => moveByName.get(n)).filter(x => x && x.cat !== 'status'))];
    const phys = ownedDmg.filter(x => x.cat === 'physical').length, spec = ownedDmg.length - phys;
    const side = g.side || (phys > spec ? 'physical' : spec > phys ? 'special' : null);
    const fit = g.fit != null ? g.fit >= 0.999 : fitHigh ? true : fitLow ? false : side && cat ? cat === side : null;
    const atkBuff = ownedNames.some(n => BUFF_STAT[n] === 'satk' || BUFF_STAT[n] === 'patk');
    return autoScore({ buff: kind === 'buff' || m.cat === 'status' || (!m.kind && noDmg), stat: g.stat || BUFF_STAT[lname], kind, fit, n: g.dmgOwned ?? ownedDmg.length, side, atkBuff });
  }
  // The default build of a pokémon without one (the player's choice: 3 moves, the 4th left to them): its starting move
  // (always owned: the first damage move) > the attack buff for its side (Nasty Plot / Swords Dance or Dragon Dance)
  // > Harden, from what it learns (learnsetOf: the game's own lists, else the wiki's). Its side: the game's stats
  // (SITE.monSide), else its starting move's category (counting its moves' categories got Gengar wrong). Marked .auto:
  // scoreCard fills the free slot as autoNew would
  const autoBuilds = new Map();                                       // name -> { at, build }
  function autoBuild(name) {
    const n = name.toLowerCase(), hit = autoBuilds.get(n);
    if (hit && performance.now() - hit.at < 3000) return hit.build;
    const ls = learnsetOf(n);
    let build = null;
    if (ls) {
      const pool = [...ls.natural, ...ls.taught], start = ls.natural[0];
      const statOf = m => m.stat || BUFF_STAT[m.name.toLowerCase()];
      const side = (SITE.monSide && SITE.monSide(n)) || (start.cat !== 'status' ? start.cat : null);
      const atk = pool.filter(m => statOf(m) === 'satk' || statOf(m) === 'patk');
      const buff = atk.find(m => !side || (statOf(m) === 'satk') === (side === 'special')) || (side ? null : atk[0]);
      build = [start, buff, pool.find(m => statOf(m) === 'def')].filter(Boolean).map(m => m.name);
      build = [...new Set(build)];
      build.auto = true;
    }
    autoBuilds.set(n, { at: performance.now(), build });
    return build;
  }
  const fontSize = el => parseFloat(getComputedStyle(el).fontSize) || 0;
  // The HUD draws the current pokémon's name: its saved / built-in build, else the one made for it (autoBuild)
  const currentBuild = () => {
    for (const t of state.hudTexts) { const b = CFG.builds[t.toLowerCase()]; if (b) return b; }
    for (const t of state.hudTexts) { const b = autoBuild(t); if (b) return b; }
    return null;
  };
  Object.assign(h, { CFG, state, visible, fontSize, scoreCard, pickRow, currentBuild });   // for the site profile's methods
  // Card order of BoundlessEgret/pokesurvivor-autofarm (inject.js scoreCard), both sites, with or without a build:
  // evolution 1000 > gold passive that evolves a move at once 980 (levelUp, SITE.cardFacts) > Sitrus Berry under 35 % HP
  // 950 > build move not taken yet 900 (no build: a new move while a slot is free, autoNew 780-873) > passive an owned move needs
  // to evolve 700 > upgrade of a move that can still evolve 600-650 (the nearer max, the sooner) > other passives 500+
  // (armour first until capped, then STAT_PRI) > upgrade of a move that can't evolve 430+ > new move outside the build
  // with a slot to spare 200 > berry at good HP 10 > new move with no slot -100. Below 500 = nothing that helps: rerolled.
  // The site may tell what a card is (type 'new' | 'up' | 'evo' | 'stat', stat id, maxLvl, armorFull, evolved: dealt by
  // the game); else it is told by its name
  function scoreCard({ key, name, t, level, isNew, evo, fitLow, fitHigh, type, stat, maxLvl, armorFull, evolved, auto }) {
    const build = currentBuild();
    const noDmg = /no damage|sin daño|sem dano/i.test(t);
    const lname = name.toLowerCase();
    const move = moveByName.get(lname);
    const buildIdx = build ? build.findIndex(m => m.toLowerCase() === lname) : -1;
    const ownedMoves = new Set([...Object.keys(state.picks), ...state.hudTexts].map(n => n.toLowerCase()));
    // Move slots in use: read from the game when the site can (SITE.moveSlots), else the starting move + new ones taken
    // this run. Bonded moves share one slot, so that count runs high; but both games only offer a new move while a
    // slot is free, so a new-move card on offer means at least one is
    const ms = SITE.moveSlots && SITE.moveSlots();
    const slots = ms ? ms.max : CFG.maxSkills;
    const used = ms ? ms.used : isNew ? Math.min(1 + state.newSkills, slots - 1) : 1 + state.newSkills;
    const kind = evo || type === 'evo' ? 'evo' : isNew || type === 'new' ? 'new'
      : type || (STAT_OF[lname] || !(move || level > 0 || state.hudTexts.has(name)) ? 'stat' : 'up');
    const sid = kind === 'stat' ? stat || STAT_OF[lname] : null;
    let score, why;
    if (kind === 'evo') { score = 1000; why = 'mở tiến hoá skill'; }
    else if (kind === 'new') {
      const missing = build ? build.filter(m => !ownedMoves.has(m.toLowerCase())).length : 0;
      if (buildIdx >= 0) { score = 900 - 5 * buildIdx; why = `lấy move build #${buildIdx + 1}`; }
      else if (!build && used < slots) [score, why] = autoNew(lname, noDmg, fitLow, fitHigh, auto);
      // The made-up 3-move build leaves its 4th slot to the auto order; a player's build keeps the others low
      else if (build && build.auto && used + missing < slots) [score, why] = autoNew(lname, noDmg, fitLow, fitHigh, auto);
      else if (build && used + missing < slots) { score = 200; why = `move ngoài build (${used}/${slots} ô, giữ ${missing} ô cho build)`; }
      else { score = -100; why = 'skill mới, hết ô'; }
    } else if (kind === 'up') {
      // Moves are cycled (E), so every owned move counts as in use
      const canEvolve = !evolved && evolveNeeds.has(lname), lv = Math.max(1, level || 1), max = maxLvl || 5;
      if (canEvolve) { score = 600 + Math.round(40 * Math.min(1, lv / max)) + (buildIdx >= 0 ? 10 : 0); why = `nâng move còn tiến hoá được (cấp ${lv}/${max})`; }
      else { score = 430 + (buildIdx >= 0 ? 20 - 3 * buildIdx : 0); why = `nâng move (cấp ${lv})`; }
    } else {
      // A passive card an owned move still needs to evolve (evolveNeeds: move -> passive card), not taken yet
      const needFor = !state.picks[name] ? [...evolveNeeds].filter(([m, p]) => p.toLowerCase() === lname && ownedMoves.has(m)).map(([m]) => m) : [];
      const full = armorFull ?? (state.picks[name] || 0) >= (SITE.armorCards || 12);
      if (sid === 'heal') { const low = state.hpRatio < 0.35; score = low ? 950 : 10; why = low ? 'hồi máu (máu dưới 35%)' : 'hồi máu tức thì (máu còn khoẻ)'; }
      else if (needFor.length) { score = 700; why = `điều kiện tiến hoá ${needFor.join(', ')}`; }
      else if (sid === 'def' && !full) { score = 570; why = 'giáp (lấy tới khi đầy)'; }
      else { score = 500 + (STAT_PRI[sid] ?? 20); why = `nội tại${sid ? ` ${sid}` : ''}`; }
    }
    const notes = [why];
    if (fitLow) { score -= 3; notes.push('hợp kém với pokémon'); }
    if (fitHigh) { score += 2; notes.push('hợp tốt'); }
    if (CFG.bonusRe && CFG.bonusRe.test(t)) { score += CFG.bonusScore || 0; notes.push('ưu tiên preset'); }   // set by presets (farmMoney.js)
    return { key, name, isNew: kind === 'new', inBuild: buildIdx >= 0, score, why: notes.join(', '), text: t.replace(/\s+/g, ' ').slice(0, 100) };
  }
  function levelUp() {
    if (!CFG.autoPick || !state.on || performance.now() < state.pickAt) return;
    const found = SITE.levelUp();
    if (!found || !found.cards.length) return;
    // What the site knows of a card beyond its text (SITE.cardFacts: { evoNow }): a passive that evolves a maxed move at
    // once ranks right after an evolution (scoreCard's scale)
    if (SITE.cardFacts) found.cards.forEach((c, i) => {
      const f = SITE.cardFacts(c, i);
      if (f && f.evoNow && c.score < 980) Object.assign(c, { score: 980, why: 'lấy là tiến hoá ngay' });
    });
    const cards = found.cards.sort((a, b) => b.score - a.score);
    state.pickAt = performance.now() + 800;
    console.table(cards);
    // Reroll when nothing on offer helps (under 500: no evolution, build move, passive or upgrade towards an evolution),
    // as BoundlessEgret/pokesurvivor-autofarm does.
    // No reroll when tapping (c.el): if R does nothing there, the bot would retry it forever instead of picking. A site
    // that answers through the game (found.reroll / c.pick: pokesurvivor.com with G) needs neither keys nor taps
    if (cards[0].score < 500 && found.rerolls > 0 && (found.reroll || !cards[0].el)) { log('reroll'); if (found.reroll) found.reroll(); else tap('r', 'KeyR', 82); return; }
    const c = cards[0];
    state.picks[c.name] = (state.picks[c.name] || 0) + 1;
    if (c.isNew) state.newSkills++;
    log('chọn', c.key, c.name, '—', c.why);
    if (c.pick) c.pick(); else if (c.el) tapEl(c.el); else tap(c.key, `Digit${c.key}`, 48 + +c.key);
  }

  // Only while the run timer is ticking and no level-up is open: the dialogs also use digit hotkeys
  function useItems(t) {
    if (!CFG.useItems || !state.on || state.dead || t < (state.itemAt || 0)) return;
    if (SITE.pilot && SITE.pilot.active()) return;                 // the pilot uses orbs when they help instead
    if (!state.timerText || t - state.timerChangedAt > 1100 || SITE.choiceOpen()) return;
    state.itemAt = t + CFG.itemEvery;
    CFG.itemKeys.forEach(k => tap(k, `Digit${k}`, 48 + +k));
  }
  function swapSkills(t) {
    if (!CFG.swapSkills || !state.on || state.dead || t < (state.swapAt || 0)) return;
    if (SITE.pilot && SITE.pilot.holdSlot()) return;               // orbit moves lose their orbs on a switch
    if (!state.timerText || t - state.timerChangedAt > 1100 || SITE.choiceOpen()) return;
    state.swapAt = t + CFG.swapEvery;
    // Press + release at once: tap()'s 60 ms hold would leave E down and swallow the next presses
    sendKey('keydown', 'e', 'KeyE', 69); sendKey('keyup', 'e', 'KeyE', 69);
  }

  // ---------- choice dialogs: held item ("An item!") and move bonding ("Bond!") ----------
  // Climb from the header to the first ancestor that `isDialog` accepts, then split it into
  // option rows: one per single-digit hotkey, widened while the ancestor holds only that digit.
  function dialogRows(head, isDialog) {
    let dialog = head;
    while (dialog.parentElement && !isDialog(dialog)) dialog = dialog.parentElement;
    const isDigit = e => !e.children.length && /^\d$/.test((e.textContent || '').trim());
    let digits = PSBotList(dialog.querySelectorAll('*')).filter(e => isDigit(e) && visible(e));
    // Phones: digits hidden -> rows from the hidden digits, or the dialog's buttons if there are none; tapped (el)
    const touch = !digits.length;
    if (touch) digits = PSBotList(dialog.querySelectorAll('*')).filter(isDigit);
    const rows = digits.map(k => {
      let row = k;
      while (row.parentElement && row.parentElement !== dialog && PSBotList(row.parentElement.querySelectorAll('*')).filter(e => digits.includes(e)).length === 1) row = row.parentElement;
      return { key: k.textContent.trim(), row };
    });
    if (touch && !rows.length) PSBotList(dialog.querySelectorAll('button, [role=button]')).forEach((row, i) => rows.push({ key: String(i + 1), row }));
    return rows.filter(o => !touch || visible(o.row))
      .map(({ key, row }) => ({ key, text: row.innerText.replace(/\s+/g, ' ').trim(), el: touch ? row : null }))
      .filter(o => o.text.length > 3);
  }
  function pickRow(kind, opts) {
    if (!opts.length) return;
    opts.sort((a, b) => b.score - a.score);
    state.pickAt = performance.now() + 800;
    console.table(opts);
    log(kind, opts[0].key, opts[0].name || '?', opts[0].why || '');
    if (opts[0].el) tapEl(opts[0].el); else tap(opts[0].key, `Digit${opts[0].key}`, 48 + +opts[0].key);
  }
  function dialogPick() {
    const now = performance.now();
    if (!CFG.autoPick || !state.on || now < state.pickAt || now < (state.itemScanAt || 0)) return;
    state.itemScanAt = now + 300;                                     // full DOM scan, so not every frame
    if (SITE.pilot && SITE.pilot.choices()) return;                  // answered through the game itself
    const head =PSBotList(document.querySelectorAll('body *')).find(e => !e.children.length && visible(e) && /only hold one|An item!|Bond!|to bond/i.test(e.innerText || ''));
    if (!head) return void SITE.otherChoice();

    if (/bond/i.test(head.innerText)) {
      // A pokémon's build IS its bond set: build moves always go first, in build order.
      // Outside the build: highest level first, damage over no-damage.
      const build = currentBuild() || [];
      pickRow('bond', dialogRows(head, el => (el.innerText.match(/\b(?:Nv|Lv|Niv)\.?\s*\d/gi) || []).length >= 2).map(o => {
        const lv = +((o.text.match(/\b(?:Nv|Lv|Niv)\.?\s*(\d+)/i) || [])[1] || 0);
        const name = o.text.replace(/\s*\b(?:Nv|Lv|Niv)\.?\s*\d+.*$/i, '').trim();
        const idx = build.findIndex(m => m.toLowerCase() === name.toLowerCase());
        const noDmg = /no damage|sin daño|sem dano/i.test(o.text);
        const score = idx >= 0 ? 100 - idx * 10 : lv * 3 + (noDmg ? -6 : 2);
        return { ...o, name, score, why: `Nv.${lv}${idx >= 0 ? ` · build #${idx + 1}` : ''}${noDmg ? ' · không sát thương' : ''}` };
      }));
      return;
    }

    // Held item: keep / switch by CFG.itemScores
    const names = Object.keys(CFG.itemScores);
    pickRow('chọn đồ', dialogRows(head, el => names.some(n => el.innerText.toLowerCase().includes(n))).map(o => {
      const name = names.find(n => o.text.toLowerCase().includes(n));
      const keep = /^keep|giữ|mantener|conservar/i.test(o.text);
      const dump = keep && CFG.swapAwayItems.includes(name);       // below unknown items (-1): any swap beats keeping it
      return { ...o, name, keep, score: dump ? -2 : name ? CFG.itemScores[name] + (keep ? 0.5 : 0) : -1, why: dump ? '(giữ — muốn bỏ)' : keep ? '(giữ)' : '' };
    }));
  }

  // ---------- auto replay ----------
  // Runs forever (game over -> Back to menu -> Play -> ...) until the bot is switched off with F8.
  // Acts when the game-over screen or the main menu's Play button is on screen, or as a fallback
  // when the HUD timer has stopped ticking (the menu background may keep rendering the map).
  function autoRestart(now) {
    if (!CFG.autoRestart || !state.on || now < (state.restartAt || 0)) return;
    state.restartAt = now + 1500;
    // Paused for a choice (level-up / item / bond) is not the end of a run
    if (SITE.choiceOpen()) return;
    const leaves = PSBotList(document.querySelectorAll('body *')).filter(e => !e.children.length && visible(e));
    if (leaves.some(e => /only hold one|An item!|Bond!|to bond/i.test(e.innerText || ''))) return;
    // Only buttons actually on top at their centre (not faded out / covered by the game canvas). The bot's own UI (the
    // dock, panels dragged out of it) is looked through, so it can't hide the game's Play button. A button scrolled /
    // zoomed off screen can't be hit-tested but is still clicked (click() needs no spot on screen)
    const ours = e => dock.contains(e) || !!e.closest('[data-psbot-ui]');
    const onTop = b => {
      const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return getComputedStyle(b).pointerEvents !== 'none';
      const t = document.elementsFromPoint(x, y).find(e => !ours(e));
      return !!t && (t === b || b.contains(t));
    };
    const buttons = PSBotList(document.querySelectorAll('button, [role=button]')).filter(b => visible(b) && !dock.contains(b) && onTop(b));
    // A pilot reads the results screen / menu by the game's ids: no button text or hit-testing, which phones get wrong
    const pilot = SITE.pilot;
    const over = (pilot && pilot.runOver()) || leaves.some(e => /you fell|run over|game over|has caído|caíste/i.test(e.innerText || ''));
    if (state.runEnded === null) state.runEnded = over;
    const menu = (pilot && pilot.menuOpen()) || SITE.menu(buttons);
    if (!over && !menu && now - (state.timerChangedAt || 0) < 2500) return;
    const justEnded = over && !state.runEnded;
    state.runEnded = over;
    if (justEnded) {
      state.done++;
      log(`xong ván ${state.done}${state.target ? `/${state.target}` : ''}`);
      if (state.target && state.done >= state.target) { state.on = false; applyDir(null); log('đã chơi đủ số ván — dừng'); return; }
    }
    const b = (pilot && pilot.restartButton()) || SITE.restartButton(buttons);
    if (b) { log('tự chơi lại: bấm', JSON.stringify(b.innerText.trim().slice(0, 40))); b.click(); }
  }

  // ---------- leaderboard guard ----------
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send, WS = WebSocket.prototype.send;
  const noopWrite = name => ({
    update: { name: name.replace(/\/documents\/.*$/, `/documents/profiles/${firebase.auth().currentUser.uid}`), fields: {} },
    updateMask: { fieldPaths: [] },
  });
  function filterFirestore(body) {
    const p = new URLSearchParams(body);
    let changed = false;
    for (const [k, v] of [...p]) {
      if (!/^req\d+___data__$/.test(k)) continue;
      let msg; try { msg = JSON.parse(v); } catch { continue; }
      if (!Array.isArray(msg.writes)) continue;
      msg.writes = msg.writes.map(w => {
        const name = (w.update && w.update.name) || w.delete || (w.transform && w.transform.document) || '';
        const path = name.replace(/^.*?\/documents\//, '');
        const hit = CFG.blockRank && CFG.rankRe.test(path);
        if (CFG.logNet) log(`firestore ${hit ? 'CHẶN' : 'ghi'}: ${path}`, hit ? '' : Object.keys((w.update && w.update.fields) || {}));
        if (!hit) return w;
        changed = true; state.netBlocked++;
        return noopWrite(name);
      });
      p.set(k, JSON.stringify(msg));
    }
    return changed ? p.toString() : body;
  }
  function filterRtdb(data) {
    let m; try { m = JSON.parse(data); } catch { return data; }
    const a = m && m.d && m.d.a, b = m && m.d && m.d.b;
    if (!b || (a !== 'p' && a !== 'm')) return data;
    const hit = CFG.blockRank && CFG.rankRe.test(b.p || '');
    if (CFG.logNet) log(`rtdb ${hit ? 'CHẶN' : 'ghi'}: ${b.p}`);
    if (!hit) return data;
    state.netBlocked++;
    m.d.a = 'm'; b.d = {};
    return JSON.stringify(m);
  }
  XMLHttpRequest.prototype.open = function (method, url, ...r) { this._psUrl = String(url); return XO.call(this, method, url, ...r); };
  XMLHttpRequest.prototype.send = function (body) {
    if (typeof body === 'string' && this._psUrl && this._psUrl.includes('/Firestore/Write/channel') && body.includes('___data__')) body = filterFirestore(body);
    return XS.call(this, body);
  };
  WebSocket.prototype.send = function (data) {
    if (typeof data === 'string' && /firebaseio|firebasedatabase/.test(this.url)) data = filterRtdb(data);
    return WS.call(this, data);
  };

  // ---------- overlay + HUD ----------
  const ov = document.createElement('canvas');
  ov.dataset.psbotUi = '';                                           // never taken for the game canvas
  ov.style.cssText = 'position:fixed;pointer-events:none;z-index:99999';
  // Top-left dock (60px down: the pokémon's HP bar sits in that corner) stacking the control panel, the HUD line and the F6 catalog (CSS order keeps that order)
  const dock = document.createElement('div');
  dock.dataset.psbotDock = '';                                       // laid out in a row on small screens (PSB_CSS)
  dock.style.cssText = 'position:fixed;top:60px;left:0;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-height:calc(100vh - 44px);pointer-events:none';
  const hud = document.createElement('div');
  // Debug counters: only with the F9 overlay (or while tagging), wrapped to the panel's width so it doesn't cover the game
  hud.style.cssText = 'order:2;font:12px monospace;background:#1b202be6;color:#8fb4ff;border:1px solid #2e3646;padding:4px 8px;border-radius:8px;pointer-events:none;width:250px;max-width:calc(100vw - 8px);box-sizing:border-box';
  dock.append(hud);
  document.body.append(ov, dock);
  function draw() {
    const r = canvas.getBoundingClientRect();
    Object.assign(ov.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    if (ov.width !== canvas.width || ov.height !== canvas.height) { ov.width = canvas.width; ov.height = canvas.height; }
    const g = ov.getContext('2d');
    g.clearRect(0, 0, ov.width, ov.height);
    const v = state.view;
    hud.style.display = tag.on || state.debug ? '' : 'none';
    hud.textContent = tag.on
      ? (tag.pending ? `${tag.pending}: 1=tốt 2=nguy hiểm 3=rift 4=vật cản 5=buff 6=kinh nghiệm 7=vali 8=phá được 9=hồi máu 0=xoá nhãn Esc=huỷ` : 'GẮN NHÃN (F7): click vào vật trên màn hình')
      : `bot ${state.on ? 'ON' : 'OFF'} (F8) · ván ${state.done + 1}${state.target ? `/${state.target}` : ''}${state.dwell ? ` · mở vali ${(state.dwell.t / 1000).toFixed(1)}/${CFG.caseTime / 1000}s` : ''} · địch ${v ? v.enemies.length : 0} · exp ${v ? v.xps.length : 0} (hút ${Math.round(state.magnet)}) · tốt ${v ? v.goods.length : 0} · buff ${v ? v.buffs.length : 0} · nguy hiểm ${v ? v.hazards.length : 0} · rift ${v ? v.rifts.length : 0} · chặn rank ${state.netBlocked}${SITE.pilot && SITE.pilot.active() ? ` · lái theo G: ${SITE.pilot.mode()}` : ''}`;
    if (tag.on && tag.box) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(tag.box.x - tag.box.w / 2, tag.box.y - tag.box.h / 2, tag.box.w, tag.box.h); }
    if (state.highlight) {
      g.strokeStyle = '#0ff'; g.lineWidth = 2;
      state.lastFrame.forEach(d => { if (d.src === state.highlight) g.strokeRect(d.x - Math.abs(d.w) / 2 - 3, d.y - Math.abs(d.h) / 2 - 3, Math.abs(d.w) + 6, Math.abs(d.h) + 6); });
    }
    // Hide world markers while the game is paused / on menus (they'd be drawn over the dialogs)
    if (!state.debug || !v || performance.now() - (state.timerChangedAt || 0) > 1500) return;
    g.lineWidth = 2;
    const ring = (list, color, r) => { g.strokeStyle = color; list.forEach(d => { g.beginPath(); g.arc(d.x, d.y, r(d), 0, 7); g.stroke(); }); };
    ring(v.enemies, '#f44', () => 10);
    ring(v.hazards.filter(d => !d.shape), '#f90', d => Math.max(d.w, d.h) / 2 + CFG.hazardMargin * v.s);
    g.strokeStyle = '#f90';
    // Lines (shots' flight paths) as a thin line from the shot, not at their full avoidance width: that covered the screen
    g.fillStyle = '#f90';
    v.hazards.filter(d => d.shape).forEach(d => {
      g.beginPath(); d.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      if (d.shape === 'poly') g.closePath();
      g.stroke();
      if (d.shape === 'line') { g.beginPath(); g.arc(d.pts[0].x, d.pts[0].y, 3, 0, 7); g.fill(); }
    });
    g.lineWidth = 2;
    ring(v.goods, '#4f4', () => 8);
    ring(v.rifts, '#f4f', () => 16);
    ring(v.prizes || [], '#fd3', () => 22);
    ring(v.buffs, '#ff0', () => 14);
    ring(v.heals || [], '#6fc', () => CFG.healReach * v.s);
    ring(v.quest ? [v.quest] : [], '#fb4', d => d.hold * v.s);
    ring(v.xps, '#0fc', () => 4);
    ring(v.cases, '#fa0', () => Math.max(6, CFG.caseReach * v.s));
    g.strokeStyle = '#0fc6'; g.setLineDash([2, 6]); g.beginPath(); g.arc(v.me.x, v.me.y, state.magnet * v.s, 0, 7); g.stroke(); g.setLineDash([]);
    ring(v.walls || [], '#88f', d => (d.rw + 70) * v.s * 0.4);
    // Terrain read off the map: walls (magenta) and liquid (cyan) tiles
    for (const t of v.terrain || []) { g.strokeStyle = t.kind === 1 ? '#f0f8' : '#0ff6'; g.strokeRect(t.x + 1, t.y + 1, t.w - 2, t.w - 2); }
    // A* path around walls (dots) and the cell being walked to (circle)
    g.fillStyle = '#fff';
    (v.path || []).forEach(p => g.fillRect(p.x - 2, p.y - 2, 4, 4));
    if (v.wp) { g.strokeStyle = '#fff'; g.beginPath(); g.arc(v.wp.x, v.wp.y, 8, 0, 7); g.stroke(); }
    g.strokeStyle = '#ff4'; g.beginPath(); g.arc(v.me.x, v.me.y, CFG.contact * v.s, 0, 7); g.stroke();
    if (v.target) { g.strokeStyle = '#fff8'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(v.me.x, v.me.y); g.lineTo(v.target.x, v.target.y); g.stroke(); g.setLineDash([]); }
    const dir = state.dir || v.pdir;                                   // keys sent, or the pilot's own direction
    if (dir) { g.strokeStyle = '#4cf'; g.beginPath(); g.moveTo(v.me.x, v.me.y); g.lineTo(v.me.x + dir[0] * 40, v.me.y + dir[1] * 40); g.stroke(); }
  }

  // ---------- control panel: ▶ play N runs (0 = forever), ⏸ pause / resume, ■ stop ----------
  const RUNS_KEY = 'psbot.runs';
  // Events stopped at the bot's panels so typing / clicks / touches there never reach the game (keys, touch joystick)
  const UI_EVENTS = ['keydown', 'keyup', 'pointerdown', 'mousedown', 'click', 'touchstart', 'touchmove', 'touchend'];
  // Drag a panel by its [data-drag] title row, listened for on grip (the dock's panels stop pointerdown); position kept in
  // localStorage. Popups living in the dock are pulled out of it (position:fixed on body) on first move so they can go anywhere.
  function draggable(el, key, grip = el) {
    const detach = () => {
      if (el.parentNode === document.body) return;
      const r = el.getBoundingClientRect();
      document.body.append(el);
      Object.assign(el.style, { position: 'fixed', zIndex: '99999', left: r.left + 'px', top: r.top + 'px', maxHeight: 'calc(100vh - 8px)' });
    };
    const place = (x, y) => {
      el.style.left = Math.min(Math.max(0, x), innerWidth - 40) + 'px';
      el.style.top = Math.min(Math.max(0, y), innerHeight - 24) + 'px';
    };
    try { const p = JSON.parse(localStorage.getItem(key)); if (p) { detach(); place(p.x, p.y); } } catch {}
    grip.addEventListener('pointerdown', e => {
      if (e.button || !e.target.closest('[data-drag]') || e.target.closest('button,a,input,select,[data-ms="close"]')) return;
      e.preventDefault();
      detach();
      const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      const move = ev => { ev.stopPropagation(); place(ev.clientX - dx, ev.clientY - dy); };
      const up = () => {
        ['pointermove', 'pointerup', 'pointercancel'].forEach(t => removeEventListener(t, t === 'pointermove' ? move : up, true));
        try { localStorage.setItem(key, JSON.stringify({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) })); } catch {}
      };
      addEventListener('pointermove', move, true);
      addEventListener('pointerup', up, true);
      addEventListener('pointercancel', up, true);
    });
  }
  const dragCss = 'cursor:move;touch-action:none;user-select:none';
  // Phones (a landscape one is ~360-420 tall) and small windows: a compact panel, collapsed at first (PSB_CSS @media)
  const SMALL = '(max-height: 520px), (max-width: 600px)';

  const ctl = document.createElement('div');
  ctl.dataset.psbotCtl = ctl.dataset.psbotUi = '';
  ctl.className = 'psb';
  ctl.style.cssText = 'order:0;flex:0 0 auto;pointer-events:auto;width:250px;max-width:calc(100vw - 8px)';
  // Shared look of the panel and the moveset popup (.psb*), scoped to the bot's own elements
  const PSB_CSS = `
    [data-psbot-ui].psb { box-sizing:border-box; display:flex; flex-direction:column; overflow:hidden; font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#d6dbe4; background:#1b202bf2; border:1px solid #2e3646; border-radius:12px; box-shadow:0 8px 24px #0008 }
    [data-psbot-ui] .psb-head { display:flex; align-items:center; gap:8px; padding:9px 12px; background:#222838; border-bottom:1px solid #2e3646 }
    [data-psbot-ui] .psb-title { flex:1; min-width:0; font-weight:800; font-size:13px; letter-spacing:.06em; text-transform:uppercase; color:#8fb4ff }
    [data-psbot-ui] .psb-title a { display:block; color:#7d8799; font-weight:600; font-size:11px; letter-spacing:0; text-transform:none; text-decoration:none }
    [data-psbot-ui] .psb-body { display:flex; flex-direction:column; gap:8px; padding:10px 12px }
    [data-psbot-ui] .psb-sec { border-left:3px solid #f5c542; padding-left:8px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#aab3c2 }
    [data-psbot-ui] .psb-row { display:flex; align-items:center; gap:6px }
    [data-psbot-ui] .psb-btn { flex:1; font:700 13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#e6eaf0; background:#262d3b; border:1px solid #3a4356; border-radius:8px; padding:7px 10px; cursor:pointer; white-space:nowrap }
    [data-psbot-ui] .psb-btn:hover { filter:brightness(1.2) }
    [data-psbot-ui] .psb-btn:disabled { opacity:.4; cursor:not-allowed; filter:none }
    [data-psbot-ui] .psb-btn.go { color:#7ee2a0; background:#1f4a33; border-color:#3fbf6e }
    [data-psbot-ui] .psb-btn.stop { color:#ff9a9a; background:#3a2228; border-color:#c94a4a }
    [data-psbot-ui] .psb-btn.acc { color:#f5c542; border-color:#c99a1e }
    [data-psbot-ui] .psb-btn.info { color:#6cc8ff; border-color:#2f8fd0 }
    [data-psbot-ui] .psb-btn.evt { color:#ffa94d; background:#3a2a1c; border-color:#e8742a }
    [data-psbot-ui] .psb-icon { flex:0 0 auto; background:none; border:0; padding:0 4px; font:700 16px system-ui,sans-serif; color:#8fb4ff; cursor:pointer }
    [data-psbot-ui] .psb-in { box-sizing:border-box; font:13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#e6eaf0; background:#262d3b; border:1px solid #3a4356; border-radius:8px; padding:6px 9px; outline:none }
    [data-psbot-ui] .psb-in:focus { border-color:#f5c542 }
    [data-psbot-ui] .psb-muted { color:#7d8799; font-size:12px }
    [data-psbot-ui] .psb-foot { order:1; display:block; border-top:1px solid #2e3646; padding:7px 12px; font-size:11px; color:#7d8799; text-decoration:none }
    [data-psbot-ui] .psb-foot b { color:#8fb4ff }
    [data-psbot-ui] .psb-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; background:#7d8799 }
    [data-psbot-ui] .psb-dot.on { background:#3fbf6e; box-shadow:0 0 6px #3fbf6e }
    [data-psbot-ui] .psb-tip { position:relative; font-size:12px; color:#cfd6e2; background:#262d3b; border:1px solid #3a4356; border-radius:8px; padding:6px 24px 6px 9px }
    [data-psbot-ui] .psb-tip b { color:#f5c542 }
    [data-psbot-ui] .psb-tip .psb-icon { position:absolute; top:2px; right:2px; font-size:14px; color:#7d8799 }
    [data-psbot-ui] .psb-tabs { display:flex; border-bottom:1px solid #2e3646 }
    [data-psbot-ui] .psb-tab { flex:1; font:600 13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#aab3c2; background:none; border:0; border-bottom:2px solid transparent; padding:8px 6px; cursor:pointer }
    [data-psbot-ui] .psb-tab:hover { color:#e6eaf0 }
    [data-psbot-ui] .psb-tab[aria-selected="true"] { color:#f5c542; border-bottom-color:#f5c542; background:#222838 }
    [data-psbot-ui] .psb-body[hidden] { display:none }
    [data-psbot-ctl][data-min] > :not(:first-child) { display:none !important }
    [data-psbot-ctl][data-min] > .psb-head { border-bottom:0 }
    [data-psbot-ui], [data-psbot-ui] * { scrollbar-width:none }
    [data-psbot-ui]::-webkit-scrollbar, [data-psbot-ui] *::-webkit-scrollbar { display:none }
    [data-psbot-ctl]:not([data-min]) [data-ctl="hplay"] { display:none }
    [data-psbot-ctl][data-min] { width:auto !important }
    [data-psbot-ctl][data-min] .psb-title { white-space:nowrap }
    [data-psbot-ui] [data-ctl="hplay"].on { color:#ff9a9a }
    @media (pointer: coarse) { [data-psbot-ui] button, [data-psbot-ui] select, [data-psbot-ui] input { min-height: 34px; font-size: 14px !important } [data-ctl="keys"] { display: none } }
    @media ${SMALL} {
      [data-psbot-dock] { flex-direction:row !important; flex-wrap:wrap }
      [data-psbot-ui].psb { font-size:12px; border-radius:8px; max-height:calc(100vh - 72px); overflow-y:auto }
      [data-psbot-ctl] { width:210px !important }
      [data-psbot-ui][data-psbot-ms] { width:250px !important }
      [data-psbot-ui] .psb-head { padding:4px 8px; gap:4px }
      [data-psbot-ui] .psb-title { font-size:11px }
      [data-psbot-ui] .psb-title a, [data-ctl="tip"], [data-ctl="keys"] { display:none }
      [data-psbot-ui] .psb-body { padding:6px 8px; gap:5px }
      [data-psbot-ui] .psb-tab { padding:4px; font-size:12px }
      [data-psbot-ui] .psb-btn { padding:4px 8px; font-size:12px }
      [data-psbot-ui] .psb-in { padding:3px 6px; font-size:12px }
      [data-psbot-ui] .psb-muted, [data-psbot-ui] .psb-tip { font-size:11px }
      [data-psbot-ui] .psb-foot { padding:4px 8px; font-size:10px }
      [data-psbot-ui] [data-pane="donate"] img { width:120px !important }
      [data-psbot-ui] button, [data-psbot-ui] select, [data-psbot-ui] input { min-height:28px !important; font-size:12px !important }
      [data-psbot-ui] .psb-icon { min-height:0 !important; font-size:16px !important }
    }`;
  ctl.innerHTML = `
    <div data-drag class="psb-head" style="${dragCss}" title="Kéo để di chuyển"><span class="psb-title">PokeSurvivor Bot v${VERSION} <a href="${REPO}" target="_blank" rel="noopener" title="Repo gốc trên GitHub">by damhieu2808</a></span>
      <button data-ctl="hplay" class="psb-icon" title="Chạy / dừng (panel đang thu gọn)">▶</button>
      <button data-ctl="min" class="psb-icon" title="Thu gọn / mở rộng">–</button></div>
    <style>${PSB_CSS}</style>
    <div class="psb-tabs" role="tablist">
      <button data-tab="ctl" class="psb-tab" role="tab" aria-selected="true">🎮 Điều khiển</button>
      <button data-tab="donate" class="psb-tab" role="tab" aria-selected="false">💛 Donate</button>
    </div>
    <div data-pane="ctl" class="psb-body">
      <label class="psb-row">Số ván
        <input data-ctl="runs" class="psb-in" type="number" min="0" step="1" style="width:70px">
        <span class="psb-muted">0 = vô hạn</span></label>
      <div class="psb-row">
        <button data-ctl="play" class="psb-btn go">▶ Chạy</button>
        <button data-ctl="moveset" class="psb-btn acc">⚔ Moveset</button>
      </div>
      <button data-ctl="event" class="psb-btn evt" style="display:none" title="${SITE.event ? SITE.event.title : ''}"></button>
      <div class="psb-muted"><span data-ctl="dot" class="psb-dot"></span><span data-ctl="status"></span></div>
      ${SITE.pilot ? '<div data-ctl="gstate" class="psb-muted" style="font-size:11px"></div><div data-ctl="suggest" class="psb-tip" style="display:none;white-space:pre-line" title="Sức mạnh khi treo máy: move tự ngắm tốt nhất × chỉ số tấn công hợp move × cùng hệ × thời tiết tự tạo × độ trâu × tốc độ × nâng cấp đã mua. Bot không tự đổi pokémon."></div>' : ''}
      ${SITE.noRank ? '<label class="psb-row psb-muted" title="Ván do bot chơi không lên bảng xếp hạng"><input data-ctl="norank" type="checkbox"> Không gửi bảng xếp hạng</label>' : ''}
      <div data-ctl="keys" class="psb-muted" style="font-size:11px">F8 bật/tắt bot · F9 hiển thị overlay</div>
      <div data-ctl="tip" class="psb-tip"><button data-ctl="tipx" class="psb-icon" title="Ẩn mẹo này">×</button>
        <b>💡 Mẹo đi 30 phút:</b> Tapu Fini — Draining Kiss · Aqua Ring · Harden · Whirlpool</div>
    </div>
    <div data-pane="donate" class="psb-body" hidden>
      <div class="psb-sec">Ủng hộ tác giả</div>
      <div>Tool miễn phí và được cập nhật thường xuyên. Nếu thấy hữu ích, bạn có thể donate để tác giả có thêm thời gian làm tool 💛</div>
      <img src="https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/main/icons/donate-qr.png" alt="QR chuyển khoản Techcombank" style="display:block;width:170px;margin:0 auto;border-radius:8px">
      <div class="psb-muted" style="text-align:center">Quét QR bằng app ngân hàng, hoặc chuyển khoản:</div>
      <div style="text-align:center;line-height:1.5"><b>Techcombank</b> · DAM XUAN HIEU<br>
        <b data-ctl="acct" style="color:#f5c542;font-size:15px;letter-spacing:.04em">19036427455012</b>
        <button data-ctl="copyacct" class="psb-btn" style="flex:0 0 auto;padding:2px 8px;font-size:12px;margin-left:4px">Copy</button></div>
      <div class="psb-sec">Cần tool cho game khác?</div>
      <div>Bạn cần làm tool cho web game nào khác thì liên hệ tác giả qua <b>TikTok</b> nhé 🎮</div>
    </div>
    <a href="${REPO}" target="_blank" rel="noopener" title="Repo gốc — bấm để mở GitHub" class="psb-foot">⭐ Tác giả <b>damhieu2808</b> · GitHub</a>
    <a data-ctl="update" href="${REPO}" target="_blank" rel="noopener" style="order:2;display:none;color:#1b202b;background:#f5c542;padding:6px 12px;text-decoration:none;font-weight:bold;font-size:12px"></a>`;
  dock.append(ctl);
  const loadingLine = document.getElementById('psbot-status');      // the userscript's "loading…" line: the panel is up now
  if (loadingLine) loadingLine.remove();
  draggable(dock, 'psbot.pos.dock', ctl);   // the title row moves the whole dock (panel + HUD line + docked popups)
  const $ =k => ctl.querySelector(`[data-ctl="${k}"]`);
  try { $('runs').value = localStorage.getItem(RUNS_KEY) || '5'; } catch { $('runs').value = '5'; }
  // Collapse to the title row (small screens); the <style> above hides every other row, the farm line included
  const MIN_KEY = 'psbot.min';
  const setMin = min => {
    if (min) ctl.dataset.min = ''; else delete ctl.dataset.min;
    $('min').textContent = min ? '+' : '–';
    try { localStorage.setItem(MIN_KEY, min ? '1' : ''); } catch {}
  };
  // Never chosen yet: collapsed on a small screen (a phone held sideways has little room beside the game)
  try { const v = localStorage.getItem(MIN_KEY); setMin(v === null ? matchMedia(SMALL).matches : !!v); } catch {}
  $('min').onclick = () => setMin(!('min' in ctl.dataset));
  // Tip line, hidden for good once closed (a new tip gets a new key, so it shows again)
  const TIP_KEY = 'psbot.tip.1';
  try { if (localStorage.getItem(TIP_KEY)) $('tip').remove(); } catch {}
  if ($('tipx')) $('tipx').onclick = () => { $('tip').remove(); try { localStorage.setItem(TIP_KEY, '1'); } catch {} };
  if ($('norank')) { $('norank').checked = SITE.noRank.get(); $('norank').onchange = () => SITE.noRank.set($('norank').checked); }
  // Tabs: Điều khiển (always the one shown at start) / Donate
  ctl.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    ctl.querySelectorAll('[data-tab]').forEach(t => t.setAttribute('aria-selected', t === b));
    ctl.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  }));
  $('copyacct').onclick = async () => {
    try { await navigator.clipboard.writeText($('acct').textContent); $('copyacct').textContent = 'Đã copy'; }
    catch { getSelection().selectAllChildren($('acct')); $('copyacct').textContent = 'Giữ để copy'; }
    setTimeout(() => { $('copyacct').textContent = 'Copy'; }, 2000);
  };
  // Keep typing / clicks in the panel away from the game's keyboard and pointer handlers
  UI_EVENTS.forEach(t => ctl.addEventListener(t, e => e.stopPropagation()));

  const control = {
    play() {
      const n = Math.max(0, Math.floor(+$('runs').value || 0));
      try { localStorage.setItem(RUNS_KEY, String(n)); } catch {}
      // runEnded: null = not known yet; autoRestart's first look sets it, so a results screen already up when ▶ is
      // pressed is not counted as one of the n runs
      Object.assign(state, { target: n, done: 0, runEnded: null, on: true, started: true, restartAt: 0 });
      log(`chạy ${n ? `${n} ván` : 'vô hạn'}`);
    },
    pause() { state.on = false; applyDir(null); log('tạm dừng — bạn có thể tự điều khiển'); },
    resume() { state.on = true; log('tiếp tục'); },
    stop() { Object.assign(state, { on: false, target: 0, done: 0, started: false }); applyDir(null); log('dừng'); },
  };
  // Update check: compare with the manifest on the original repo (copies of the tool point here too)
  const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
  async function checkUpdate() {
    try {
      const r = await fetch('https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/manifest.json', { cache: 'no-store' });
      const latest = (await r.json()).version;
      if (!latest || !newer(latest, VERSION)) return;
      $('update').style.display = 'block';
      $('update').textContent = `⬆ Có bản mới v${latest} (đang dùng v${VERSION}) → github.com/damhieu2808/PokeSurvivorTool`;
      log(`có bản mới v${latest} — tải tại ${REPO}`);
    } catch {}
  }
  checkUpdate();
  const updateTimer = setInterval(checkUpdate, 6 * 3600000);

  // One button: ▶ Chạy (counts runs from 0 again) <-> ■ Dừng; its twin on the title row works while collapsed
  $('play').onclick = () => (state.on ? control.stop() : control.play());
  $('hplay').onclick = () => (state.on ? control.stop() : control.play());
  // Event button (SITE.event, doofcraft's Halloween waves): the same runs in the event's mode; the site puts the
  // player's own mode back once the bot is off (stopped, or done with its runs)
  $('event').onclick = () => {
    if (state.on) return control.stop();
    SITE.event.start(); state.eventMode = true; control.play();
  };

  function renderCtl() {
    const finished = state.target && state.done >= state.target;
    if (state.eventMode && !state.on) { SITE.event.stop(); state.eventMode = false; }
    // Shown whenever the site has an event, disabled while there is none (or a normal run is going)
    const ev = $('event');
    if (SITE.event) {
      const avail = SITE.event.available();
      ev.style.display = '';
      ev.textContent = state.on && state.eventMode ? '■ Dừng event' : SITE.event.label;
      ev.className = `psb-btn ${state.on && state.eventMode ? 'stop' : 'evt'}`;
      ev.disabled = state.on ? !state.eventMode : !avail;
      ev.title = avail || state.eventMode ? SITE.event.title : 'Chưa có event: nút bấm được khi event đang diễn ra';
    }
    // Running the event: its own button stops it, ▶ Chạy stays as is but disabled (and the other way round)
    const evRun = state.on && state.eventMode;
    $('play').textContent = state.on && !evRun ? '■ Dừng' : '▶ Chạy';
    $('play').className = `psb-btn ${state.on && !evRun ? 'stop' : 'go'}`;
    $('play').disabled = evRun;
    $('dot').className = `psb-dot${state.on ? ' on' : ''}`;
    $('hplay').textContent = state.on ? '■' : '▶';
    $('hplay').classList.toggle('on', state.on);
    // Phones have no console: whether the bot reads the game itself, and what the pilot is doing
    if ($('gstate')) $('gstate').textContent = !window.G ? 'Đọc game: không (đọc màn hình) — tải lại trang để thử lại'
      : `Đọc game: có${SITE.pilot.active() ? ` · ${SITE.pilot.mode() || 'đang lái'}` : ''}`;
    // On the menu / results: which owned pokémon plays unattended best (pilot.js suggestion, read only)
    if ($('suggest')) {
      const s = SITE.pilot.suggestion();
      if ($('suggest').textContent !== s) $('suggest').textContent = s;
      $('suggest').style.display = s ? '' : 'none';
    }
    $('status').textContent = finished ? `Đã xong ${state.done}/${state.target} ván`
      : !state.started && !state.on ? 'Chưa chạy — nhập số ván rồi bấm ▶'
      : `${state.on ? 'Đang chạy' : 'Tạm dừng'} · ván ${state.done + 1}${state.target ? `/${state.target}` : ' (vô hạn)'}`;
  }

  // ---------- moveset popup: pick up to 4 priority moves per pokémon from its learnable list (moves.js) ----------
  const MOVES = window.PSBotMoves || { moves: [], mons: {} };
  const moveByName = new Map(MOVES.moves.map(m => [m.name.toLowerCase(), m]));   // scoreCard: buff (cat "status") or attack
  // Move -> stat card it needs to evolve: the site's own (doofcraft reads its game config), else the wiki's (moves.js evo)
  const evolveNeeds = SITE.evolveNeeds || new Map(MOVES.moves.filter(m => m.evo).map(m => [m.name.toLowerCase(), m.evo]));
  // TMs (pokesurvivor.com's Kecleon Shop): moves taught outside the natural list. The game's save, cached in
  // localStorage (ps.cloud.<uid>, or ps.save.<name> offline), keeps the partner and the taught TMs (ptm) by dex
  const tmMoves = name => (SITE.id === 'default' && MOVES.tm && MOVES.tm[name.toLowerCase()] || []).map(i => MOVES.moves[i]);
  const monByDex = Object.fromEntries(Object.entries(MOVES.dex || {}).map(([n, d]) => [d, n]));
  function gameSave() {
    let best = null;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!/^ps\.(cloud|save)\./.test(k)) continue;
        const s = JSON.parse(localStorage.getItem(k));
        if (s && typeof s === 'object' && (!best || (s.updated || 0) > (best.updated || 0))) best = s;
      }
    } catch {}
    return SITE.id === 'default' ? best : null;
  }
  const taughtTms = name => {
    const s = gameSave(), ids = (s && s.ptm && s.ptm[(MOVES.dex || {})[name.toLowerCase()]]) || [];
    return new Set(MOVES.moves.filter(m => ids.includes(m.id)).map(m => m.name));
  };
  // What a pokémon learns: { natural (starting move first), taught: TMs taught, tms: TMs not taught yet }, moves as
  // { name, kind, cat ('status' = buff), dmg, cd, stat? }. The game's own lists when the site reads them
  // (SITE.learnset: pokesurvivor.com with G, names in the game's language like its cards), else the wiki's (moves.js)
  function learnsetOf(name) {
    const n = name.toLowerCase(), game = SITE.learnset && SITE.learnset(n);
    if (game) return game;
    const natural = (MOVES.mons[n] || []).map(i => MOVES.moves[i]).filter(Boolean);
    if (!natural.length) return null;
    const tms = tmMoves(n), taught = taughtTms(n);
    return { natural, taught: tms.filter(m => taught.has(m.name)), tms: tms.filter(m => !taught.has(m.name)), wiki: true };
  }
  // In a run: the name on the HUD; at the menu: the partner (the game's save, else its localStorage copy)
  const currentMon = () => [...state.hudTexts].map(t => t.toLowerCase()).find(t => MOVES.mons[t] || learnsetOf(t))
    || (SITE.partnerName && SITE.partnerName()) || monByDex[(gameSave() || {}).partner] || '';
  const ms = document.createElement('div');
  ms.dataset.psbotUi = ms.dataset.psbotMs = '';
  ms.className = 'psb';
  ms.style.cssText = 'order:1;flex:0 0 auto;pointer-events:auto;width:320px;max-width:calc(100vw - 8px);display:none';
  ms.innerHTML = `
    <div data-drag class="psb-head" style="${dragCss}" title="Kéo để di chuyển"><span data-ms="title" class="psb-title">Moveset</span>
      <button data-ms="edit" class="psb-icon" style="font-size:14px" title="Sửa build của pokémon khác">✎</button><span data-ms="close" class="psb-icon" style="font-size:14px">✕</span></div>
    <div class="psb-body">
      <div data-ms="pick" style="display:flex;flex-direction:column;gap:8px">
        <div class="psb-sec">Pokémon</div>
        <div class="psb-row"><input data-ms="mon" class="psb-in" list="psbot-mons" placeholder="Tên pokémon hoặc bấm 🎯" style="flex:1;min-width:0">
          <button data-ms="cur" class="psb-btn info" style="flex:0 0 auto" title="Bật: tên và danh sách move tự đổi theo pokémon đang chơi (trong trận: tên trên HUD; ở menu: partner). Tự gõ tên thì tắt">🎯 Đang chơi</button></div>
        <datalist id="psbot-mons">${Object.keys(MOVES.mons).map(n => `<option value="${n.replace(/"/g, '&quot;')}">`).join('')}</datalist>
      </div>
      <div class="psb-sec">4 move ưu tiên</div>
      <div data-ms="slots" style="display:flex;flex-direction:column;gap:5px"></div>
      <div class="psb-row">
        <button data-ms="save" class="psb-btn go">Lưu</button>
        <button data-ms="del" class="psb-btn stop">Xoá build</button></div>
      <div data-ms="msg" class="psb-muted"></div>
      <div data-ms="list" class="psb-muted" style="max-height:120px;overflow:auto"></div>
    </div>`;
  dock.append(ms);
  draggable(ms, 'psbot.pos.moveset');
  UI_EVENTS.forEach(t => ms.addEventListener(t, e => e.stopPropagation()));
  const $m = k => ms.querySelector(`[data-ms="${k}"]`);
  const moveLabel = m => `${m.name} · ${m.cat === 'status' ? 'buff' : `${m.kind} ${m.dmg ?? '?'}dmg/${m.cd ?? '?'}s`}`;
  function renderMoveset() {
    const name = $m('mon').value.trim().toLowerCase(), made = !CFG.builds[name] && autoBuild(name), build = CFG.builds[name] || made || [];
    const ls = learnsetOf(name) || { natural: [], taught: [], tms: [] }, natural = ls.natural;
    const opt = (m, i, mark) => `<option value="${m.name}" ${build[i] === m.name ? 'selected' : ''}>${mark}${moveLabel(m)}</option>`;
    // Taught TMs first: the game only offers a TM's card once it was taught to this pokémon
    const tmGroups = i => [[ls.taught, 'TM đã dạy', 'TM ✓ '], [ls.tms, 'TM chưa dạy (mua ở Kecleon Shop)', 'TM ']]
      .filter(([l]) => l.length).map(([l, label, mark]) => `<optgroup label="${label}">${l.map(m => opt(m, i, mark)).join('')}</optgroup>`).join('');
    // A build move missing from the lists (the wiki lags the game: Leaf Storm, Giga Drain) stays selectable
    const listed = new Set([...natural, ...ls.taught, ...ls.tms].map(m => m.name));
    const extra = i => build[i] && !listed.has(build[i]) ? `<option value="${build[i]}" selected>${build[i]}</option>` : '';
    $m('slots').innerHTML = natural.length ? [0, 1, 2, 3].map(i => `<label class="psb-row"><span class="psb-muted" style="width:18px">#${i + 1}</span>
      <select data-slot class="psb-in" style="flex:1;min-width:0"><option value="">(trống)</option>${extra(i)}${natural.map((m, j) => opt(m, i, j ? '' : '★ ')).join('')}${tmGroups(i)}</select></label>`).join('')
      : `<div style="color:#ff9a9a">${name ? 'Không có trong pokedex' : 'Chọn pokémon'}</div>`;
    const saved = Object.entries(CFG.builds).filter(([n, b]) => !isDefaultBuild(n, b));
    const note = (natural.length && !ls.wiki ? 'Danh sách move lấy từ game. ' : '')
      + (made ? 'Build mặc định (chưa lưu): move khởi đầu → buff tấn công hợp pokémon → Harden; ô trống bot tự chọn. Sửa rồi bấm Lưu để giữ. '
        : build.length && isDefaultBuild(name, build) ? 'Đang dùng build có sẵn (pokesurvivor-autofarm). ' : '');
    // Following the pokémon being played: no picker, its name on the title row and a one-line status, only the 4 moves
    // below (✎ brings the picker back for another pokémon)
    const playing = follow && name && name === currentMon();
    $m('pick').style.display = playing ? 'none' : '';
    $m('edit').style.display = playing ? '' : 'none';
    $m('title').textContent = playing ? `Moveset · ${name.replace(/(^|[\s-])\S/g, c => c.toUpperCase())}` : 'Moveset';
    $m('list').innerHTML = playing
      ? (made ? 'Build mặc định (chưa lưu) · ô trống bot tự chọn' : isDefaultBuild(name, build) ? 'Build có sẵn (pokesurvivor-autofarm)' : CFG.builds[name] ? 'Build đã lưu' : '')
      : note + (saved.length ? 'Đã lưu: ' + saved.map(([n, b]) => `<a data-load="${n}" style="color:#f5c542;cursor:pointer;text-decoration:underline" title="${b.join(', ')}">${n}</a>`).join(', ') : 'Chưa tự lưu build nào');
  }
  // Follow mode (on by default, 🎯): the popup switches to the pokémon being played whenever that changes (a new run, a
  // new partner on the menu). Typing a name or loading a saved build turns it off, so an edit isn't swapped away
  let follow = true;
  const setFollow = on => { follow = on; $m('cur').classList.toggle('go', on); $m('cur').classList.toggle('info', !on); };
  function followMoveset() {
    const editing = ms.contains(document.activeElement) && /^(SELECT|INPUT)$/.test(document.activeElement.tagName);
    if (!follow || ms.style.display === 'none' || editing) return;
    const mon = currentMon();
    if (mon && mon !== $m('mon').value.trim().toLowerCase()) { $m('mon').value = mon; $m('msg').textContent = ''; renderMoveset(); }
  }
  function openMoveset() {
    const show = ms.style.display === 'none';
    ms.style.display = show ? 'flex' : 'none';
    if (show) { if (follow || !$m('mon').value) $m('mon').value = currentMon() || $m('mon').value; $m('msg').textContent = ''; renderMoveset(); }
  }
  $('moveset').onclick = openMoveset;
  $m('close').onclick = openMoveset;
  $m('mon').oninput = () => { setFollow(false); renderMoveset(); };
  $m('edit').onclick = () => { setFollow(false); renderMoveset(); $m('mon').focus(); $m('mon').select(); };
  $m('cur').onclick = () => { setFollow(true); $m('mon').value = currentMon(); $m('msg').textContent = currentMon() ? '' : 'Chưa thấy tên pokémon (vào trận trước)'; renderMoveset(); };
  setFollow(true);
  $m('save').onclick = () => {
    const name = $m('mon').value.trim();
    const moves = [...new Set(PSBotList(ms.querySelectorAll('select[data-slot]')).map(s => s.value).filter(Boolean))];
    const ls = learnsetOf(name);
    if (!ls || !moves.length) return void ($m('msg').textContent = 'Chọn pokémon và ít nhất 1 move');
    window.PSBot.setBuild(name, moves);
    const untaught = ls.tms.filter(m => moves.includes(m.name)).map(m => m.name);
    $m('msg').textContent = `Đã lưu ${name}: ${moves.join(' > ')}` + (untaught.length ? ` · chưa dạy TM ${untaught.join(', ')}: game chưa đưa thẻ này` : ''); renderMoveset();
  };
  $m('del').onclick = () => {
    const name = $m('mon').value.trim();
    if (!CFG.builds[name.toLowerCase()]) return;
    window.PSBot.setBuild(name, []);
    $m('msg').textContent = `Đã xoá build ${name}`; renderMoveset();
  };
  $m('list').onclick = e => { const a = e.target.closest('[data-load]'); if (a) { setFollow(false); $m('mon').value = a.dataset.load; renderMoveset(); } };

  // ---------- catalog (F6): every world sprite type seen, with thumbnail + stats ----------
  function toggleCatalog() { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; renderPanel(); }
  const catalog = new Map();   // src -> { src, img, rect, w, h, max, frames, lastSeen, speed, prev }
  function collect(frame) {
    const now = performance.now();
    const groups = new Map();
    for (const d of frame) {
      if (!SITE.isWorld(d)) continue;
      let g = groups.get(d.src);
      if (!g) groups.set(d.src, g = []);
      g.push({ x: (d.x - d.e) / d.s, y: (d.y - d.f) / d.s, d });
    }
    for (const [src, list] of groups) {
      let c = catalog.get(src);
      if (!c) {
        const d = list[0].d;
        catalog.set(src, c = { src, img: d.img, rect: d.rect, w: Math.round(Math.abs(d.w / d.s)), h: Math.round(Math.abs(d.h / d.s)), max: 0, frames: 0, speed: 0, prev: null });
      }
      c.max = Math.max(c.max, list.length); c.frames++; c.lastSeen = now;
      // Average per-frame displacement, matching each sprite to its nearest one in the previous frame
      if (c.prev && list.length <= 40) {
        let sum = 0, n = 0;
        for (const p of list) {
          let best = Infinity;
          for (const q of c.prev) best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
          if (best < 60) { sum += best; n++; }
        }
        if (n) c.speed = c.speed * 0.9 + (sum / n) * 0.1;
      }
      c.prev = list.length <= 40 ? list : null;
    }
  }
  // Enemies last (already handled, no tagging needed), then on-screen sprites first, then by how rare they are per frame
  const catalogRows = () => {
    const now = performance.now(), live = c => now - c.lastSeen < 1500, enemy = c => CFG.enemyRe.test(c.src);
    return [...catalog.values()].sort((a, b) => enemy(a) - enemy(b) || live(b) - live(a) || a.max - b.max);
  };
  const thumbs = new Map();
  function thumb(c) {
    if (thumbs.has(c.src)) return thumbs.get(c.src);
    let url = '';
    const color = c.src.match(/^(?:fill|stroke):(.+)$/);
    if (color) {                                                      // path shapes: show their colour as a swatch
      const t = document.createElement('canvas'); t.width = t.height = 24;
      const tc = t.getContext('2d'); tc.fillStyle = color[1].replace(/^gradient:?/, '') || '#888';   // a gradient: its first stop
      pathOrig.fillRect.call(tc, 0, 0, 24, 24); url = t.toDataURL();
    } else if (c.img) {
      try {
        const t = document.createElement('canvas');
        const [sx, sy, sw, sh] = c.rect || [0, 0, c.img.width, c.img.height];
        const k = Math.min(40 / sw, 40 / sh, 4);
        t.width = Math.max(1, sw * k); t.height = Math.max(1, sh * k);
        const tc = t.getContext('2d'); tc.imageSmoothingEnabled = false;
        origDraw.call(tc, c.img, sx, sy, sw, sh, 0, 0, t.width, t.height);
        url = t.toDataURL();
      } catch {}
    }
    thumbs.set(c.src, url);
    return url;
  }

  const panel = document.createElement('div');
  panel.dataset.psbotUi = '';
  panel.style.cssText = 'order:3;pointer-events:auto;width:380px;max-width:calc(100vw - 8px);min-height:0;flex:0 1 auto;overflow:auto;font:11px monospace;background:#101418ee;color:#ddd;border:1px solid #345;border-radius:6px;display:none';
  dock.append(panel);
  draggable(panel, 'psbot.pos.catalog');
  const TAG_LABEL = { good: ['Tốt', '#4f4'], hazard: ['Nguy hiểm', '#f90'], rift: ['Rift', '#f4f'], wall: ['Vật cản', '#88f'], buff: ['Buff', '#ff0'], xp: ['Kinh nghiệm', '#0fc'], case: ['Vali (đứng 5s)', '#fa0'], break: ['Phá được', '#c96'], heal: ['Hồi máu', '#6fc'], safe: ['An toàn', '#9cf'] };
  function renderPanel() {
    if (panel.style.display === 'none') return;
    const now = performance.now();
    const esc = s => s.replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`);
    panel.innerHTML = `<div data-drag style="padding:6px;border-bottom:1px solid #345;${dragCss}" title="Kéo để di chuyển">Danh mục sprite (F6 đóng) · rê chuột = khoanh trên màn hình · <b>đậm</b> = đang có trên màn
      <button data-export style="font:10px monospace;padding:1px 6px;margin-left:4px;background:#2a5;color:#000;border:1px solid #456;border-radius:3px;cursor:pointer" title="Tải data.js (nhãn + build) — chép đè vào sites/${SITE.id}/">Xuất data.js</button></div>` +
      catalogRows().map(c => {
        const t = tagOf(c.src) || (/^(fill|stroke):/.test(c.src) && CFG.autoTelegraph && isTelegraph(c) ? 'hazard' : undefined);
        const live = now - c.lastSeen < 1500, enemy = CFG.enemyRe.test(c.src);
        const btn = (v, label, color) => `<button data-src="${esc(c.src)}" data-tag="${v}" style="font:10px monospace;padding:1px 4px;margin-right:2px;background:${t === v ? color : '#223'};color:${t === v ? '#000' : '#ccc'};border:1px solid #456;border-radius:3px;cursor:pointer">${label}</button>`;
        return `<div data-row="${esc(c.src)}" style="display:flex;gap:6px;align-items:center;padding:4px 6px;border-bottom:1px solid #223;${live ? 'font-weight:bold' : 'opacity:.55'}">
          <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#000">${thumb(c) ? `<img src="${thumb(c)}" style="image-rendering:pixelated;max-width:40px;max-height:40px">` : '?'}</div>
          <div style="flex:1;min-width:0">
            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.src)}">${esc(c.src)}</div>
            <div style="color:#9ab">${c.w}×${c.h} · tối đa ${c.max}/frame · ${c.speed > 1 ? `di chuyển ${c.speed.toFixed(1)}` : 'đứng yên'}${enemy ? ' · <span style="color:#f66">quái</span>' : ''}</div>
            <div style="margin-top:2px">${Object.entries(TAG_LABEL).map(([v, [l, col]]) => btn(v, l, col)).join('')}${btn('', 'Bỏ', '#888')}</div>
          </div></div>`;
      }).join('');
  }
  UI_EVENTS.forEach(t => panel.addEventListener(t, e => e.stopPropagation()));
  panel.addEventListener('click', e => {
    if (e.target.closest('button[data-export]')) return void window.PSBot.exportConfig();
    const b = e.target.closest('button[data-src]');
    if (!b) return;
    if (b.dataset.tag) CFG.tags[b.dataset.src] = b.dataset.tag; else { delete CFG.tags[b.dataset.src]; delete CFG.tags[b.dataset.src.split('#')[0]]; }
    saveTags(); renderPanel();
  });
  panel.addEventListener('mouseover', e => { const r = e.target.closest('[data-row]'); state.highlight = r ? r.dataset.row : null; });
  panel.addEventListener('mouseleave', () => { state.highlight = null; });

  // A fullscreen game (phones) shows only the fullscreen element: the overlay and the panels (dock, plus popups dragged
  // out of it) move into it, and back to <body> afterwards. A fullscreen <canvas> can't hold them: they stay put
  const onFullscreen = () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    const host = fs && fs.tagName !== 'CANVAS' ? fs : document.body;
    for (const el of [ov, dock, ...[ms, panel].filter(el => !dock.contains(el))]) if (el.parentNode !== host) host.append(el);
  };
  document.addEventListener('fullscreenchange', onFullscreen);
  document.addEventListener('webkitfullscreenchange', onFullscreen);
  onFullscreen();

  // ---------- keep running in a background tab / covered window ----------
  // 1) The game pauses on visibilitychange / blur: swallow those and report the page as visible.
  // 2) Chrome stops requestAnimationFrame when the tab is hidden or the window fully covered:
  //    every rAF request is also queued, and a Web Worker tick (~60 Hz, not throttled like page
  //    timers) runs any callback the browser hasn't run within 40 ms.
  const nativeRAF = window.requestAnimationFrame, nativeCAF = window.cancelAnimationFrame;
  const visDesc = { hidden: Object.getOwnPropertyDescriptor(document, 'hidden'), visibilityState: Object.getOwnPropertyDescriptor(document, 'visibilityState') };
  const origHasFocus = document.hasFocus;
  const swallow = e => { if (CFG.background) e.stopImmediatePropagation(); };
  let bgWorker = null;
  if (CFG.background) {
    ['visibilitychange', 'webkitvisibilitychange', 'blur', 'pagehide', 'freeze'].forEach(t => window.addEventListener(t, swallow, true));
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    document.hasFocus = () => true;

    const pending = new Map();                                       // id -> { cb, at, native }
    let seq = 0;
    const run = id => { const p = pending.get(id); if (!p) return; pending.delete(id); nativeCAF.call(window, p.native); p.cb(performance.now()); };
    window.requestAnimationFrame = cb => {
      const id = ++seq;
      pending.set(id, { cb, at: performance.now(), native: nativeRAF.call(window, () => run(id)) });
      return id;
    };
    window.cancelAnimationFrame = id => { const p = pending.get(id); if (p) { nativeCAF.call(window, p.native); pending.delete(id); } };
    const fallback = () => { const now = performance.now(); for (const [id, p] of [...pending]) if (now - p.at > 40) run(id); };
    const noWorker = err => {
      log('không tạo được Worker (CSP?) — chạy nền sẽ bị Chrome giới hạn ~1 khung hình/giây', err);
      bgWorker = { terminate: clearInterval.bind(null, setInterval(fallback, 16)) };
    };
    try {
      // A userscript sandbox (Firefox on Android) hands the page's Blob an array built in the sandbox; Firefox refuses
      // to iterate it ("Permission denied to access property Symbol.iterator"). pokesurvivor.com's CSP blocks blob:
      // workers anyway, so on phones the setInterval fallback is what runs — skip the attempt, no scary log line
      if (window.__psbotSandbox) bgWorker = { terminate: clearInterval.bind(null, setInterval(fallback, 16)) };
      else {
        bgWorker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16)'], { type: 'text/javascript' })));
        bgWorker.onmessage = fallback;
        // pokesurvivor.com's CSP blocks blob: workers with an error event, not an exception
        bgWorker.onerror = e => { bgWorker.terminate(); noWorker(e.message || 'blocked'); };
      }
    } catch (err) { noWorker(err); }
  }

  // ---------- main loop ----------
  const origRAF = window.requestAnimationFrame.bind(window);
  let running = true, lastResend = 0, lastPanel = 0, lastFollow = 0;
  function loop(t) {
    if (!running) return;
    canvas = SITE.canvas() || canvas;
    const frame = state.frame; state.frame = [];
    if (state.texts.length) {
      state.hudTexts = new Set(state.texts); state.texts = [];
      const timer = [...state.hudTexts].find(x => /^\d+:\d\d$/.test(x));
      if (timer) state.lastTimer = t;                                                            // run timer on screen = in a run
      if (timer !== state.timerText) { state.timerText = timer; state.timerChangedAt = t; }      // frozen timer = game paused (menus)
      const hp = [...state.hudTexts].map(x => x.match(/^(\d+) \/ (\d+)$/)).find(Boolean);      // "123 / 208" HP bar text
      if (hp) state.hpRatio = hp[1] / Math.max(1, hp[2]);
      if ([...state.hudTexts].some(t => /^0:0[0-2]$/.test(t))) { state.picks = {}; state.newSkills = 0; state.walls = []; state.path = null; state.selfVotes = {}; }   // new run (partner may differ)
      // Down in a multiplayer run: the HUD offers "Spectate" / shows "Spectating X's Y" and 0 HP. Keys then steer the
      // spectator camera (E / A / D switch the watched player), so the bot stops pressing them until revived
      state.dead = [...state.hudTexts].some(x => /^spectat/i.test(x) || /^0 \/ \d+$/.test(x));
    }
    if (frame.length) { state.lastFrame = frame; collect(frame); tick(frame); }
    if (t - lastPanel > 1000 && !panel.matches(':hover')) { lastPanel = t; renderPanel(); }
    renderCtl();
    if (t - lastFollow > 500) { lastFollow = t; followMoveset(); }
    levelUp();
    dialogPick();
    if (SITE.pilot) SITE.pilot.tick();
    useItems(t);
    swapSkills(t);
    autoRestart(t);
    if (state.on && t - lastResend > 400) {                    // re-assert held keys (game clears them on blur)
      lastResend = t;
      Object.keys(KEYS).forEach(k => state.keys[k] && sendKey('keydown', ...KEYS[k]));
    }
    draw();
    origRAF(loop);
  }
  origRAF(loop);

  // ---------- tag mode (F7): click an object, then press 1/2/3/0 ----------
  const tag = { on: false, pending: null, box: null };
  const TAGS = { Digit1: 'good', Digit2: 'hazard', Digit3: 'rift', Digit4: 'wall', Digit5: 'buff', Digit6: 'xp', Digit7: 'case', Digit8: 'break', Digit9: 'heal' };
  const onClick = e => {
    if (!tag.on || !e.isTrusted) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * canvas.width / r.width, y = (e.clientY - r.top) * canvas.height / r.height;
    const hit = state.lastFrame
      .filter(d => SITE.isWorld(d) && Math.abs(d.x - x) <= Math.abs(d.w) / 2 + 4 && Math.abs(d.y - y) <= Math.abs(d.h) / 2 + 4)
      .sort((a, b) => Math.abs(a.w * a.h) - Math.abs(b.w * b.h))[0];
    e.preventDefault(); e.stopImmediatePropagation();
    tag.pending = hit ? hit.src : null; tag.box = hit || null;
    log(hit ? `chọn ${hit.src} (nhãn hiện tại: ${tagOf(hit.src) || 'không'})` : 'không có gì ở đó');
  };
  window.addEventListener('pointerdown', onClick, true);

  const onKey = e => {
    if (!e.isTrusted) return;
    if (e.code === 'F7') {
      tag.on = !tag.on; tag.pending = tag.box = null;
      if (tag.on) { state.on = false; applyDir(null); }
      e.preventDefault();
    }
    if (tag.on && tag.pending && (TAGS[e.code] || e.code === 'Digit0' || e.code === 'Escape')) {
      if (TAGS[e.code]) CFG.tags[tag.pending] = TAGS[e.code];
      else if (e.code === 'Digit0') delete CFG.tags[tag.pending];
      if (e.code !== 'Escape') { saveTags(); log(`${tag.pending} → ${CFG.tags[tag.pending] || 'không nhãn'}`); }
      tag.pending = tag.box = null;
      e.preventDefault(); e.stopImmediatePropagation();
    }
    if (e.code === 'F8') { state.on = !state.on; if (!state.on) applyDir(null); log('bot', state.on ? 'ON' : 'OFF'); e.preventDefault(); }
    if (e.code === 'F9') { state.debug = !state.debug; e.preventDefault(); }
    if (e.code === 'F6') { toggleCatalog(); e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey, true);

  window.PSBot = {
    CFG, state, ctl, SITE, // ctl = control panel (top-left); presets append their own lines to it · SITE = game version profile
    version: VERSION,
    // PSBot.play(5) = chơi 5 ván (0 = vô hạn) · PSBot.pause() / resume() / stop()
    play(n) { if (n !== undefined) $('runs').value = n; control.play(); },
    pause: () => control.pause(), resume: () => control.resume(), stop: () => control.stop(),
    sources() {
      const by = {};
      state.lastFrame.forEach(d => { (by[d.src] ||= []).push([Math.round(d.x), Math.round(d.y)]); });
      console.table(Object.entries(by).map(([src, pts]) => ({ src, tag: tagOf(src) || '', n: pts.length, sample: JSON.stringify(pts.slice(0, 3)) })));
    },
    catalog() {
      const rows = catalogRows().map(c => ({ src: c.src, tag: tagOf(c.src) || '', max: c.max, size: `${c.w}x${c.h}`, moving: c.speed.toFixed(1), seenSec: Math.round(c.frames / 60) }));
      console.table(rows);
      try { copy(JSON.stringify(rows)); log('đã copy danh mục vào clipboard'); } catch {}
    },
    tags() { console.table(CFG.tags); },
    // PSBot.setBuild('Kartana', ['Meteor Mash', 'Seed Bomb', 'Harden', 'Swords Dance']) · [] = delete
    setBuild(name, moves) {
      userBuilds[name.toLowerCase()] = moves;
      if (moves.length) CFG.builds[name.toLowerCase()] = moves; else delete CFG.builds[name.toLowerCase()];
      try {
        const saved = JSON.parse(localStorage.getItem(BUILD_KEY) || '{}');
        saved[name.toLowerCase()] = moves;
        localStorage.setItem(BUILD_KEY, JSON.stringify(saved));
      } catch {}
      log('build', name, moves);
    },
    resetTags() { CFG.tags = {}; saveTags(); },
    // Downloads data.js (tags + builds set with setBuild) to drop into the extension folder, so every machine gets them
    exportConfig() {
      // Default builds stay in moves.js; a deleted one is kept as [] so it stays deleted
      const builds = Object.fromEntries(Object.keys({ ...defaultBuilds, ...CFG.builds }).map(n => [n, CFG.builds[n] || []]).filter(([n, b]) => !isDefaultBuild(n, b)));
      const json = JSON.stringify({ tags: CFG.tags, builds }, null, 2);
      const src = '// Nhãn sprite + build đã đánh dấu, đi kèm extension để máy nào cài cũng có sẵn.\n' +
        `// Tạo lại file này bằng nút "Xuất data.js" trong bảng F6 (hoặc PSBot.exportConfig()), rồi chép đè vào sites/${SITE.id}/.\n` +
        `window.PSBotData = ${json};\n`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      a.download = 'data.js';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      log(`đã xuất data.js: ${Object.keys(CFG.tags).length} nhãn, ${Object.keys(builds).length} build — chép đè vào sites/${SITE.id}/`);
    },
    unload() {
      running = false; applyDir(null); clearInterval(updateTimer);
      P.drawImage = origDraw; P.arc = origArc; P.fillText = origText;
      Object.assign(P, pathOrig); G2.addColorStop = origStop;
      if (bgWorker) {
        bgWorker.terminate();
        window.requestAnimationFrame = nativeRAF; window.cancelAnimationFrame = nativeCAF;
        ['visibilitychange', 'webkitvisibilitychange', 'blur', 'pagehide', 'freeze'].forEach(t => window.removeEventListener(t, swallow, true));
        for (const k of ['hidden', 'visibilityState']) { if (visDesc[k]) Object.defineProperty(document, k, visDesc[k]); else delete document[k]; }
        document.hasFocus = origHasFocus;
      }
      XMLHttpRequest.prototype.open = XO; XMLHttpRequest.prototype.send = XS; WebSocket.prototype.send = WS;
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onClick, true);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
      ov.remove(); dock.remove(); ms.remove(); panel.remove();
      delete window.PSBot;
      log('unloaded');
    },
  };
  log(`loaded — F8 bật/tắt, F9 overlay, PSBot.sources() để xem sprite · v${VERSION} · tác giả damhieu2808 · ${REPO}`);
})();
