// PokeSurvivor Bot — pilot for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Plays from the game's own state (window.G, see hook.js) instead of the canvas: steering through G.Input.axis(),
// orbs, the active move slot, the run's pause. Ported from BoundlessEgret/pokesurvivor-autofarm v1.5.0 (MIT,
// Copyright (c) BoundlessEgret), which survives runs far longer than the canvas bot.
// site.js hands it to the core as SITE.pilot; the core stops sending movement keys / item keys while active().
window.PSBotPilot = h => {
  const log = (...a) => console.log('%c[PSBot]', 'color:#7cf', ...a);
  const now = () => performance.now();
  const G = () => window.G;
  const S = { lastT: now(), stuckT: 0, unstickT: 0, unstickDir: null, wanderA: Math.random() * 6.28, lastSlotCheck: 0, lastOrb: 0,
    pausedAt: 0, plan: null, seen: {}, ban: {}, noGo: {}, jCenter: null, holding: false, holdKey: null, holdSince: 0, wd: null,
    losBadT: 0, spin: 1, spinBlockT: 0, loopC: null, dirIdx: -1, holdT: 0, out: [1, 0], orbGoal: null, lastPos: null, mode: '' };

  // Bot on, alive, in a run of the game: the pilot drives
  const playing = () => { const g = G(); return !!(g && g.Game && g.Game.player && g.Input && g.Game.state === 'playing'); };
  const active = () => !!(h.state && h.state.on && !h.state.dead && playing());

  // Wrapped once per page; the live bot's pilot (window.PSBot, replaced when bot.js is reloaded) decides each call.
  // Arrow keys held by the player win, as in the original
  function install() {
    const g = G();
    if (!g || !g.Input || !g.LevelUp) return;
    if (!g.Input.axis.psbot) {
      const orig = g.Input.axis.bind(g.Input);
      g.Input.axis = Object.assign(function () {
        const manual = orig();
        if (manual && (manual[0] || manual[1])) return manual;
        const p = window.PSBot && window.PSBot.SITE.pilot;
        if (!p || !p.active()) return manual;
        try { return p.steer(); } catch (e) { console.warn('[PSBot] pilot', e); return manual; }
      }, { psbot: true });
    }
    // The last cards dealt (a reroll deals again): read by position (card(), site.js levelUp())
    if (!g.LevelUp.offer.psbot) {
      const orig = g.LevelUp.offer;
      g.LevelUp.offer = Object.assign(function () { window.__psbotOfferAt = now(); return (window.__psbotOffer = orig.apply(this, arguments)); }, { psbot: true });
    }
    // Bond / held item dialogs answered through the game itself, 0.7 s after they open (the game ignores taps on a
    // dialog that just appeared): any language, phones included
    const R = g.RunUI;
    if (R && R.showBond && !R.showBond.psbot) {
      const later = (name, fn) => {
        const orig = R[name];
        R[name] = Object.assign(function (...a) {
          const r = orig.apply(this, a);
          const p = window.PSBot && window.PSBot.SITE.pilot;
          if (p && p.on()) setTimeout(() => { try { p[fn](...a); } catch (e) { console.warn('[PSBot] pilot', fn, e); } }, 700);
          return r;
        }, { psbot: true });
      };
      later('showBond', 'bond');
      later('showItemChoice', 'item');
    }
  }
  const on = () => !!(h.state && h.state.on && !h.state.dead && h.CFG.autoPick);

  // Bond: build moves first, in build order (a build is a pokémon's bond set), then attacks before buffs
  const idOf = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function bond(opt) {
    const g = G();
    if (!g.UI.isOpen('scr-bond')) return;
    const ids = ((h.currentBuild && h.currentBuild()) || []).map(idOf);
    const rank = m => { const i = ids.indexOf(m.id); return i >= 0 ? i : 50 + (m.kind === 'buff' ? 10 : 0); };
    const order = opt.loose.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m));
    if (!order.length) return;
    if (opt.mode === 'add' || order.length < 2) { log('bond', order[0].m.id); return g.RunUI.pickBond(order[0].i); }
    // A pair: the first, then the second in the list redrawn without the first
    const first = order[0].m, second = order[1].m;
    log('bond', first.id, '+', second.id);
    g.RunUI.pickBond(order[0].i);
    setTimeout(() => g.RunUI.pickBond(opt.loose.filter(m => m !== first).indexOf(second)), 250);
  }
  // Held item: CFG.itemScores by name ("quick claw" = id quickclaw), swapAwayItems always dropped
  function item(cur, next) {
    const flat = s => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const score = id => {
      if ((h.CFG.swapAwayItems || []).some(n => flat(n) === id)) return -1;
      const k = Object.keys(h.CFG.itemScores || {}).find(n => flat(n) === id);
      return k ? h.CFG.itemScores[k] : 2;
    };
    const keep = score(cur) >= score(next);
    log('đồ cầm:', keep ? `giữ ${cur}` : `đổi sang ${next}`);
    const el = document.querySelectorAll('#item-cards .card')[keep ? 0 : 1];
    if (el) el.click();
  }

  // ---------- run over / menu / popups by the game's own ids (no button text, no hit-testing: phones) ----------
  const isOpen = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
  const runOver = () => isOpen('scr-over');
  const menuOpen = () => isOpen('scr-menu');
  function restartButton() {
    for (const [scr, btn] of [['scr-savenote', 'savenote-ok'], ['scr-news', 'news-close'], ['scr-nick', 'nick-later'], ['scr-recover', 'rec-later']]) {
      if (isOpen(scr)) return document.getElementById(btn);
    }
    if (runOver()) return document.getElementById('btn-again');
    if (menuOpen()) return document.querySelector('#scr-menu [data-go=play]');
    return null;
  }

  // ---------- hazards (js/systems/hazards.js: zone r, or beam angle/len/w; hits once t reaches delay) ----------
  const hazards = () => (G().Hazards && G().Hazards.all) || [];
  function inHazard(z, x, y, r) {
    if (z.kind === 'zone') return (x - z.x) ** 2 + (y - z.y) ** 2 < (z.r + r) ** 2;
    const c = Math.cos(z.angle || 0), s = Math.sin(z.angle || 0), dx = x - z.x, dy = y - z.y, along = dx * c + dy * s;
    return along > -r && along < (z.len || 0) + r && Math.abs(-dx * s + dy * c) <= (z.w || 0) / 2 + r;
  }

  // ---------- path finding (A* on the game's own terrain) ----------
  // Local sampling only sees ~200 around the player: a target behind a wall / gap is walked to along an A* route
  const trapsNear = (W, x, y, r) => ((W && W.specialsNear && W.specialsNear(x, y, r)) || []).filter(t => t.type === 'trap');
  function findPath(p, tx, ty, goalTol) {
    const W = G().World, TS = W.TS || 32;
    if (!W.isFree) return null;
    const sx = Math.floor(p.x / TS), sy = Math.floor(p.y / TS), gx = Math.floor(tx / TS), gy = Math.floor(ty / TS);
    const span = Math.max(Math.abs(gx - sx), Math.abs(gy - sy)) + 20;
    if (span > 120) return null;
    const traps = trapsNear(W, (p.x + tx) / 2, (p.y + ty) / 2, Math.hypot(tx - p.x, ty - p.y) / 2 + 200);
    const walk = new Map();
    const K = (x, y) => (x + 50000) * 100000 + (y + 50000);
    const ok = (x, y) => {
      const k = K(x, y);
      let v = walk.get(k);
      if (v === undefined) {
        const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
        v = Math.abs(x - sx) <= span && Math.abs(y - sy) <= span && W.isFree(cx, cy, Math.min(p.r, TS * 0.45))
          && !traps.some(t => (cx - t.x) ** 2 + (cy - t.y + 8) ** 2 < 26 * 26);
        walk.set(k, v);
      }
      return v;
    };
    const isGoal = (x, y) => Math.max(Math.abs(x - gx), Math.abs(y - gy)) <= goalTol;
    const hh = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const heap = [], push = n => { heap.push(n); let i = heap.length - 1; while (i) { const j = (i - 1) >> 1; if (heap[j].f <= n.f) break; heap[i] = heap[j]; i = j; } heap[i] = n; };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= last.f) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
    const g = new Map(), from = new Map();
    g.set(K(sx, sy), 0); push({ x: sx, y: sy, f: hh(sx, sy) });
    let end = null, n = 0;
    while (heap.length && n++ < 8000) {
      const c = pop(), ck = K(c.x, c.y), cg = g.get(ck);
      if (isGoal(c.x, c.y)) { end = c; break; }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = c.x + dx, ny = c.y + dy;
        if (!ok(nx, ny) && !isGoal(nx, ny)) continue;
        if (dx && dy && (!ok(c.x + dx, c.y) || !ok(c.x, c.y + dy))) continue;   // no corner cutting
        const ng = cg + (dx && dy ? 1.414 : 1), nk = K(nx, ny);
        if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); from.set(nk, ck); push({ x: nx, y: ny, f: ng + hh(nx, ny) }); }
      }
    }
    if (!end) return null;
    const pts = [];
    for (let k = K(end.x, end.y); k !== undefined; k = from.get(k)) {
      const x = Math.floor(k / 100000) - 50000, y = (k % 100000) - 50000;
      pts.push([x * TS + TS / 2, y * TS + TS / 2]);
    }
    pts.reverse();
    pts[pts.length - 1] = [tx, ty];
    return { pts, len: g.get(K(end.x, end.y)) * TS + Math.hypot(tx - pts[pts.length - 1][0], ty - pts[pts.length - 1][1]) };
  }
  // Next point to head for: the farthest one along the route that is reachable in a straight line
  function waypoint(p, path) {
    const W = G().World, traps = trapsNear(W, p.x, p.y, 320);
    // The end may be solid (altar, chest): checked only up to 26 from it, so the player can touch it
    const clear = (x, y) => {
      const d = Math.hypot(x - p.x, y - p.y), n = Math.ceil(d / 8);
      for (let i = 1; i <= n; i++) {
        if (d * (1 - i / n) < 26) break;
        const sx = p.x + (x - p.x) * i / n, sy = p.y + (y - p.y) * i / n;
        if (!W.isFree(sx, sy, p.r) || traps.some(t => (sx - t.x) ** 2 + (sy - t.y + 8) ** 2 < 23 * 23)) return false;
      }
      return true;
    };
    let near = 0, nd = Infinity;
    path.pts.forEach(([x, y], i) => { const d = Math.hypot(x - p.x, y - p.y); if (d < nd) { nd = d; near = i; } });
    path.pts.splice(0, near);
    let wp = path.pts[0];
    for (let i = 1; i < Math.min(path.pts.length, 14); i++) {
      const [x, y] = path.pts[i];
      if (Math.hypot(x - p.x, y - p.y) > 260 || !clear(x, y)) break;
      wp = path.pts[i];
    }
    return { x: wp[0], y: wp[1], offPath: nd };
  }

  // ---------- targets: worth / real walking distance / reachable before they're gone; kept once chosen ----------
  function candidates(p, hpPct) {
    const g = G(), out = [], t = g.Game.st.time, W = g.World;
    if (hpPct > 0.2) for (const e of g.EnemyMgr.all()) {
      if (e.dead || e.behavior !== 'thief') continue;
      // Thieves: Gholdengo drops a x10 ticket, Meowth coins; harmless, flee (speed 92), gone after 15 s
      S.seen[e.id] = S.seen[e.id] ?? t;
      const gold = (e.def && e.def.loot === 'ticket10') || e.dex === 1000;
      out.push({ key: 'thief' + e.id, x: e.x, y: e.y, tier: gold ? 5 : 3, value: gold ? 14 : 3, left: 15 - (t - S.seen[e.id]), mode: gold ? 'đuổi Gholdengo' : 'đuổi Meowth', goalTol: 2, chase: true, flee: e.spd || 92 });
    }
    const rift = g.Rift && g.Rift.rift;
    if (rift && !g.Rift.inArena && hpPct > 0.2)
      out.push({ key: 'rift', tier: 4, x: rift.x, y: rift.y - 10, value: 12, left: rift.ttl ?? 45, mode: 'vào rift', goalTol: 0, chase: true, direct: true });
    const lost = g.Events && g.Events._dbg && g.Events._dbg();
    if (lost && hpPct > 0.25 && !(g.Rift && g.Rift.inArena)) {
      if (lost.state === 'wait') out.push({ key: 'lost', tier: 3, x: lost.x, y: lost.y, value: 8, left: 90, mode: 'đi cứu', goalTol: 1, chase: true });
      else out.push({ key: 'escort', tier: 3, x: lost.tx, y: lost.ty, value: 9, left: 90, mode: 'hộ tống', goalTol: 0, chase: true, hold: 20, escort: true });
    }
    // Shooting a wall for 0.8 s: a spot near the locked-on enemy with a clear shot, walked to by A*
    const lt = S.losTarget;
    if (lt && !lt.dead && !lt.arceus && !(g.Judgment && g.Judgment.active) && S.losBadT > 0.8 && W && W.isFree && W.projectileBlock) {
      const clearShot = (x, y) => { const d = Math.hypot(lt.x - x, lt.y - y), n = Math.ceil(d / 12); for (let i = 1; i < n; i++) if (W.projectileBlock(x + (lt.x - x) * i / n, y + (lt.y - y) * i / n - (g.LIFT || 0), 4)) return false; return true; };
      const spots = [];
      for (const r of [140, 220, 300]) for (let k = 0; k < 24; k++) {
        const a = k / 24 * 6.2832, x = lt.x + Math.cos(a) * r, y = lt.y + Math.sin(a) * r;
        if (W.isFree(x, y, p.r + 4) && clearShot(x, y)) spots.push({ x, y, d: Math.hypot(x - p.x, y - p.y) });
      }
      spots.sort((a, b) => a.d - b.d);
      for (const sp of spots.slice(0, 2)) out.push({ key: 'los' + Math.round(sp.x / 64) + ',' + Math.round(sp.y / 64), tier: 1, x: sp.x, y: sp.y, value: 6, left: Infinity, mode: 'tìm góc bắn', goalTol: 0, chase: true });
    }
    if (!(g.Rift && g.Rift.inArena) && W && W.specialsNear) for (const o of W.specialsNear(p.x, p.y, 700)) {
      // Altar (25 s power), spring (heals), big chest (stand 3.5 s to open)
      if (o.type === 'altar' && !o.used) out.push({ key: 'altar' + o.id, tier: 2, x: o.x, y: o.y, value: 5, left: Infinity, mode: 'lấy buff', goalTol: 1, chase: true });
      else if (o.type === 'spring' && hpPct < 0.6 && (o.charge ?? 1) > 0.2) out.push({ key: 'spring' + o.id, tier: 2, x: o.x, y: o.y - 8, value: 7, left: Infinity, mode: 'hồ hồi máu', goalTol: 0, hold: 20, until: () => p.hp >= p.maxHp * 0.95 });
      else if (o.type === 'bigchest' && hpPct > 0.5) out.push({ key: 'chest' + o.id, tier: 2, x: o.x, y: o.y, value: 3, left: Infinity, mode: 'mở rương', goalTol: 1, hold: 34 });
    }
    return out;
  }
  function plan(p, hpPct) {
    const t = now(), g = G();
    const pSpd = (p.baseSpd || 100) * (p.spdMul || 1);
    const cur = S.plan;
    const gt = g.Game.st.time;
    const cands = candidates(p, hpPct).filter(c => !(S.ban[c.key] > gt));
    // A live plan follows its target (thieves run, a rescue turns into an escort)
    const live = cur && cands.find(c => c.key === cur.key);
    const higher = cur && cands.some(c => c.tier > cur.c.tier && !(S.noGo[c.key] > t));
    const stale = !live || higher || t - cur.at > 600 || Math.hypot(live.x - cur.c.x, live.y - cur.c.y) > 48 || (cur.path && cur.path.pts.length < 2);
    if (!stale) { cur.c = Object.assign(cur.c, live, { x: cur.c.x, y: cur.c.y }); return cur; }
    // Tier first (Gholdengo 5 > rift 4 > rescue / Meowth 3 > altar / spring / chest 2 > shooting angle 1), then worth / time
    let best = null, bestScore = 0, bestTier = -1;
    const order = cands.sort((a, b) => (b.tier - a.tier) || (b.value / Math.hypot(b.x - p.x, b.y - p.y) - a.value / Math.hypot(a.x - p.x, a.y - p.y)));
    for (const c of order) {
      if (c.tier < bestTier) break;
      const path = findPath(p, c.x, c.y, c.goalTol);
      if (!path) { S.noGo[c.key] = t + 1000; continue; }
      // A thief has to be caught within move range (~220) while it runs too
      const eta = c.flee ? Math.max(0, path.len - 220) / Math.max(8, pSpd - c.flee) : path.len / pSpd;
      if (eta > c.left - 1) { S.noGo[c.key] = t + 1000; continue; }
      const score = c.value / (eta + 4) * (cur && cur.key === c.key ? 1.8 : 1);   // the current one wins ties
      if (c.tier > bestTier || score > bestScore) { bestTier = c.tier; bestScore = score; best = { key: c.key, c, path, at: t, eta }; }
    }
    S.plan = best;
    return best;
  }

  const PICK_W = { xp: 1, xpBig: 3, coin: 2, magnet: 5, bomb: 2.5, ticket: 9, ticket10: 12, item: 9, sphere: 6, candy: 6, heal: 0.4 };
  function pickTarget(p, enemies, hpPct, fear) {
    const g = G(), W = g.World;
    const pl = plan(p, hpPct);
    if (pl) {
      const c = pl.c;
      const wp = waypoint(p, pl.path);
      if (wp.offPath > 3 * (W.TS || 32)) pl.at = 0;   // pushed far off the route: re-plan next frame
      return { x: wp.x, y: wp.y, fx: c.x, fy: c.y, w: 6, mode: c.mode, chase: c.chase, hold: c.hold, until: c.until, escort: c.escort, direct: c.direct };
    }
    // Pickups: the cluster with the best total worth / distance, swept clean before the next
    const wOf = k => k.kind === 'heal' ? (hpPct < 0.7 ? 8 : 0.2) : (PICK_W[k.kind] ?? 1);
    const traps = ((W && W.specialsNear && W.specialsNear(p.x, p.y, 600)) || []).filter(t => t.type === 'trap');
    const onTrap = k => traps.some(t => (k.x - t.x) ** 2 + (k.y - t.y + 8) ** 2 < 23 * 23);
    // First 5 minutes: every orb; later, with a crowd in tow, only those within 220 (the next lap passes the rest)
    const crowded = g.Game.st.time > 300 && enemies.length >= 6;
    const items = g.Pickups.all().filter(k => !k.pulled && !(k.kind === 'heal' && hpPct >= 0.95) && !onTrap(k)
      && (!crowded || k.kind === 'heal' || k.kind.startsWith('ticket') || k.kind === 'item' || Math.hypot(k.x - p.x, k.y - p.y) < 220));
    if (S.orbGoal) {
      let rest = null, rd = 260;
      for (const k of items) {
        if (Math.abs(k.x - S.orbGoal.x) > 110 || Math.abs(k.y - S.orbGoal.y) > 110) continue;
        const d = Math.hypot(k.x - p.x, k.y - p.y);
        if (d < rd) { rd = d; rest = k; }
      }
      if (rest) return (S.orbGoal = { x: rest.x, y: rest.y, w: 2, mode: 'nhặt đồ', orb: true });
    }
    let best = null, bestS = 0;
    for (const k of items) {
      const d = Math.hypot(k.x - p.x, k.y - p.y);
      let cluster = 0;
      for (const o of items) if (Math.abs(o.x - k.x) < 90 && Math.abs(o.y - k.y) < 90) cluster += wOf(o);
      let crowd = 0;
      if (hpPct < 0.6) for (const e of enemies) if (!e.dead && Math.abs(e.x - k.x) < 70 && Math.abs(e.y - k.y) < 70) crowd += e.boss ? 5 : 1;
      let s = cluster / (d + 40) / (1 + crowd * 0.35 * fear);
      if (S.orbGoal && Math.abs(k.x - S.orbGoal.x) < 90 && Math.abs(k.y - S.orbGoal.y) < 90) s *= 1.6;   // no flip-flopping
      if (s > bestS) { bestS = s; best = { x: k.x, y: k.y, w: 2, mode: 'nhặt đồ', orb: true }; }
    }
    S.orbGoal = best;
    if (best) return best;
    // Nothing to pick up: walk towards the nearest group off screen (600+) so moves have something to hit
    if (hpPct > 0.5) {
      let hunt = null, hd = Infinity;
      for (const e of g.EnemyMgr.all()) {
        if (e.dead || e.silent) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < hd) { hd = d; hunt = e; }
      }
      if (hunt && hd > 600) return { x: hunt.x, y: hunt.y, w: 0.8, mode: 'tìm quái' };
    }
    return null;
  }

  // ---------- steering: 16 directions x 3 step lengths, cost = danger - gain, lowest wins ----------
  const DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  function steer() {
    const g = G(), p = g.Game.player;
    if (!p || p.dead) return [0, 0];
    const t = now();
    const dt = Math.min(0.1, (t - S.lastT) / 1000); S.lastT = t;
    const gt = g.Game.st.time;
    const hpPct = p.hp / p.maxHp;
    // Healthy: small enemies barely matter, only bosses / shots / telegraphs; the lower the HP, the more they do
    let fear = hpPct < 0.35 ? 2.5 : hpPct < 0.6 ? 1 : 0.25;

    const near = [];
    for (const e of g.EnemyMgr.all()) {
      if (e.dead || e.silent || e.behavior === 'thief') continue;
      if (Math.abs(e.x - p.x) < 360 && Math.abs(e.y - p.y) < 360) near.push(e);
    }
    const shots = g.Projectiles.all().filter(s => !s.friendly && Math.abs(s.x - p.x) < 300 && Math.abs(s.y - p.y) < 300);
    const zones = hazards();

    // Arceus's Judgment (minute 30): an arena ~22.6 tiles in radius, Arceus can't die and keeps speeding up; all damage
    // is % of max HP. Circle the middle, keeping it on the far side. Its centre: the world's arena, else 3 tiles above
    // where the player was put at the start
    const J = g.Judgment;
    const unitPx = (g.Tiles && g.Sprites) ? g.Tiles.T * g.Sprites.PX : 32;
    const judging = !!(J && J.active);
    if (!judging) S.jCenter = null;
    else {
      const wa = g.World && g.World.arena;
      if (wa && wa.type === 'judgment') S.jCenter = { x: wa.tx * unitPx + unitPx / 2, y: wa.ty * unitPx + unitPx / 2 };
      else if (!S.jCenter) S.jCenter = { x: p.x, y: p.y - 3 * unitPx };
    }
    const arceus = judging ? g.EnemyMgr.all().find(e => e.arceus) : null;

    let target = pickTarget(p, near, hpPct, fear);
    if (target && target.escort) fear = Math.max(fear, 1);   // the escorted pokémon gets hurt by enemies too
    // Judgment: only orbs right next to the player with Arceus far away
    if (judging && target && !(target.orb && Math.hypot(target.x - p.x, target.y - p.y) < 140 && (!arceus || Math.hypot(arceus.x - p.x, arceus.y - p.y) > 320))) target = null;
    const arena = (g.Rift && g.Rift.inArena) || judging;
    const W = g.World;

    const pSpd = (p.baseSpd || 100) * (p.spdMul || 1);
    const bigFear = Math.max(1, fear);
    const danger = (x, y, tAhead) => {
      let c = 0, big = 0;
      for (const e of near) {
        // Enemies close in meanwhile; fast ones reach further, hard hitters weigh more. Arceus is a fake enemy (0 damage,
        // 0 speed in its data): treated as the deadliest boss
        const spd = e.arceus ? pSpd * 1.2 : e.spd || 40, fast = Math.min(2, spd / pSpd);
        const d = Math.hypot(x - e.x, y - e.y) - (e.r || 10) - p.r - spd * tAhead * 0.8;
        const reach = (e.arceus ? 140 : e.boss ? 90 : 35) + 45 * fast;
        const w = e.arceus ? 8 : (e.boss ? 4 : 1) * Math.min(3, Math.max(0.5, (e.dmg || 10) / (p.maxHp * 0.12)));
        const v = w * Math.exp(-Math.max(d, -20) / reach);
        if (e.boss || e.arceus) big += v; else c += v;
      }
      for (const s of shots) {
        const sx = s.x + (s.vx || 0) * tAhead, sy = s.y + (s.vy || 0) * tAhead;
        const d = Math.hypot(x - sx, y - sy) - (s.r || 6) - p.r;
        big += 6 * Math.exp(-Math.max(d, -10) / 30);
      }
      for (const z of zones) if (!z.hit && inHazard(z, x, y, p.r)) big += 25;
      return c * fear + big * bigFear;
    };

    // Walls / traps: checked every 12 along the way; a cramped end (dead ends, narrow gaps) costs more
    const free = (x, y) => !W || !W.isFree || W.isFree(x, y, p.r);
    const traps = ((W && W.specialsNear && W.specialsNear(p.x, p.y, 400)) || []).filter(o => o.type === 'trap');
    const onTrap = (x, y) => traps.some(o => (x - o.x) ** 2 + (y - o.y + 8) ** 2 < 23 * 23);
    const pathLen = (dx, dy, step) => {
      for (let k = 12; k <= step; k += 12) {
        const x = p.x + dx * k, y = p.y + dy * k;
        if (!free(x, y) || onTrap(x, y)) return k - 12;
      }
      return step;
    };
    const RING = DIRS.filter((_, i) => i % 2 === 0);
    const cramped = (x, y) => { let n = 0; for (const [rx, ry] of RING) if (!free(x + rx * 45, y + ry * 45)) n++; return n; };

    // Auto-aimed moves lock onto a boss within 330, else the nearest within 520; walls / trees / rocks stop the shots,
    // so stand where that enemy is in clear view
    const los = (x1, y1, x2, y2) => {
      if (!W || !W.projectileBlock) return true;
      const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 12);
      for (let i = 1; i < n; i++) if (W.projectileBlock(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n - (g.LIFT || 0), 4)) return false;
      return true;
    };
    const aimTargets = near.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 10);
    const lockedFrom = (x, y) => {
      let boss = null, nearest = null, nd = 520;
      for (const e of aimTargets) {
        if (e.arceus) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (e.boss && d < 330) boss = e;
        if (d < nd) { nd = d; nearest = e; }
      }
      return boss || nearest;
    };
    const blockedShot = (x, y) => { const e = lockedFrom(x, y); return e && !los(x, y, e.x, e.y) ? 1 : 0; };
    S.losTarget = lockedFrom(p.x, p.y);
    S.losBadT = blockedShot(p.x, p.y) ? (S.losBadT || 0) + dt : 0;
    if (S.losBadT === 0 && S.plan && S.plan.key.startsWith('los')) S.plan = null;
    const losW = S.losBadT > 0.6 ? 2.5 : 1.2;

    const here = danger(p.x, p.y, 0);

    // Kiting: run a fixed big circle with the crowd in tow behind (moves fire backwards), orbs picked up on the next lap.
    // Only with nothing else to do or when pressed: two pulls at once make the player run back and forth
    let kite = null;
    const ar = judging ? (S.jCenter && { x: S.jCenter.x, y: S.jCenter.y, r: 24, judge: true }) : arena && g.Rift.arena;
    if (ar) {
      // Rift legendary: switches between ranged and melee, slams within 125, charges within 320. The arena is ~300
      // across, so backing off hits the edge: run along the inside of the edge, keeping the boss on the far side
      const boss = ar.judge ? arceus : (ar.bossId && g.EnemyMgr.get && g.EnemyMgr.get(ar.bossId)) || near.find(e => e.boss);
      const edge = Math.max(80, (ar.r - 1.4) * unitPx - p.r - 6);
      // Judgment legendaries spawn 18-21 tiles out: a ring of 0.55 (measured best of 0.82 / 0.65 / 0.55 / 0.45)
      const ring = edge * (ar.judge ? 0.55 : 0.82);
      const px0 = p.x - ar.x, py0 = p.y - ar.y, pr = Math.hypot(px0, py0) || 1;
      const pa = Math.atan2(py0, px0);
      let kx = 0, ky = 0, w = 1.8;
      if (boss && !boss.dead) {
        const ba = Math.atan2(boss.y - ar.y, boss.x - ar.x);
        let delta = pa - ba; while (delta > Math.PI) delta -= 2 * Math.PI; while (delta < -Math.PI) delta += 2 * Math.PI;
        if (Math.abs(delta) < Math.PI * 0.85) S.spin = delta >= 0 ? 1 : -1;
        const aim = pa + S.spin * 0.55;
        kx = ar.x + Math.cos(aim) * ring - p.x; ky = ar.y + Math.sin(aim) * ring - p.y;
        const bd = Math.hypot(p.x - boss.x, p.y - boss.y);
        if (bd < (ar.judge ? 240 : 180)) {                 // too close: getting away comes first
          const ux = (p.x - boss.x) / (bd || 1), uy = (p.y - boss.y) / (bd || 1);
          const kl0 = Math.hypot(kx, ky) || 1;
          kx = kx / kl0 + ux * 1.5; ky = ky / kl0 + uy * 1.5;
          w = 3.5;
        }
      } else if (!ar.judge) {
        kx = ar.x - p.x; ky = ar.y - p.y;                 // legendary not out yet: wait in the middle
        if (pr < 40) kx = ky = 0;
      }
      const kl = Math.hypot(kx, ky);
      if (kl > 0.01) kite = { x: kx / kl, y: ky / kl, w };
    } else if ((!target || here > 2) && !(target && target.hold) && !(target && target.chase && here < 4)) {
      const R = 380;
      let c = S.loopC;
      const v = S.out || [1, 0];
      const anchor = () => ({ x: p.x - R * S.spin * v[1], y: p.y + R * S.spin * v[0] });   // current spot on the circle, heading tangent
      if (!c || Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - R) > R * 0.6) c = S.loopC = anchor();
      let rx = p.x - c.x, ry = p.y - c.y; const rd = Math.hypot(rx, ry) || 1; rx /= rd; ry /= rd;
      const ang = Math.atan2(ry, rx) + S.spin * 0.5;
      let kx = c.x + Math.cos(ang) * R - p.x, ky = c.y + Math.sin(ang) * R - p.y;
      const kl = Math.hypot(kx, ky) || 1; kx /= kl; ky /= kl;
      kite = { x: kx, y: ky, w: 1.6 + Math.min(1.5, here * 0.4) };
      // Circle blocked ahead for 0.6 s: turn round and redraw it from here
      S.spinBlockT = pathLen(kx, ky, 90) < 60 ? S.spinBlockT + dt : 0;
      if (S.spinBlockT > 0.6) { S.spin *= -1; S.spinBlockT = 0; S.loopC = null; }
    }

    // Telegraphs: where the player is when each one lands, walking straight this way (a rock rain lands one by one)
    const hazardHits = (dx, dy) => {
      if (!zones.length) return 0;
      const reach = pathLen(dx, dy, 240);
      let hit = 0;
      for (const z of zones) {
        if (z.hit) continue;
        const tr = Math.max(0, (z.delay || 0) - (z.t || 0));
        const t2 = Math.min(tr * pSpd * 0.9, reach);       // 0.9: turning / speeding up
        if (inHazard(z, p.x + dx * t2, p.y + dy * t2, p.r + 4)) hit += 1;
      }
      return hit * 30 * bigFear;
    };

    const cost = DIRS.map(([dx, dy]) => {
      let bestStep = Infinity;
      for (const step of [55, 120, 200]) {
        const reach = pathLen(dx, dy, step);
        if (reach < 12) continue;                         // wall / trap right ahead
        const x = p.x + dx * reach, y = p.y + dy * reach;
        let c = danger(x, y, reach / pSpd);
        c += (reach < step ? 6 + 6 * (1 - reach / step) : 0) + cramped(x, y) * 1.2;
        if (target) {
          const before = Math.hypot(target.x - p.x, target.y - p.y), after = Math.hypot(target.x - x, target.y - y);
          c -= target.w * (before - after) / step;
        }
        bestStep = Math.min(bestStep, c);
      }
      if (bestStep === Infinity) return Infinity;
      bestStep += hazardHits(dx, dy);
      bestStep += losW * blockedShot(p.x + dx * 90, p.y + dy * 90);
      if (kite) bestStep -= kite.w * (dx * kite.x + dy * kite.y);
      else if (!target && !arena) bestStep -= 0.3 * (dx * Math.cos(S.wanderA) + dy * Math.sin(S.wanderA));
      return bestStep;
    });
    // Averaged with the neighbours so a tiny difference doesn't flip the direction
    const sm = cost.map((c, i) => c === Infinity ? Infinity : 0.5 * c + 0.25 * (Math.min(cost[(i + 15) % 16], c + 3) + Math.min(cost[(i + 1) % 16], c + 3)));
    let bi = -1;
    for (let i = 0; i < 16; i++) if (sm[i] < Infinity && (bi < 0 || sm[i] < sm[bi])) bi = i;
    if (!target) S.wanderA += dt * 0.35;
    S.mode = judging ? (here > 2 ? 'Arceus: né' : 'Arceus: chạy vòng') : arena ? (here > 2 ? 'rift: né' : 'rift: đánh boss') : here > 2 ? 'né' : target && (target.chase || target.hold) ? target.mode : kite ? 'kéo quái chạy vòng' : target ? target.mode : 'đi dạo';
    // Every direction blocked within 12 (squeezed between trees / rocks): push out the emptiest way
    const escape = () => {
      let bd = null, bs = -Infinity;
      for (const [dx, dy] of DIRS) {
        let r = pathLen(dx, dy, 120);
        if (r < 12) for (let t2 = 6; t2 <= 40; t2 += 6) { if (W && W.isFree && !W.isFree(p.x + dx * t2, p.y + dy * t2, p.r * 0.5)) break; r = t2 * 0.5; }
        const sc = r - cramped(p.x + dx * r, p.y + dy * r) * 15 - danger(p.x + dx * r, p.y + dy * r, 0.5) * 20;
        if (sc > bs) { bs = sc; bd = [dx, dy]; }
      }
      return bd || DIRS[(Math.random() * 16) | 0];
    };
    if (bi < 0) { S.unstickT = Math.max(S.unstickT, 0.4); S.unstickDir = escape(); bi = 0; }

    // Hysteresis: a new direction only when clearly better, kept 0.15 s (0.25 s when a shot / telegraph is about to hit,
    // so two equal escapes don't make the player jitter in place)
    let urgent = 0;
    for (const sh of shots) urgent += 6 * Math.exp(-Math.max(Math.hypot(p.x - sh.x, p.y - sh.y) - (sh.r || 6) - p.r, -10) / 30);
    for (const z of zones) if (!z.hit && inHazard(z, p.x, p.y, p.r + 4)) urgent += 25;
    const emergency = urgent > 4;
    S.holdT -= dt;
    const keep = S.dirIdx >= 0 && sm[S.dirIdx] < Infinity && (emergency ? sm[S.dirIdx] - sm[bi] < 3 && S.holdT > 0 : S.holdT > 0 || sm[S.dirIdx] - sm[bi] < 0.6);
    if (keep) bi = S.dirIdx;
    else if (bi !== S.dirIdx) { S.dirIdx = bi; S.holdT = emergency ? 0.25 : 0.15; }
    let best = DIRS[bi];
    // Spring / chest / escort: stand there (still dodging), at most 10 / 6 / 20 s, then skip that target for 30 s
    S.holding = false;
    if (target && target.hold && here < 4) {
      const d = Math.hypot((target.fx ?? target.x) - p.x, (target.fy ?? target.y) - p.y);
      if (d < target.hold && !(target.until && target.until())) {
        const key = S.plan && S.plan.key;
        if (S.holdKey !== key) { S.holdKey = key; S.holdSince = gt; }
        const limit = target.escort ? 20 : target.mode === 'mở rương' ? 6 : 10;
        if (gt - S.holdSince < limit) { S.holding = true; S.wd = null; return [0, 0]; }
        if (key) { S.ban[key] = gt + 30; S.plan = null; log('bỏ mục tiêu', key); }
      }
    }

    // A planned route's next point is reachable in a straight line: with no danger right here, head straight for it
    if (target && target.fx !== undefined && here < 2) {
      const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
      const safe = !zones.some(z => !z.hit && inHazard(z, p.x + dx / d * 30, p.y + dy / d * 30, p.r));
      if (safe && d > 4) best = [dx / d, dy / d];
    }

    // Walking into a wall: the emptiest direction for 0.5 s
    if (S.lastPos) {
      const moved = Math.hypot(p.x - S.lastPos[0], p.y - S.lastPos[1]);
      S.stuckT = moved < 0.3 ? S.stuckT + dt : 0;
    }
    S.lastPos = [p.x, p.y];
    // Watchdog: under 10 moved in 3 s (not on purpose): escape, and skip the current target for 15 s
    if (!S.wd || S.holding) S.wd = { x: p.x, y: p.y, t: gt };
    else if (gt - S.wd.t > 3) {
      if (Math.hypot(p.x - S.wd.x, p.y - S.wd.y) < 10) {
        log('kẹt: thoát ra');
        if (S.plan) { S.ban[S.plan.key] = gt + 15; S.plan = null; }
        S.loopC = null; S.unstickT = 0.8; S.unstickDir = escape();
      }
      S.wd = { x: p.x, y: p.y, t: gt };
    }
    if (S.stuckT > 0.4) { S.stuckT = 0; S.unstickT = 0.5; S.unstickDir = escape(); }
    if (S.unstickT > 0) { S.unstickT -= dt; best = S.unstickDir; }
    // Smoothed over ~80 ms into arcs; not when dodging, unsticking or turning round (averaging that would stop dead)
    const reversing = S.out[0] * best[0] + S.out[1] * best[1] < -0.2;
    const a = emergency || reversing || S.unstickT > 0 ? 1 : Math.min(1, dt * 12);
    const ox = S.out[0] * (1 - a) + best[0] * a, oy = S.out[1] * (1 - a) + best[1] * a;
    const ol = Math.hypot(ox, oy) || 1;
    S.out = [ox / ol, oy / ol];
    if (!isFinite(S.out[0]) || !isFinite(S.out[1])) { S.out = escape(); S.loopC = null; S.plan = null; }
    return S.out;
  }

  // ---------- each frame (core loop): orbs, the active slot when orbit moves are held, the run's pause ----------
  // Orbit moves (Ancient Power, Fire Spin, Gust, Petal Blizzard) lose their orbs on every slot switch, so the core's
  // E cycling stops while one is held and the pilot keeps the best group active instead
  const holdSlot = () => { const g = G(), p = g && g.Game && g.Game.player; return !!(p && p.moves && p.moves.some(m => m.kind === 'orbit')); };
  const groupScore = grp => {
    let dmg = 0, buff = 0, orbit = 0;
    for (const m of grp) {
      if (m.kind === 'buff') buff++; else dmg += 10 + (m.lvl || 1) + (m.evolved ? 5 : 0);
      if (m.kind === 'orbit') orbit++;
    }
    return dmg ? dmg + buff * 6 + orbit * 8 : 0;          // a buff alone never hits: never parked on it
  };
  function tick() {
    install();
    const g = G(), p = g && g.Game && g.Game.player;
    if (!h.state || !h.state.on || !p) return;
    const t = now();
    autoResume(g, t);
    if (p.dead || g.Game.state !== 'playing') return;
    if (holdSlot() && t - S.lastSlotCheck > 600 && p.slots.length > 1 && !(p.hasItem && p.hasItem('choiceband'))) {
      S.lastSlotCheck = t;
      let best = p.active, bs = groupScore(p.slots[p.active] || []);
      p.slots.forEach((grp, i) => { const s = groupScore(grp); if (s > bs + 0.5) { bs = s; best = i; } });
      if (best !== p.active) p.setActive(best);
    }
    // Orbs: an enemy one when HP is low or 8+ enemies are on the player, a buff one while a boss is up
    if (g.Orbs && p.orbs && t - S.lastOrb > 1500) {
      let around = 0;
      for (const e of g.EnemyMgr.all()) if (!e.dead && e.behavior !== 'thief' && Math.abs(e.x - p.x) < 90 && Math.abs(e.y - p.y) < 90) around++;
      const danger = p.hp / p.maxHp < 0.4 || around >= 8;
      const boss = (g.EnemyMgr.bossAlive && g.EnemyMgr.bossAlive()) || (g.Judgment && g.Judgment.active);
      p.orbs.forEach((o, i) => {
        if (!o || t - S.lastOrb < 1500) return;
        const kind = g.Orbs.BY && g.Orbs.BY[o.id] && g.Orbs.BY[o.id].kind;
        if ((kind === 'foe' && danger) || (kind === 'buff' && boss)) { g.Orbs.use(p, i); S.lastOrb = t; log('dùng orb', o.id); }
      });
    }
  }
  // The game pauses itself when the window loses focus: unpaused again unless the player paused it (Esc / P, below)
  function autoResume(g, t) {
    const st = g.Game.state;
    if (st === 'playing') { if (t - window.__psbotUserPause > 1000) window.__psbotUserPause = 0; S.pausedAt = 0; return; }
    if (st !== 'paused' || window.__psbotUserPause || document.visibilityState !== 'visible' || !g.Game.togglePause) { S.pausedAt = 0; return; }
    if (!S.pausedAt) S.pausedAt = t;
    else if (t - S.pausedAt > 1500) { S.pausedAt = 0; log('tự bỏ pause'); g.Game.togglePause(); }
  }

  // ---------- level-up cards as the game dealt them (G.LevelUp.offer), by position ----------
  // { type, id: 'def' | 'heal' | <move id> …, evoNow: a passive that evolves a maxed move at once } or null
  function card(i) {
    const g = G(), p = g && g.Game && g.Game.player, c = (window.__psbotOffer || [])[i];
    if (!p || !c || !c.key) return null;
    const [type, ...rest] = String(c.key).split(':');
    return { type, id: rest.join(':'), evoNow: type === 'stat' && c.color === '#ffd23f' };
  }

  // Choices are answered through the game (bond / item above, level-up in site.js) once its RunUI is wrapped
  const choices = () => { const g = G(); return !!(g && g.RunUI && g.RunUI.showBond && g.RunUI.showBond.psbot); };

  return { active, on, steer, tick, holdSlot, card, bond, item, choices, runOver, menuOpen, restartButton, mode: () => S.mode };
};
// Once per page: the moment the player pauses a run themselves (the pilot's autoResume leaves that pause alone)
if (!window.__psbotPauseKey) {
  window.__psbotPauseKey = true;
  window.__psbotUserPause = 0;
  addEventListener('keydown', e => {
    const g = window.G;
    if (e.isTrusted && (e.key === 'Escape' || e.code === 'KeyP') && g && g.Game && g.Game.state === 'playing') window.__psbotUserPause = performance.now();
  }, true);
}
