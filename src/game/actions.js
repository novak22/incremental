import { flushDirty } from '../core/events/invalidationBus.js';
import { getSaveState } from './storageProvider.js';

export function createActionExecutor({
  flushDirty: flushDirtyFn = flushDirty,
  saveState: saveStateFn
} = {}) {
  return function executeAction(effect) {
    if (typeof effect === 'function') {
      effect();
    }
    flushDirtyFn();
    const resolvedSaveState =
      typeof saveStateFn === 'function' ? saveStateFn : getSaveState();
    resolvedSaveState?.();
  };
}

export const executeAction = createActionExecutor();
