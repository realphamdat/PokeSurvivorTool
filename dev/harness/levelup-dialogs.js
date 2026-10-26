// Mock pokesurvivor.com level-up / item dialogs in desktop and phone variants; records keys and taps the bot sends
(() => {
  document.body.innerHTML = '<canvas id="game" width="800" height="600" style="position:fixed;left:0;top:0;width:100vw;height:100vh"></canvas><div id="stage"></div>';
  window.__log = { keys: [], taps: [] };
  window.addEventListener('keydown', e => { if (/^Digit|KeyR/.test(e.code) && !e.isTrusted) __log.keys.push(e.code); });
  const box = 'position:fixed;left:200px;top:150px;width:700px;background:#222;color:#fff;padding:10px;z-index:10';
  const card = (i, keyMode, title, desc) => `<div class="card" data-i="${i}" style="display:inline-block;width:200px;height:120px;margin:4px;background:#444;vertical-align:top">` +
    (keyMode === 'none' ? '' : `<div class="key" style="${keyMode === 'hidden' ? 'display:none' : ''}">${i}</div>`) +
    `<div style="font-size:20px">${title}</div><div style="font-size:12px">${desc}</div></div>`;
  const scenes = {
    levelUp: keyMode => `<div style="${box}"><div>Level <span id="lvl-num">5</span></div><div class="cards">` +
      card(1, keyMode, 'Ember', 'New · deals damage') + card(2, keyMode, 'Harden', 'armor up') + card(3, keyMode, 'Fire Spin', 'Lv. 2 attack power') +
      `</div><div><button style="width:120px;height:44px">Reroll (<span id="lvl-rr-n">2</span>)</button><button style="width:120px;height:44px">Skip</button></div></div>`,
    run: () => `<div style="${box}"><button style="width:150px;height:60px">Pause</button><button style="width:150px;height:60px">Spectate</button></div>`,
    item: keyMode => `<div style="${box}"><div>An item! You can only hold one</div>` +
      (keyMode === 'none'
        ? '<button data-i="1" style="display:block;width:300px;height:50px">Keep Life Orb</button><button data-i="2" style="display:block;width:300px;height:50px">Switch to Quick Claw</button>'
        : '<div data-i="1" style="height:50px"><span style="display:none">1</span><span>Keep Life Orb</span></div><div data-i="2" style="height:50px"><span style="display:none">2</span><span>Switch to Quick Claw</span></div>') + '</div>',
  };
  window.__scene = async (name, keyMode) => {
    __log = { keys: [], taps: [] };
    const stage = document.getElementById('stage');
    stage.innerHTML = scenes[name](keyMode);
    stage.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { __log.taps.push(el.dataset.i + ':' + el.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)); stage.innerHTML = ''; }));
    await new Promise(r => setTimeout(r, 2000));
    stage.innerHTML = '';
    return { name, keyMode, ...__log };
  };
})();
