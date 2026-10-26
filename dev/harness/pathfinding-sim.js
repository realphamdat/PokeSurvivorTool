// Mini pokesurvivor.com-like sim: world drawn at zoom 2 on #game, camera follows the player, WASD (sent by the bot)
// moves it with wall collision, a ticking HUD timer, one pickup. __run(scene, ms) reports whether it was reached.
(() => {
  document.body.style.margin = '0';
  document.body.innerHTML = '<canvas id="game" width="800" height="600"></canvas>';
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  const sprite = (w, h, color, mark) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); x.fillStyle = mark; x.fillRect(2, 2, 4, 4); return c; };
  const WALL = sprite(32, 32, '#556', '#99a'), ITEM = sprite(12, 12, '#3f3', '#ff0');
  const keys = {};
  addEventListener('keydown', e => { keys[e.key] = true; });
  addEventListener('keyup', e => { keys[e.key] = false; });
  const S = 2, R = 10, SPEED = 2.2;
  let sim = null;
  const hitWall = (x, y) => sim.walls.some(([wx, wy]) => x + R > wx && x - R < wx + 32 && y + R > wy && y - R < wy + 32);
  function frame() {
    if (sim) {
      const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0), l = Math.hypot(dx, dy) || 1;
      const nx = sim.x + dx / l * SPEED, ny = sim.y + dy / l * SPEED;
      if (!hitWall(nx, sim.y)) sim.x = nx;
      if (!hitWall(sim.x, ny)) sim.y = ny;
      sim.trail.push([Math.round(sim.x), Math.round(sim.y)]);
      if (sim.item && Math.hypot(sim.x - sim.item[0], sim.y - sim.item[1]) < 16) { sim.reachedAt = performance.now() - sim.t0; sim.item = null; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#243'; ctx.fillRect(0, 0, 800, 600);
      ctx.setTransform(S, 0, 0, S, 400 - sim.x * S, 300 - sim.y * S);
      for (const [wx, wy] of sim.walls) ctx.drawImage(WALL, wx, wy);
      if (sim.hazard) { ctx.fillStyle = '#ff3030'; ctx.fillRect(...sim.hazard); }
      if (sim.item) ctx.drawImage(ITEM, sim.item[0] - 6, sim.item[1] - 6);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
      const secs = 10 + Math.floor((performance.now() - sim.t0) / 1000);
      ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 380, 20);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const row = (x0, x1, y) => { const r = []; for (let x = x0; x <= x1; x += 32) r.push([x, y]); return r; };
  const col = (x, y0, y1) => { const r = []; for (let y = y0; y <= y1; y += 32) r.push([x, y]); return r; };
  // Cup open at the far (top) side: the player starts below it, the item sits inside
  const cup = [...row(-160, 128, -128), ...col(-160, -320, -160), ...col(128, -320, -160)];
  const scenes = {
    cup: { walls: cup, item: [0, -240] },
    closed: { walls: [...cup, ...row(-160, 128, -352)], item: [0, -240] },
    cupHazardLeft: { walls: cup, item: [0, -240], hazard: [-420, -420, 250, 420] },
    cupHazardRight: { walls: cup, item: [0, -240], hazard: [170, -420, 250, 420] },
    open: { walls: [], item: [0, -240] },
  };
  window.__run = async (name, ms) => {
    const sc = scenes[name];
    sim = { x: 0, y: 0, walls: sc.walls, item: sc.item, hazard: sc.hazard, trail: [], reachedAt: null, t0: performance.now() };
    for (const k in keys) keys[k] = false;
    await new Promise(r => setTimeout(r, 300));
    // Tag the wall / item sprites like F6 would
    for (const d of PSBot.state.lastFrame) {
      if (/^canvas:32x32/.test(d.src)) PSBot.CFG.tags[d.src] = 'wall';
      if (/^canvas:12x12/.test(d.src)) PSBot.CFG.tags[d.src] = 'good';
    }
    PSBot.state.walls = []; PSBot.state.ignore = []; PSBot.state.path = null; PSBot.state.escape = null; PSBot.state.stuck = []; PSBot.state.giveUps = null;
    PSBot.play(0);
    const end = performance.now() + ms;
    while (performance.now() < end && sim.reachedAt === null) await new Promise(r => setTimeout(r, 100));
    PSBot.stop();
    const minX = Math.min(...sim.trail.map(p => p[0])), maxX = Math.max(...sim.trail.map(p => p[0]));
    return { name, reachedMs: sim.reachedAt && Math.round(sim.reachedAt), end: [Math.round(sim.x), Math.round(sim.y)], trailX: [minX, maxX],
      ignored: PSBot.state.ignore.length, learntWalls: PSBot.state.walls.length };
  };
})();
