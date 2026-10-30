// core/moves.js exported from pokesurvivor.com itself (no wiki): the game's moves, each pokémon's natural moves and TMs,
// dex numbers, evolutions. The game's sources are minified now (js/app.min.js), so they're read from G, in two steps:
// 1. On https://pokesurvivor.com with the bot and G (extension / userscript: hook.js), language English, run this file
//    in the console: it downloads psbot-moves.json (PSBot.SITE.gameTable, sites/default/site.js)
// 2. node crawl-moves.js psbot-moves.json   → core/moves.js
if (typeof window !== 'undefined') {
  (() => {
    const g = window.G, SITE = window.PSBot && window.PSBot.SITE;
    if (!g || !SITE || !SITE.gameTable) return console.warn('[PSBot] cần bot + G (extension / userscript) trên pokesurvivor.com');
    if (g.I18n && g.I18n.lang !== 'en') return console.warn('[PSBot] đổi ngôn ngữ game sang English trước', g.I18n.lang);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(SITE.gameTable({ base: true, desc: true }))], { type: 'application/json' }));
    a.download = 'psbot-moves.json';
    a.click();
  })();
} else {
  const fs = require('fs'), path = require('path');
  const file = process.argv[2];
  if (!file) { console.log('node crawl-moves.js <psbot-moves.json>  (xem đầu file)'); process.exit(1); }
  let data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof data === 'string') data = JSON.parse(data);   // saved as a JSON string (devtools evaluate_script)
  if (!data || !Array.isArray(data.moves) || !data.mons || !data.tm || !data.dex) throw new Error('not a gameTable export');
  const date = new Date().toISOString().slice(0, 10);
  const src = '// pokesurvivor.com\'s own move table, exported from the game (G) by crawl-moves.js. Without G the bot prefers its\n' +
    '// copy from the last load with G (sites/default/site.js gameTable)\n' +
    `// ${date} · ${Object.keys(data.mons).length} pokémon · ${data.moves.length} moves. mons[name] = indices into moves (first = starting move);\n` +
    '// evo = stat card the move needs to evolve; tm[name] = moves it can be taught with a TM, dex[name] = dex number, moves[i].id = game id\n' +
    `window.PSBotMoves = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(path.join(__dirname, 'core', 'moves.js'), src);
  console.log('core/moves.js', Object.keys(data.mons).length, 'mons', data.moves.length, 'moves',
    data.moves.filter(m => m.evo).length, 'evolutions', Object.keys(data.tm).length, 'with TMs');
}
