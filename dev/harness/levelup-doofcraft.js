// Mock pokesurvivor.doofcraft.com choice dialogs; records keys and taps the bot sends
(() => {
  document.body.innerHTML = '<div id="app"><canvas class="ps-canvas" width="800" height="600" style="position:fixed;left:0;top:0;width:100vw;height:100vh"></canvas><div id="stage"></div></div>';
  window.__log = { keys: [], taps: [] };
  window.addEventListener('keydown', e => { if (/^Digit|KeyR/.test(e.code) && !e.isTrusted) __log.keys.push(e.code); });
  const card = (i, name, chip, desc) => `<button class="ps-card" data-i="${i}" style="display:inline-block;width:200px;height:120px;margin:4px"><div class="txt"><div class="nm">${name}<span> ${chip}</span></div><div class="ds">${desc}</div></div></button>`;
  const scenes = {
    levelUp: () => card(1, 'Ember', 'New · Fire', 'deals damage') + card(2, 'Harden', 'New · Normal', 'No damage') + card(3, 'Fire Spin', 'Lv.2 > 3', 'attack power'),
    // Z crystal: its chip is a .tag-chip; its text mentions Mega Evolving, which must not read as an evolution
    zMove: () => card(1, 'Fire Spin', 'Lv.2 > 3', 'attack power') + card(2, 'Firium Z', '<span class="tag-chip">Z-Move</span>', 'Inferno Overdrive: a Fire-type burst that hits every foe around you. Use it from the Z slot, then 2:00 to recharge. Mega Evolving removes it.') + card(3, 'Power', 'Common', '+10% damage'),
    // Waves chest: Rare Candy / Upgrade / Tickets (tickets first with SITE.farmItems on)
    chest: () => card(1, 'Rare Candy', '', 'The team goes up a level') + card(2, 'Upgrade: Fire Spin', 'Lv.2 > 3', 'attack power') + card(3, 'Tickets', '', '+5 gacha tickets'),
    band: () => card(1, 'Slot A', '', 'first') + card(2, 'Slot B', '', 'second'),
  };
  const titles = { levelUp: 'Level up!', zMove: 'Level up!', chest: 'Chest', band: 'Choice Band' };
  window.__scene = async name => {
    __log = { keys: [], taps: [] };
    const stage = document.getElementById('stage');
    stage.innerHTML = `<div class="ps-choice" style="position:fixed;left:200px;top:150px;z-index:10;background:#222;color:#fff;padding:10px"><div class="ps-box armed"><h2>${titles[name]}</h2><div class="ps-cards">${scenes[name]()}</div></div></div>`;
    stage.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { __log.taps.push(el.dataset.i + ':' + el.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)); stage.innerHTML = ''; }));
    await new Promise(r => setTimeout(r, 2000));
    stage.innerHTML = '';
    return { name, coarse: matchMedia('(pointer: coarse)').matches, ...__log };
  };
})();
