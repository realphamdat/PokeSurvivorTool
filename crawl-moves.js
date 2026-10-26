// Re-crawl the learnable moves of every pokémon from pokesurvivor.wiki into core/moves.js:  node crawl-moves.js
// Only add / refresh the evolution table (move -> stat card it needs) in the existing core/moves.js:  node crawl-moves.js --evo
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
const write = (data, date) => {
  const src = '// Moves each pokémon can learn (first = starting move), crawled from https://pokesurvivor.wiki/pokedex\n' +
    `// ${date} · ${Object.keys(data.mons).length} pokémon · ${data.moves.length} moves. mons[name] = indices into moves; evo = stat card the move needs to evolve.\n` +
    `window.PSBotMoves = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(outFile, src);
};
(async () => {
  if (process.argv.includes('--evo')) {
    const text = fs.readFileSync(outFile, 'utf8'), data = JSON.parse(text.slice(text.indexOf('PSBotMoves = ') + 13, text.lastIndexOf(';')));
    await addEvolutions(data);
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
  write(data, new Date().toISOString().slice(0, 10));
  console.log('done', Object.keys(data.mons).length, 'mons', names.length, 'moves', 'fails', fails);
})();
