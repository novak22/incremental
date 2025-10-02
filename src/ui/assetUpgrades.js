import { getState, getUpgradeState } from '../core/state.js';
import { getUpgradeDefinition } from '../core/state/registry.js';
import { getDefinitionRequirements } from '../game/requirements.js';

export function getPendingEquipmentUpgrades(definition, state = getState()) {
  if (!definition) return [];
  const requirements = getDefinitionRequirements(definition);
  const equipment = requirements?.byType?.equipment || [];
  if (!equipment.length) return [];

  const seen = new Set();
  const pending = [];
  equipment.forEach(entry => {
    const id = entry?.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    const upgrade = getUpgradeDefinition(id);
    if (!upgrade?.action) return;
    const upgradeState = getUpgradeState(id, state);
    if (upgradeState?.purchased) return;
    pending.push(upgrade);
  });
  return pending;
}

export function isUpgradeDisabled(upgrade) {
  if (!upgrade?.action) return true;
  if (typeof upgrade.action.disabled === 'function') {
    return upgrade.action.disabled();
  }
  return Boolean(upgrade.action.disabled);
}
