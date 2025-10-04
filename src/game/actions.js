import { flushDirty } from '../core/events/invalidationBus.js';
import { saveState } from '../core/storage.js';

export function createActionExecutor({
  flushDirty: flushDirtyFn = flushDirty,
  saveState: saveStateFn = saveState
} = {}) {
  return function executeAction(effect) {
    if (typeof effect === 'function') {
      effect();
    }
    flushDirtyFn();
    saveStateFn();
  };
}

export const executeAction = createActionExecutor();
