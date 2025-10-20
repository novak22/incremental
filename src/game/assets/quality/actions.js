import { getState } from '../../../core/state.js';
import { getAssetDefinition } from '../../../core/state/registry.js';
import { executeAction } from '../../actions.js';
import { checkDayEnd } from '../../lifecycle.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { getQualityConfig } from './levels.js';
import { getUsageStatus } from './usage.js';
import {
  createActionContext,
  evaluateActionAvailability,
  getQualityActionAvailability as getAvailabilityResult
} from './availability.js';
import {
  applyCosts,
  logCompletion,
  updateProgressAndLevel,
  validateReadiness
} from './execution.js';

export function runQualityAction(definition, instanceId, actionId) {
  const readiness = validateReadiness({ definition, instanceId, actionId });
  if (!readiness.ok) {
    return { qualityUpdated: false };
  }

  applyCosts(readiness);
  return updateProgressAndLevel({ ...readiness, log: logCompletion });
}

export function performQualityAction(assetId, instanceId, actionId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return;

  executeAction(() => {
    const result = runQualityAction(definition, instanceId, actionId);
    if (result?.qualityUpdated) {
      markDirty(['cards', 'dashboard', 'headerAction']);
    }
  });
  checkDayEnd();
}

export function canPerformQualityAction(definition, instance, action, state = getState()) {
  if (!definition || !instance || !action) return false;
  if (!state) return false;
  if (instance.status !== 'active') return false;

  const context = createActionContext(definition, instance, state);
  const availability = evaluateActionAvailability(action, context);
  if (!availability.unlocked) return false;

  const usage = getUsageStatus(instance, action);
  if (usage.exhausted) return false;

  const timeCost = Math.max(0, Number(action.time) || 0);
  const moneyCost = Math.max(0, Number(action.cost) || 0);
  if (timeCost > 0 && state.timeLeft < timeCost) return false;
  if (moneyCost > 0 && state.money < moneyCost) return false;

  return true;
}

export function getQualityActions(definition) {
  const config = getQualityConfig(definition);
  return config?.actions || [];
}

export function getQualityActionAvailability(definition, instance, action, state = getState()) {
  if (!definition || !instance || !action) {
    return { unlocked: false, reason: '' };
  }
  return getAvailabilityResult(definition, instance, action, state);
}

export function getQualityTracks(definition) {
  const config = getQualityConfig(definition);
  return config?.tracks || {};
}

export function getQualityActionUsage(definition, instance, action) {
  if (!definition || !instance || !action) {
    return {
      dailyLimit: 1,
      usedToday: 0,
      remainingUses: 1,
      exhausted: false
    };
  }
  return getUsageStatus(instance, action);
}

