import { getState, getUpgradeState } from '../../../core/state.js';
import { ensureInstanceQuality } from './levels.js';

export function createActionContext(definition, instance, state = getState()) {
  const quality = ensureInstanceQuality(definition, instance);
  return {
    state,
    definition,
    instance,
    quality,
    upgrade: id => getUpgradeState(id)
  };
}

export function evaluateActionAvailability(action, context) {
  if (!action) {
    return { unlocked: false, reason: '' };
  }

  if (typeof action.available === 'function') {
    const available = action.available(context);
    if (!available) {
      const reason = typeof action.unavailableMessage === 'function'
        ? action.unavailableMessage(context)
        : action.unavailableMessage || action.lockedMessage || 'Requirements not yet met.';
      return { unlocked: false, reason };
    }
  }

  const upgradeRequirement = action.requiresUpgrades ?? action.requiresUpgrade;
  if (upgradeRequirement) {
    const ids = Array.isArray(upgradeRequirement) ? upgradeRequirement : [upgradeRequirement];
    for (const upgradeId of ids) {
      const purchased = context.upgrade(upgradeId)?.purchased;
      if (!purchased) {
        const reasonContext = { ...context, missingUpgrade: upgradeId };
        const reason = typeof action.unavailableMessage === 'function'
          ? action.unavailableMessage(reasonContext)
          : typeof action.lockedMessage === 'function'
            ? action.lockedMessage(reasonContext)
            : action.lockedMessage || action.unavailableMessage || 'Upgrade required first.';
        return { unlocked: false, reason };
      }
    }
  }

  return { unlocked: true, reason: '' };
}

export function getQualityActionAvailability(definition, instance, action, state = getState()) {
  const context = createActionContext(definition, instance, state);
  return evaluateActionAvailability(action, context);
}

export default {
  createActionContext,
  evaluateActionAvailability,
  getQualityActionAvailability
};
