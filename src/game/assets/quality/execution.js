import { formatHours, formatMoney } from '../../../core/helpers.js';
import { addLog } from '../../../core/log.js';
import { getAssetState, getState } from '../../../core/state.js';
import { getAssetEffectMultiplier } from '../../upgrades/effects.js';
import { applyModifiers } from '../../data/economyMath.js';
import { spendMoney } from '../../currency.js';
import { spendTime } from '../../time.js';
import { recordCostContribution, recordTimeContribution } from '../../metrics.js';
import { awardSkillProgress } from '../../skills/index.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import {
  calculateEligibleQualityLevel,
  getHighestQualityLevel,
  getQualityConfig,
  getQualityLevel
} from './levels.js';
import { getUsageStatus, trackUsage } from './usage.js';
import { createActionContext, evaluateActionAvailability } from './availability.js';
import { instanceLabel } from '../details.js';

function getActionLabel(definition, assetState, instance) {
  const index = assetState.instances.indexOf(instance);
  return instanceLabel(definition, index, { instance });
}

export function logCompletion({ action, label, definition, instance, quality, timeCost, moneyCost }) {
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
    return;
  }

  const parts = [];
  if (timeCost > 0) parts.push(`${formatHours(timeCost)} invested`);
  if (moneyCost > 0) parts.push(`$${formatMoney(moneyCost)} spent`);
  const summary = parts.length ? ` (${parts.join(', ')})` : '';
  addLog(`${label} received focused quality work${summary}.`, 'quality');
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

function updateQualityLevel(definition, assetState, instance, quality, label) {
  const previous = quality.level || 0;
  const progress = quality.progress || {};
  const eligible = calculateEligibleQualityLevel(definition, progress);
  if (eligible === previous) return;

  const highest = getHighestQualityLevel(definition);
  quality.level = Math.min(eligible, highest?.level ?? eligible);
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

function syncQualityState(definition, assetState, instance, instanceIndex, quality) {
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
}

export function validateReadiness({ definition, instanceId, actionId, state = getState() }) {
  if (!state) {
    return { ok: false };
  }

  const assetState = getAssetState(definition.id);
  if (!assetState) {
    return { ok: false };
  }

  const instance = assetState.instances.find(item => item.id === instanceId);
  if (!instance) {
    return { ok: false };
  }

  const instanceIndex = assetState.instances.indexOf(instance);
  if (instance.status !== 'active') {
    const label = getActionLabel(definition, assetState, instance);
    addLog(`${label} needs to finish setup before quality work will stick.`, 'warning');
    return { ok: false };
  }

  const config = getQualityConfig(definition);
  const action = config?.actions?.find(entry => entry.id === actionId);
  if (!action) {
    return { ok: false };
  }

  const context = createActionContext(definition, instance, state);
  const availability = evaluateActionAvailability(action, context);
  if (!availability.unlocked) {
    const label = getActionLabel(definition, assetState, instance);
    const message = availability.reason
      ? `${label} can’t run that move yet: ${availability.reason}`
      : `${label} can’t run that move yet.`;
    addLog(message, 'info');
    return { ok: false };
  }

  const usage = getUsageStatus(instance, action);
  if (usage.exhausted) {
    const label = getActionLabel(definition, assetState, instance);
    addLog(`${label} already used that move today. Fresh inspiration returns tomorrow.`, 'info');
    return { ok: false };
  }

  const timeCost = Math.max(0, Number(action.time) || 0);
  const moneyCost = Math.max(0, Number(action.cost) || 0);
  if (timeCost > 0 && state.timeLeft < timeCost) {
    addLog(`You need ${formatHours(timeCost)} free before diving into that quality push.`, 'warning');
    return { ok: false };
  }
  if (moneyCost > 0 && state.money < moneyCost) {
    addLog(`You need $${formatMoney(moneyCost)} ready for that quality push.`, 'warning');
    return { ok: false };
  }

  const label = getActionLabel(definition, assetState, instance);

  return {
    ok: true,
    definition,
    state,
    assetState,
    instance,
    instanceIndex,
    action,
    context,
    label,
    timeCost,
    moneyCost
  };
}

export function applyCosts({ definition, action, timeCost, moneyCost }) {
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
}

export function updateProgressAndLevel({
  definition,
  assetState,
  instance,
  instanceIndex,
  action,
  context,
  label,
  timeCost,
  moneyCost,
  log = logCompletion
}) {
  const quality = context.quality;
  quality.progress = quality.progress || {};

  if (action.progressKey) {
    const amount = resolveProgressAmount(action, context);
    if (amount !== 0) {
      const effect = getAssetEffectMultiplier(definition, 'quality_progress_mult', {
        actionType: 'quality'
      });
      let adjusted = amount;
      if (Array.isArray(effect?.modifiers) && effect.modifiers.length) {
        const result = applyModifiers(amount, effect.modifiers, { clamp: effect.clamp });
        if (Number.isFinite(result?.value)) {
          adjusted = result.value;
        } else if (Number.isFinite(effect?.multiplier)) {
          adjusted = amount * effect.multiplier;
        }
      } else if (Number.isFinite(effect?.multiplier)) {
        adjusted = amount * effect.multiplier;
      }
      const current = Number(quality.progress[action.progressKey]) || 0;
      quality.progress[action.progressKey] = Math.max(0, current + adjusted);
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
      state: context.state,
      definition,
      assetState,
      instance,
      instanceIndex,
      quality,
      action
    });
  }

  if (typeof log === 'function') {
    log({ action, label, definition, instance, quality, timeCost, moneyCost });
  }

  updateQualityLevel(definition, assetState, instance, quality, label);
  syncQualityState(definition, assetState, instance, instanceIndex, quality);

  return { qualityUpdated: true, quality };
}

export default {
  applyCosts,
  logCompletion,
  updateProgressAndLevel,
  validateReadiness
};
