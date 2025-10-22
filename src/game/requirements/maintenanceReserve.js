import { getState, getUpgradeState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { ASSISTANT_CONFIG } from '../assistant/config.js';

export function estimateManualMaintenanceReserve(state = getState()) {
  if (!state) return 0;
  const assets = state.assets || {};
  let upkeepDemand = 0;
  const assistantUpgrade = getUpgradeState('assistant', state);
  const assistantCountRaw = Number(assistantUpgrade?.count) || 0;
  const assistantCount = Math.max(0, Math.min(ASSISTANT_CONFIG.maxAssistants, assistantCountRaw));
  let assistantHoursRemaining = assistantCount * ASSISTANT_CONFIG.hoursPerAssistant;

  for (const [assetId, assetState] of Object.entries(assets)) {
    if (!assetState?.instances?.length) continue;
    const definition = getAssetDefinition(assetId);
    if (!definition) continue;
    const maintenanceHours = Number(definition.maintenance?.hours) || 0;
    if (maintenanceHours <= 0) continue;

    for (const instance of assetState.instances) {
      if (instance?.status !== 'active' || instance?.maintenanceFundedToday) continue;

      const assistantHoursApplied = Math.min(assistantHoursRemaining, maintenanceHours);
      assistantHoursRemaining -= assistantHoursApplied;

      const manualHoursNeeded = Math.max(0, maintenanceHours - assistantHoursApplied);
      upkeepDemand += manualHoursNeeded;
    }
  }

  return Math.max(0, upkeepDemand);
}

