import { AUTOSAVE_INTERVAL_MS } from '../core/constants.js';
import { saveState } from '../core/storage.js';
import { HUSTLES } from './hustles.js';
import { updateUI } from '../ui/update.js';
import { consumeDirty, markAllDirty, markDirty } from '../ui/invalidation.js';

let lastAutosave = Date.now();

export function resetTick() {
  lastAutosave = Date.now();
}

export function startGameLoop() {
  setInterval(runGameLoop, 1000);
}

export function runGameLoop() {
  const now = Date.now();
  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      const result = hustle.process(now, false);
      if (!result) {
        continue;
      }

      if (typeof result === 'boolean') {
        if (result) {
          markAllDirty();
        }
        continue;
      }

      if (typeof result === 'object') {
        let flagged = false;
        for (const [section, value] of Object.entries(result)) {
          if (section === 'changed') continue;
          if (value) {
            markDirty(section, true);
            flagged = true;
          }
        }

        if (!flagged && result.changed) {
          markAllDirty();
        }
      }
    }
  }

  const dirtySections = consumeDirty();
  if (Object.keys(dirtySections).length === 0) {
    if (now - lastAutosave >= AUTOSAVE_INTERVAL_MS) {
      saveState();
      lastAutosave = now;
    }
    return;
  }

  updateUI(dirtySections);

  if (now - lastAutosave >= AUTOSAVE_INTERVAL_MS) {
    saveState();
    lastAutosave = now;
  }
}
