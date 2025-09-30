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

export function getUpgradeButtonLabel(upgrade) {
  if (!upgrade) return 'Upgrade';
  const action = upgrade.action;
  if (!action) {
    return upgrade.name || 'Upgrade';
  }
  if (typeof action.label === 'function') {
    const label = action.label();
    if (label) return label;
  } else if (action.label) {
    return action.label;
  }
  return upgrade.name ? `Purchase ${upgrade.name}` : 'Purchase Upgrade';
}

export function isUpgradeDisabled(upgrade) {
  if (!upgrade?.action) return true;
  if (typeof upgrade.action.disabled === 'function') {
    return upgrade.action.disabled();
  }
  return Boolean(upgrade.action.disabled);
}
