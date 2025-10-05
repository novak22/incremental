import { AUTOSAVE_INTERVAL_MS } from '../core/constants.js';
import { saveState } from '../core/storage.js';
import { ACTIONS } from './hustles.js';
import { flushDirty, markAllDirty, markDirty } from '../core/events/invalidationBus.js';

let lastAutosave = Date.now();

export function resetTick() {
  lastAutosave = Date.now();
}

export function startGameLoop() {
  setInterval(runGameLoop, 1000);
}

export function runGameLoop() {
  const now = Date.now();
  for (const hustle of ACTIONS) {
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

  const dirtySections = flushDirty();
  if (!dirtySections) {
    if (now - lastAutosave >= AUTOSAVE_INTERVAL_MS) {
      saveState();
      lastAutosave = now;
    }
    return;
  }

  if (now - lastAutosave >= AUTOSAVE_INTERVAL_MS) {
    saveState();
    lastAutosave = now;
  }
}
