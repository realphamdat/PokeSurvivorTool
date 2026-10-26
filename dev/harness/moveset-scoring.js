// Mock pokesurvivor.com level-up: shows given cards (visible hotkeys) and returns the digit the bot presses
(() => {
  document.body.innerHTML = '<canvas id="game" width="800" height="600" style="position:fixed;left:0;top:0;width:100vw;height:100vh"></canvas><div id="stage"></div>';
  let pressed = null;
  window.addEventListener('keydown', e => { if (/^Digit/.test(e.code) && !e.isTrusted && !pressed) pressed = e.code.slice(5); });
  window.__pick = async (owned, cards) => {
    PSBot.state.hudTexts = new Set(['Kartana', ...owned]);
    PSBot.state.picks = {};
    PSBot.state.pickAt = 0;
    pressed = null;
    const stage = document.getElementById('stage');
    stage.innerHTML = `<div style="position:fixed;left:200px;top:150px;width:900px;background:#222;color:#fff;z-index:10"><div>Level <span id="lvl-num">5</span></div>` +
      cards.map(([title, desc], i) => `<div class="card" style="display:inline-block;width:200px;height:120px;margin:4px;background:#444;vertical-align:top"><div class="key">${i + 1}</div><div style="font-size:20px">${title}</div><div style="font-size:12px">${desc}</div></div>`).join('') + '</div>';
    for (let i = 0; i < 20 && !pressed; i++) await new Promise(r => setTimeout(r, 50));
    stage.innerHTML = '';
    return pressed ? cards[pressed - 1][0] : null;
  };
})();
