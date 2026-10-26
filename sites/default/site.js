// PokeSurvivor Bot — profile for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.
window.PSBotSite = h => {
  function readCard(k) {
    const { state, CFG, fontSize } = h;
    let card = k;
    while (card.parentElement && card.parentElement.querySelectorAll('div.key').length === 1) card = card.parentElement;
    const t = card.innerText;
    // Card title = the largest text in the card that is not the hotkey digit
    const leaves = [...card.querySelectorAll('*')].filter(e => !e.children.length && e !== k && /\D/.test(e.innerText || ''));
    const title = leaves.reduce((b, e) => (!b || fontSize(e) > fontSize(b) ? e : b), null);
    const name = title ? title.innerText.trim() : '';
    const shownLv = t.match(/\b(?:Lv|Nv|Niv)\.?\s*(\d+)/i);                 // "Lv. 3" chip on owned skills, if the game shows one
    return h.scoreCard({
      key: k.innerText.trim(), name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), shownLv ? +shownLv[1] - 1 : 0),
      isNew: /\bNew\b|Nuevo|Novo|Mới/i.test(t),
      evo: CFG.evoRe.test(t) || /evo|awaken|ultimate/i.test(card.className + ' ' + [...card.querySelectorAll('[class]')].map(e => e.className).join(' ')),
      fitLow: !!card.querySelector('.fit-low'), fitHigh: !!card.querySelector('.fit-high'),
    });
  }

  return {
    id: 'default', label: 'Mặc định · pokesurvivor.com',
    ready: () => !!document.getElementById('game'),
    canvas: () => document.getElementById('game'),
    // World sprites are drawn scaled by the camera zoom, the HUD untransformed
    isWorld: d => d.s !== 1,
    camera: world => world[0],
    enemyRe: /\/assets\/pokemon\/\d+\/(?!Faint)\w+\.png/,
    tags: { 'canvas:14x14': 'hazard', 'canvas:12x12': 'hazard' },
    sizeTags: true,           // a size-only tag ("canvas:14x14") also matches every hash of that size
    cfg: {},
    levelUp() {
      if (!h.visible(document.getElementById('lvl-num'))) return null;
      return { cards: [...document.querySelectorAll('div.key')].filter(h.visible).map(readCard), rerolls: +(document.getElementById('lvl-rr-n') || {}).innerText || 0 };
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
