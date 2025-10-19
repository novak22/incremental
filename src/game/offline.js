import { addLog } from '../core/log.js';
import { getState } from '../core/state.js';
import { ACTIONS } from './hustles.js';

export function handleOfflineProgress(lastSaved) {
  const state = getState();
  if (!state) return;
  const now = Date.now();
  const elapsed = Math.max(0, (now - lastSaved) / 1000);
  if (!elapsed) return;

  for (const hustle of ACTIONS) {
    if (typeof hustle.process === 'function') {
      const result = hustle.process(now, true);
      if (result?.offlineLog) {
        addLog(result.offlineLog.message, result.offlineLog.type || 'info');
      }
    }
  }

}
