import { saveState } from '../core/storage.js';
import { ASSETS, collectPassiveIncome } from './assets.js';
import { HUSTLES } from './hustles.js';
import { updateUI } from '../ui/update.js';

let lastTick = Date.now();

export function resetTick() {
  lastTick = Date.now();
}

export function startGameLoop() {
  setInterval(runGameLoop, 1000);
}

function runGameLoop() {
  const now = Date.now();
  const dt = Math.min(5, (now - lastTick) / 1000);
  lastTick = now;

  if (dt <= 0) return;

  for (const asset of ASSETS) {
    if (asset.passiveIncome) {
      collectPassiveIncome(asset, dt, false);
    }
  }

  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      hustle.process(now, false);
    }
  }

  updateUI();
  saveState();
}
