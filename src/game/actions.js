import { saveState } from '../core/storage.js';
import { flushDirty } from '../core/events/invalidationBus.js';

export function executeAction(effect) {
  if (typeof effect === 'function') {
    effect();
  }
  flushDirty();
  saveState();
}
