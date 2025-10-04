import { saveState } from '../core/storage.js';
import { updateUI } from '../ui/update.js';
import { consumeDirty } from '../ui/invalidation.js';

export function executeAction(effect) {
  if (typeof effect === 'function') {
    effect();
  }
  const dirtySections = consumeDirty();
  if (Object.keys(dirtySections).length > 0) {
    updateUI(dirtySections);
  } else {
    updateUI();
  }
  saveState();
}
