import { addLog } from '../core/log.js';
import { getAssetState, getState } from '../core/state.js';
import { collectPassiveIncome } from './assets.js';
import { HUSTLES } from './hustles.js';
import { ASSETS } from './assets.js';

export function handleOfflineProgress(lastSaved) {
  const state = getState();
  if (!state) return;
  const now = Date.now();
  const elapsed = Math.max(0, (now - lastSaved) / 1000);
  if (!elapsed) return;

  for (const asset of ASSETS) {
    if (!asset.passiveIncome) continue;
    if (asset.isActive && !asset.isActive(state, getAssetState(asset.id))) continue;
    const earned = collectPassiveIncome(asset, elapsed, true);
    if (earned > 0 && asset.passiveIncome.offlineMessage) {
      addLog(asset.passiveIncome.offlineMessage(earned), asset.passiveIncome.logType || 'passive');
    }
  }

  for (const hustle of HUSTLES) {
    if (typeof hustle.process === 'function') {
      const result = hustle.process(now, true);
      if (result && result.offlineLog) {
        addLog(result.offlineLog.message, result.offlineLog.type || 'info');
      }
    }
  }
}
