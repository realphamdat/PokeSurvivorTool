// PokeSurvivor Bot — profile for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.
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
    // Card title = the largest text in the card that is not the hotkey digit
    const leaves = [...card.querySelectorAll('*')].filter(e => !e.children.length && e !== k && /\D/.test(e.innerText || ''));
    const title = leaves.reduce((b, e) => (!b || fontSize(e) > fontSize(b) ? e : b), null);
    const name = title ? title.innerText.trim() : '';
    const shownLv = t.match(/\b(?:Lv|Nv|Niv)\.?\s*(\d+)/i);                 // "Lv. 3" chip on owned skills, if the game shows one
    return { ...h.scoreCard({
      key, name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), shownLv ? +shownLv[1] - 1 : 0),
      isNew: /\bNew\b|Nuevo|Novo|Mới/i.test(t),
      evo: CFG.evoRe.test(t) || /evo|awaken|ultimate/i.test(card.className + ' ' + [...card.querySelectorAll('[class]')].map(e => e.className).join(' ')),
      fitLow: !!card.querySelector('.fit-low'), fitHigh: !!card.querySelector('.fit-high'),
    }), el };
  }
  // The game canvas: #game on desktop; if a layout (phones?) has none, the biggest visible canvas that isn't the bot's own
  const gameCanvas = () => document.getElementById('game') || [...document.querySelectorAll('canvas:not([data-psbot-ui])')]
    .filter(c => c.width * c.height >= 200000 && c.getClientRects().length).sort((a, b) => b.width * b.height - a.width * a.height)[0] || null;

  return {
    id: 'default', label: 'Mặc định · pokesurvivor.com',
    ready: () => !!gameCanvas(),
    canvas: gameCanvas,
    // World sprites are drawn scaled by the camera zoom, the HUD untransformed
    isWorld: d => d.s !== 1,
    camera: world => world[0],
    enemyRe: /\/assets\/pokemon\/\d+\/(?!Faint)\w+\.png/,
    tags: { 'canvas:14x14': 'hazard', 'canvas:12x12': 'hazard' },
    sizeTags: true,           // a size-only tag ("canvas:14x14") also matches every hash of that size
    cfg: {},
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
