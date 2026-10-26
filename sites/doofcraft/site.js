// PokeSurvivor Bot — profile for pokesurvivor.doofcraft.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// A rewrite of the game with its own canvas, sprite paths and menus.
// Loaded before core/bot.js, which calls PSBotSite(h) at start. h = the core's helpers
// (CFG, state, visible, fontSize, scoreCard, pickRow), filled in once they exist: only use them inside the methods.
window.PSBotSite = h => {
  // Choice dialog: answerable once "armed" (input is locked for 1 s after it opens) and not yet submitted
  const dcBox = () => { const b = document.querySelector('.ps-choice:not(.hidden) .ps-box.armed'); return b && !b.querySelector('.ps-cards.done') ? b : null; };
  const dcTitle = box => ((box.querySelector('h2') || {}).innerText || '').trim();
  // Card = button.ps-card > .txt > .nm (title text + chips "New · Fire" / "Lv.2 > 3" / "EVOLUTION") + .ds (description)
  const dcName = c => { const nm = c.querySelector('.nm'); return nm ? [...nm.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : ''; };
  function readDcCard(c, i) {
    const { state, CFG } = h;
    const t = c.innerText, name = dcName(c);
    const lv = t.match(/\bLv\.?\s*(\d+)\s*>/i);                          // upgrade chip: current level > next
    return h.scoreCard({
      key: String(i + 1), name, t,
      level: Math.max((state.picks[name] || 0) + (state.hudTexts.has(name) ? 1 : 0), lv ? +lv[1] : 0),
      isNew: /\bNew\b/i.test(t), evo: c.classList.contains('evo') || CFG.evoRe.test(t), fitLow: false, fitHigh: false,
    });
  }

  return {
    id: 'doofcraft', label: 'Doofcraft · pokesurvivor.doofcraft.com',
    ready: () => !!document.getElementById('app'),
    canvas: () => document.querySelector('canvas.ps-canvas'),
    // The whole frame is scaled by devicePixelRatio; the world also gets the camera translation, the HUD doesn't
    isWorld: d => d.e !== 0 || d.f !== 0,
    // Effects (beams, slashes) add their own translate / rotate: pokémon sprites carry the plain camera transform
    camera: (world, pokes) => pokes[0] || world[0],
    enemyRe: /\/sprites\/[\w-]+\/(?:s\/)?(?!Faint)\w+\.png/,
    // Pickup colours from the game's source: xp / big xp diamonds, heal berry and magnet orbs, item / chest halo
    tags: { 'fill:#7fe0ff': 'xp', 'fill:#ffd95e': 'xp', 'fill:#5fe08a': 'good', 'fill:#ff9ed8': 'good', 'fill:#ffe14d': 'good' },
    sizeTags: false,
    // Digits 1-4 pick the active slot (no consumable hotkeys); E sends a cycleSlot request to the server, so not every frame
    cfg: { useItems: false, swapEvery: 200, blockRank: false },
    levelUp() {
      const box = dcBox();
      if (!box || !/^level|cleared/i.test(dcTitle(box))) return null;
      const rr = box.querySelector('[data-testid="reroll"]');
      return { cards: [...box.querySelectorAll('button.ps-card')].map(readDcCard), rerolls: rr ? +((rr.innerText.match(/\((\d+)\)/) || [])[1] || 0) : 0 };
    },
    choiceOpen: () => !!document.querySelector('.ps-choice:not(.hidden) .ps-box'),
    // Choice Band slot / waves chest: no scoring, take the first option so the run doesn't wait forever
    otherChoice() {
      const box = dcBox();
      if (!box || /^level|cleared|an item|bond/i.test(dcTitle(box))) return;
      const cards = [...box.querySelectorAll('button.ps-card')];
      if (!cards.length) return;
      h.pickRow(dcTitle(box) || 'chọn', cards.map((c, i) => ({ key: String(i + 1), name: dcName(c), score: -i, text: c.innerText.replace(/\s+/g, ' ').slice(0, 80) })));
    },
    menu: buttons => buttons.some(b => b.matches('[data-testid="menu-solo"], [data-testid="solo-start"]')),
    // Results -> menu, continue a saved run (or confirm ending it), Solo -> Play
    restartButton(buttons) {
      for (const sel of ['[data-testid="game-exit"]', '[data-testid="saved-run-new-confirm"] [data-testid="dialog-confirm"]',
        '[data-testid="saved-run-resume"]', '[data-testid="solo-start"]', '[data-testid="menu-solo"]']) {
        const b = buttons.find(b => b.matches(sel));
        if (b) return b;
      }
    },
  };
};
