// PokeSurvivor Bot — game hook for pokesurvivor.com (damhieu2808 · https://github.com/damhieu2808/PokeSurvivorTool) — MIT License
// Runs at document_start, before the game's scripts. The home page keeps every game module on an internal object
// (var ns = {BUILT: true, LIFT: 18}; ns.Game = …) that never reaches window; /dev.html exposes the same object as
// window.G. A one-shot 'Game' setter on Object.prototype catches it when the game assigns ns.Game and hands it over
// as window.G, so site.js scene() reads the real game state on the home page too. Loaded later (bookmarklet,
// loader.js) it is too late and the bot reads the canvas instead.
// Idea from BoundlessEgret/pokesurvivor-autofarm (MIT).
(() => {
  if (window.G || Object.getOwnPropertyDescriptor(Object.prototype, 'Game')) return;
  const trap = {
    configurable: true,
    get() { return undefined; },
    set(v) {
      Object.defineProperty(this, 'Game', { value: v, writable: true, enumerable: true, configurable: true });
      if (this && this.BUILT === true && 'LIFT' in this) { drop(); window.G = this; }
    },
  };
  const drop = () => { if (Object.getOwnPropertyDescriptor(Object.prototype, 'Game')?.set === trap.set) delete Object.prototype.Game; };
  Object.defineProperty(Object.prototype, 'Game', trap);
  // The game changed and never assigned ns.Game: don't leave the setter on every object
  addEventListener('load', () => { if (!window.G) drop(); }, { once: true });
})();
