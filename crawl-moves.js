// Re-crawl the learnable moves of every pokémon from pokesurvivor.wiki into core/moves.js:  node crawl-moves.js
// Only add / refresh the evolution table (move -> stat card it needs) in the existing core/moves.js:  node crawl-moves.js --evo
// Only refresh the default builds (SurvivorTiers' best simulated build per pokémon) in core/moves.js:  node crawl-moves.js --builds
// Only refresh the TM table (pokesurvivor.com's js/data/tms.js) in core/moves.js:  node crawl-moves.js --tm
const fs = require('fs');
const outFile = require('path').join(__dirname, 'core', 'moves.js');
let list;
const parseDex = dex => {
  const mons = [...dex.matchAll(/slug:"([a-z0-9-]+)",dex:(\d+),name:"([^"]+)"/g)].map(m => ({ slug: m[1], dex: +m[2], name: m[3] }));
  const seen = new Set(); list = mons.filter(m => !seen.has(m.slug) && seen.add(m.slug));
  console.log('mons', list.length);
};

const moveRe = /\{id:"([^"]+)",name:"([^"]+)",type:"(\w+)",desc:"((?:[^"\\]|\\.)*)",kind:"(\w+)",category:(?:"(\w+)"|null)([^}]*)\}/g;
const moves = {}; const out = {}; const fails = [];
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }); if (r.ok) return await r.text(); } catch {}
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  return null;
}
async function one(m) {
  const html = await get(`https://pokesurvivor.wiki/pokemon/${m.slug}`);
  const i = html ? html.indexOf('moves:$R[') : -1;
  if (i < 0) { fails.push(m.slug); return; }
  const names = [];
  for (const x of html.slice(i).matchAll(moveRe)) {
    const [, id, name, type, desc, kind, cat, rest] = x;
    if (names.includes(name)) continue;
    const num = k => { const v = (rest.match(new RegExp(`,${k}:([\\d.]+)`)) || [])[1]; return v ? +v : undefined; };
    moves[name] ??= { type, kind, cat: cat || 'status', dmg: num('dmg'), cd: num('cd'), desc: desc.replace(/\\"/g, '"') };
    if (/starting:!0/.test(rest)) names.unshift(name); else names.push(name);
  }
  out[m.name.toLowerCase()] = names;
}
// A maxed move evolves once its stat card ("Power", "Reflexes", …) was taken in the run: evo = that card's name
async function addEvolutions(data) {
  const html = await get('https://pokesurvivor.wiki/moves');
  const evo = {};
  for (const m of (html || '').matchAll(/\{id:"([^"]+)",name:"([^"]+)"[^{}]*?evolution:\$R\[\d+\]=\{intoName:"([^"]*)",needsStatCard:"(\w+)",needsName:"([^"]+)"/g)) evo[m[2]] = m[5];
  for (const m of data.moves) { if (evo[m.name]) m.evo = evo[m.name]; else delete m.evo; }
  console.log('evolutions', data.moves.filter(m => m.evo).length, 'of', data.moves.length, 'moves');
}
// Default build per pokémon: the best of the melee / ranged builds https://survivortiers.pages.dev found in simulated runs
async function addBuilds(data) {
  const json = async f => JSON.parse(await get(`https://survivortiers.pages.dev/data/${f}.json`));
  const [species, index, moves] = await Promise.all(['species', 'pokemon-index', 'moves'].map(json));
  // Ids are slugs ("swords-dance"); their moves.json only lists attacks, so status moves take the name from ours
  const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const names = Object.fromEntries([...moves.map(m => [m.id, m.en.name]), ...data.moves.map(m => [slug(m.name), m.name])]);
  data.builds = {};
  for (const p of index) { const b = species.builds[p.dex]; if (b && b[b.best]) data.builds[p.nameEn.toLowerCase()] = b[b.best].moves.map(id => names[id] || id); }
  const known = new Set(data.moves.map(m => m.name));
  console.log('builds', Object.keys(data.builds).length, 'moves not in moves.js', [...new Set(Object.values(data.builds).flat())].filter(n => !known.has(n)));
}
// TMs (pokesurvivor.com's Kecleon Shop): moves a pokémon can be taught outside its natural list. tm[name] = indices
// into moves, dex[name] = dex number (the save keeps the partner and the taught TMs by dex); moves get their game id
// (the save names a taught TM by it, and "giga-drain" is Grass Knot)
async function addTms(data) {
  const ids = {};
  for (const m of (await get('https://pokesurvivor.wiki/moves') || '').matchAll(/\{id:"([a-z0-9-]+)",name:"([^"]+)"/g)) ids[m[2]] = m[1];
  for (const m of data.moves) m.id = ids[m.name];
  const byId = Object.fromEntries(data.moves.map((m, i) => [m.id, i]));
  const dexes = [...(await get('https://pokesurvivor.wiki/pokedex') || '').matchAll(/slug:"[a-z0-9-]+",dex:(\d+),name:"([^"]+)"/g)];
  data.dex = {};
  for (const [, dex, name] of dexes) data.dex[name.toLowerCase()] ??= +dex;
  const nameOf = Object.fromEntries(Object.entries(data.dex).map(([n, d]) => [d, n]));
  // The game's own table (js/data/tms.js): "move-id":[dex, …]
  const src = await get('https://raw.githubusercontent.com/JPTER78/pokesurvivor/main/js/data/tms.js') || '';
  const tm = {}, unknown = new Set();
  for (const [, id, list] of src.matchAll(/"([a-z0-9-]+)":\[([\d,]*)\]/g)) {
    if (!(id in byId)) { unknown.add(id); continue; }
    for (const d of list.split(',').filter(Boolean)) {
      const n = nameOf[d];
      if (n && data.mons[n] && !data.mons[n].includes(byId[id])) (tm[n] = tm[n] || []).push(byId[id]);
    }
  }
  data.tm = tm;
  console.log('tm', Object.keys(tm).length, 'pokémon', 'moves without id', data.moves.filter(m => !m.id).map(m => m.name), 'unknown tm ids', [...unknown]);
}
const write = (data, date) => {
  const src = '// Moves each pokémon can learn (first = starting move), crawled from https://pokesurvivor.wiki/pokedex\n' +
    `// ${date} · ${Object.keys(data.mons).length} pokémon · ${data.moves.length} moves. mons[name] = indices into moves; evo = stat card the move needs to evolve.\n` +
    '// builds[name] = default build (moves by priority) from https://survivortiers.pages.dev\n' +
    '// tm[name] = moves it can be taught with a TM (pokesurvivor.com js/data/tms.js), dex[name] = dex number, moves[i].id = game id\n' +
    `window.PSBotMoves = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(outFile, src);
};
(async () => {
  if (['--evo', '--builds', '--tm'].some(a => process.argv.includes(a))) {
    const text = fs.readFileSync(outFile, 'utf8'), data = JSON.parse(text.slice(text.indexOf('PSBotMoves = ') + 13, text.lastIndexOf(';')));
    if (process.argv.includes('--evo')) await addEvolutions(data);
    if (process.argv.includes('--builds')) await addBuilds(data);
    if (process.argv.includes('--tm')) await addTms(data);
    return write(data, (text.match(/^\/\/ (\d{4}-\d\d-\d\d)/m) || [])[1] || new Date().toISOString().slice(0, 10));
  }
  const dex = await get('https://pokesurvivor.wiki/pokedex');
  parseDex(dex);
  let k = 0;
  const queue = [...list];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) { await one(queue.shift()); if (++k % 100 === 0) console.log(k); }
  }));
  const names = Object.keys(moves).sort();
  const idx = Object.fromEntries(names.map((n, i) => [n, i]));
  const data = {
    moves: names.map(n => ({ name: n, ...moves[n] })),
    mons: Object.fromEntries(list.filter(m => out[m.name.toLowerCase()]).map(m => [m.name.toLowerCase(), out[m.name.toLowerCase()].map(n => idx[n])])),
  };
  await addEvolutions(data);
  await addBuilds(data);
  await addTms(data);
  write(data, new Date().toISOString().slice(0, 10));
  console.log('done', Object.keys(data.mons).length, 'mons', names.length, 'moves', 'fails', fails);
})();
