import { formatHours, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState, getUpgradeState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getAssetEffectMultiplier } from '../upgrades/effects.js';
import { executeAction } from '../actions.js';
import { spendMoney } from '../currency.js';
import { checkDayEnd } from '../lifecycle.js';
import { recordCostContribution, recordTimeContribution } from '../metrics.js';
import { spendTime } from '../time.js';
import { awardSkillProgress } from '../skills/index.js';
import { markDirty } from '../../core/events/invalidationBus.js';
import { instanceLabel } from './details.js';
import { triggerQualityActionEvents } from '../events/index.js';

function ensureUsageMap(instance) {
  if (!instance.dailyUsage || typeof instance.dailyUsage !== 'object') {
    instance.dailyUsage = {};
  }
  return instance.dailyUsage;
}

function getDailyLimit(action) {
  const limit = Number(action?.dailyLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(limit));
}

function getUsageCount(instance, actionId) {
  if (!instance?.dailyUsage) return 0;
  const value = Number(instance.dailyUsage[actionId]);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function getUsageStatus(instance, action) {
  const dailyLimit = getDailyLimit(action);
  const usedToday = Math.min(dailyLimit, getUsageCount(instance, action.id));
  const remainingUses = Math.max(0, dailyLimit - usedToday);
  return {
    dailyLimit,
    usedToday,
    remainingUses,
    exhausted: remainingUses <= 0
  };
}

function trackUsage(instance, action) {
  const map = ensureUsageMap(instance);
  const dailyLimit = getDailyLimit(action);
  const current = getUsageCount(instance, action.id);
  map[action.id] = Math.min(dailyLimit, current + 1);
}

const QUALITY_LEVEL_CACHE = new WeakMap();

function ensureInstanceQuality(definition, instance) {
  if (!instance.quality) {
    instance.quality = { level: 0, progress: {} };
  } else {
    if (!Number.isFinite(Number(instance.quality.level))) {
      instance.quality.level = 0;
    } else {
      instance.quality.level = Math.max(0, Math.floor(Number(instance.quality.level)));
    }
    if (!instance.quality.progress || typeof instance.quality.progress !== 'object') {
      instance.quality.progress = {};
    }
  }
  return instance.quality;
}

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

function evaluateActionAvailability(action, context) {
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

function getQualityConfig(definition) {
  return definition?.quality || null;
}

function getSortedLevels(definition) {
  if (!definition) return [];
  if (!QUALITY_LEVEL_CACHE.has(definition)) {
    const config = getQualityConfig(definition);
    if (!config?.levels?.length) {
      QUALITY_LEVEL_CACHE.set(definition, []);
    } else {
      const sorted = [...config.levels].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      QUALITY_LEVEL_CACHE.set(definition, sorted);
    }
  }
  return QUALITY_LEVEL_CACHE.get(definition);
}

export function getQualityLevel(definition, level) {
  const levels = getSortedLevels(definition);
  return levels.find(entry => entry.level === level) || null;
}

export function getNextQualityLevel(definition, level) {
  const levels = getSortedLevels(definition);
  return levels.find(entry => entry.level === level + 1) || null;
}

function getHighestQualityLevel(definition) {
  const levels = getSortedLevels(definition);
  if (!levels.length) return null;
  return levels.at(-1);
}

function meetsRequirements(progress, requirements = {}) {
  if (!requirements || !Object.keys(requirements).length) {
    return true;
  }
  for (const [key, value] of Object.entries(requirements)) {
    const target = Number(value) || 0;
    if (target <= 0) continue;
    const current = Number(progress?.[key]) || 0;
    if (current < target) {
      return false;
    }
  }
  return true;
}

function calculateEligibleQualityLevel(definition, progress = {}) {
  const levels = getSortedLevels(definition);
  if (!levels.length) return 0;
  let eligible = 0;
  for (const level of levels) {
    if (meetsRequirements(progress, level.requirements)) {
      eligible = level.level;
    } else {
      break;
    }
  }
  return eligible;
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

function getActionLabel(definition, assetState, instance) {
  const index = assetState.instances.indexOf(instance);
  return instanceLabel(definition, index, { instance });
}

function runQualityAction(definition, instanceId, actionId) {
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

export function getOverallQualityRange(definition) {
  const levels = getSortedLevels(definition);
  if (!levels.length) {
    const income = definition?.income || {};
    const base = Math.max(0, Number(income.base) || 0);
    const variance = Math.max(0, Number(income.variance) || 0);
    const min = income.floor ?? Math.round(base * (1 - variance));
    const max = income.ceiling ?? Math.round(base * (1 + variance));
    return {
      min: Math.max(0, min),
      max: Math.max(Math.max(0, min), max)
    };
  }
  const min = levels.reduce((value, level) => Math.min(value, Number(level.income?.min) || 0), Infinity);
  const max = levels.reduce((value, level) => Math.max(value, Number(level.income?.max) || 0), 0);
  return {
    min: Number.isFinite(min) ? Math.max(0, min) : 0,
    max: Math.max(0, max)
  };
}

export function getInstanceQualityRange(definition, instance) {
  const quality = ensureInstanceQuality(definition, instance);
  const levelDef = getQualityLevel(definition, quality.level);
  if (levelDef?.income) {
    return {
      min: Math.max(0, Number(levelDef.income.min) || 0),
      max: Math.max(0, Number(levelDef.income.max) || 0)
    };
  }
  const overall = getOverallQualityRange(definition);
  return overall;
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

export function getQualityLevelSummary(definition) {
  const levels = getSortedLevels(definition);
  return levels.map(level => ({
    level: level.level,
    name: level.name,
    description: level.description,
    income: level.income,
    requirements: level.requirements
  }));
}
