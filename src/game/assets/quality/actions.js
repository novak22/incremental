import { formatHours, formatMoney } from '../../../core/helpers.js';
import { addLog } from '../../../core/log.js';
import { getAssetState, getState, getUpgradeState } from '../../../core/state.js';
import { getAssetDefinition } from '../../../core/state/registry.js';
import { getAssetEffectMultiplier } from '../../upgrades/effects.js';
import { executeAction } from '../../actions.js';
import { spendMoney } from '../../currency.js';
import { checkDayEnd } from '../../lifecycle.js';
import { recordCostContribution, recordTimeContribution } from '../../metrics.js';
import { spendTime } from '../../time.js';
import { awardSkillProgress } from '../../skills/index.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { instanceLabel } from '../details.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import {
  calculateEligibleQualityLevel,
  ensureInstanceQuality,
  getHighestQualityLevel,
  getQualityConfig,
  getQualityLevel
} from './levels.js';
import { getUsageStatus, trackUsage } from './usage.js';

function createActionContext(definition, instance, state = getState()) {
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

function getQualityActionAvailabilityInternal(definition, instance, action, state = getState()) {
  const context = createActionContext(definition, instance, state);
  const availability = evaluateActionAvailability(action, context);
  return { ...availability };
}

function getActionLabel(definition, assetState, instance) {
  const index = assetState.instances.indexOf(instance);
  return instanceLabel(definition, index, { instance });
}

function resolveProgressAmount(action, context) {
  if (typeof action.progressAmount === 'function') {
    return Number(action.progressAmount(context)) || 0;
  }
  if (Number.isFinite(Number(action.progressAmount))) {
    return Number(action.progressAmount);
  }
  return action.progressKey ? 1 : 0;
}

function updateQualityLevel(definition, assetState, instance, quality) {
  const previous = quality.level || 0;
  const progress = quality.progress || {};
  const eligible = calculateEligibleQualityLevel(definition, progress);
  if (eligible === previous) return;

  const highest = getHighestQualityLevel(definition);
  quality.level = Math.min(eligible, highest?.level ?? eligible);
  const label = getActionLabel(definition, assetState, instance);
  const levelDef = getQualityLevel(definition, quality.level);
  const config = getQualityConfig(definition);
  if (typeof config?.messages?.levelUp === 'function') {
    const message = config.messages.levelUp({
      level: quality.level,
      levelDef,
      label,
      definition,
      instance,
      progress
    });
    if (message) {
      addLog(message, 'passive');
    }
  } else {
    const title = levelDef?.name ? ` (${levelDef.name})` : '';
    addLog(`${label} advanced to Quality ${quality.level}${title}.`, 'passive');
  }
}

export function runQualityAction(definition, instanceId, actionId) {
  const state = getState();
  if (!state) return { qualityUpdated: false };
  const assetState = getAssetState(definition.id);
  if (!assetState) {
    return { qualityUpdated: false };
  }
  const instance = assetState.instances.find(item => item.id === instanceId);
  if (!instance) return { qualityUpdated: false };
  const instanceIndex = assetState.instances.indexOf(instance);
  if (instance.status !== 'active') {
    const label = getActionLabel(definition, assetState, instance);
    addLog(`${label} needs to finish setup before quality work will stick.`, 'warning');
    return { qualityUpdated: false };
  }
  const config = getQualityConfig(definition);
  const action = config?.actions?.find(entry => entry.id === actionId);
  if (!action) return { qualityUpdated: false };

  const context = createActionContext(definition, instance, state);
  const availability = evaluateActionAvailability(action, context);
  if (!availability.unlocked) {
    const label = getActionLabel(definition, assetState, instance);
    const message = availability.reason
      ? `${label} can’t run that move yet: ${availability.reason}`
      : `${label} can’t run that move yet.`;
    addLog(message, 'info');
    return { qualityUpdated: false };
  }

  const usage = getUsageStatus(instance, action);
  if (usage.exhausted) {
    const label = getActionLabel(definition, assetState, instance);
    addLog(`${label} already used that move today. Fresh inspiration returns tomorrow.`, 'info');
    return { qualityUpdated: false };
  }

  const timeCost = Math.max(0, Number(action.time) || 0);
  const moneyCost = Math.max(0, Number(action.cost) || 0);
  if (timeCost > 0 && state.timeLeft < timeCost) {
    addLog(`You need ${formatHours(timeCost)} free before diving into that quality push.`, 'warning');
    return { qualityUpdated: false };
  }
  if (moneyCost > 0 && state.money < moneyCost) {
    addLog(`You need $${formatMoney(moneyCost)} ready for that quality push.`, 'warning');
    return { qualityUpdated: false };
  }

  if (moneyCost > 0) {
    spendMoney(moneyCost);
    recordCostContribution({
      key: `asset:${definition.id}:quality:${action.id}:cost`,
      label: `✨ ${definition.singular || definition.name} quality`,
      amount: moneyCost,
      category: 'quality'
    });
  }
  if (timeCost > 0) {
    spendTime(timeCost);
    recordTimeContribution({
      key: `asset:${definition.id}:quality:${action.id}:time`,
      label: `✨ ${definition.singular || definition.name} quality`,
      hours: timeCost,
      category: 'quality'
    });
  }

  const quality = context.quality;
  const progressKey = action.progressKey;
  if (progressKey) {
    const amount = resolveProgressAmount(action, context);
    if (amount !== 0) {
      const effect = getAssetEffectMultiplier(definition, 'quality_progress_mult', {
        actionType: 'quality'
      });
      const multiplier = Number.isFinite(effect.multiplier) ? effect.multiplier : 1;
      const adjusted = amount * multiplier;
      const current = Number(quality.progress[progressKey]) || 0;
      quality.progress[progressKey] = Math.max(0, current + adjusted);
    }
  }

  awardSkillProgress({
    skills: action.skills,
    timeSpentHours: timeCost,
    moneySpent: moneyCost,
    label: `${definition.singular || definition.name} quality work`
  });

  trackUsage(instance, action);

  triggerQualityActionEvents({
    definition,
    assetState,
    instance,
    instanceIndex,
    action,
    context: { quality }
  });

  if (typeof action.onComplete === 'function') {
    action.onComplete({
      state,
      definition,
      assetState,
      instance,
      instanceIndex,
      quality,
      action
    });
  }

  const label = getActionLabel(definition, assetState, instance);
  if (typeof action.log === 'function') {
    const message = action.log({
      label,
      definition,
      instance,
      quality,
      timeCost,
      moneyCost
    });
    if (message) {
      addLog(message, 'quality');
    }
  } else {
    const parts = [];
    if (timeCost > 0) parts.push(`${formatHours(timeCost)} invested`);
    if (moneyCost > 0) parts.push(`$${formatMoney(moneyCost)} spent`);
    const summary = parts.length ? ` (${parts.join(', ')})` : '';
    addLog(`${label} received focused quality work${summary}.`, 'quality');
  }

  updateQualityLevel(definition, assetState, instance, quality);
  if (!instance.quality) {
    instance.quality = { level: quality.level, progress: { ...quality.progress } };
  } else {
    instance.quality.level = quality.level;
    instance.quality.progress = { ...quality.progress };
  }
  if (Array.isArray(assetState.instances) && instanceIndex >= 0 && assetState.instances[instanceIndex]) {
    assetState.instances[instanceIndex] = {
      ...assetState.instances[instanceIndex],
      quality: { level: quality.level, progress: { ...quality.progress } }
    };
  }
  const rootState = getState();
  const storedAssetState = rootState?.assets?.[definition.id];
  if (
    storedAssetState &&
    Array.isArray(storedAssetState.instances) &&
    instanceIndex >= 0 &&
    storedAssetState.instances[instanceIndex]
  ) {
    storedAssetState.instances[instanceIndex] = {
      ...storedAssetState.instances[instanceIndex],
      quality: { level: quality.level, progress: { ...quality.progress } }
    };
  }
  return { qualityUpdated: true };
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
  const availability = getQualityActionAvailabilityInternal(definition, instance, action, state);
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
  return getQualityActionAvailabilityInternal(definition, instance, action, state);
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

export default {
  canPerformQualityAction,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityTracks,
  performQualityAction,
  runQualityAction
};
