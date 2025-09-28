import { saveState } from '../core/storage.js';
import { updateUI } from '../ui/update.js';

export function executeAction(effect) {
  if (typeof effect === 'function') {
    effect();
  }
  updateUI();
  saveState();
}
