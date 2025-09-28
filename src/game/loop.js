import { AUTOSAVE_INTERVAL_MS } from '../core/constants.js';
import { saveState } from '../core/storage.js';
import { HUSTLES } from './hustles.js';
import { updateUI } from '../ui/update.js';

let lastAutosave = Date.now();

export function resetTick() {
  lastAutosave = Date.now();
}

export function startGameLoop() {
  setInterval(runGameLoop, 1000);
}

function runGameLoop() {
  const now = Date.now();
  let uiDirty = false;

  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      const result = hustle.process(now, false);
      if (result?.changed) {
        uiDirty = true;
      }
    }
  }

  if (uiDirty) {
    updateUI();
  }

  if (now - lastAutosave >= AUTOSAVE_INTERVAL_MS) {
    saveState();
    lastAutosave = now;
  }
}
