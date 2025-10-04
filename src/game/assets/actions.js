import { formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import { createAssetInstance } from '../../core/state/assets.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { addMoney, spendMoney } from '../currency.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { spendTime } from '../time.js';
import { assetRequirementsMetById } from '../requirements.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from '../metrics.js';
import { awardSkillProgress } from '../skills/index.js';
import { getAssetEffectMultiplier } from '../upgrades/effects.js';
import { instanceLabel } from './details.js';
import { getAssetMetricId } from './helpers.js';
import { markDirty } from '../../ui/invalidation.js';

const ASSET_CORE_UI_SECTIONS = ['dashboard', 'headerAction', 'cards', 'player'];

function getEffectiveSetupHours(definition) {
  const base = Number(definition.setup?.hoursPerDay) || 0;
  if (base <= 0) return base;
  const effect = getAssetEffectMultiplier(definition, 'setup_time_mult', { actionType: 'setup' });
  return base * (Number.isFinite(effect.multiplier) ? effect.multiplier : 1);
}

function assetActionLabel(definition, labels) {
  const assetState = getAssetState(definition.id);
  const first = labels.first || `Launch ${definition.singular || definition.name}`;
  const repeat = labels.repeat || `Add Another ${definition.singular || definition.name}`;
  return assetState.instances.length ? repeat : first;
}

function isAssetPurchaseDisabled(definition) {
  if (!assetRequirementsMetById(definition.id)) return true;
  const state = getState();
  const setupHours = getEffectiveSetupHours(definition);
  const setupCost = Number(definition.setup?.cost) || 0;
  if (setupHours > 0 && state.timeLeft < setupHours) return true;
  if (setupCost > 0 && state.money < setupCost) return true;
  return false;
}

function startAsset(definition) {
  executeAction(() => {
    if (!assetRequirementsMetById(definition.id)) {
      addLog(
        `You still need to meet the requirements before starting ${definition.singular || definition.name}.`,
        'info'
      );
      return;
    }

    const state = getState();
    const setupHours = getEffectiveSetupHours(definition);
    const setupCost = Number(definition.setup?.cost) || 0;
    if (setupHours > 0 && state.timeLeft < setupHours) {
      addLog('You ran out of hours today. Tackle setup tomorrow after resting.', 'warning');
      return;
    }
    if (setupCost > 0 && state.money < setupCost) {
      addLog('You need more cash before covering that setup cost.', 'warning');
      return;
    }

    if (setupCost > 0) {
      spendMoney(setupCost);
      recordCostContribution({
        key: getAssetMetricId(definition, 'setup', 'cost'),
        label: `💵 ${definition.singular || definition.name} setup`,
        amount: setupCost,
        category: 'setup'
      });
    }
    if (setupHours > 0) {
      spendTime(setupHours);
      recordTimeContribution({
        key: getAssetMetricId(definition, 'setup', 'time'),
        label: `🚀 ${definition.singular || definition.name} prep`,
        hours: setupHours,
        category: 'setup'
      });
    }

    const skillXpAwarded = awardSkillProgress({
      skills: definition.skills?.setup,
      timeSpentHours: setupHours,
      moneySpent: setupCost,
      label: definition.name
    });

    if (skillXpAwarded > 0) {
      markDirty(['player', 'skillsWidget']);
    }

    const assetState = getAssetState(definition.id);
    const instance = createAssetInstance(definition, {
      setupFundedToday: setupHours > 0
    });
    assetState.instances.push(instance);

    markDirty(ASSET_CORE_UI_SECTIONS);

    const label = instanceLabel(definition, assetState.instances.length - 1);
    const message = definition.messages?.setupStarted
      ? definition.messages.setupStarted(label, assetState, instance)
      : `You kicked off ${label}. Keep investing time until it launches.`;
    addLog(message, 'passive');
  });
  checkDayEnd();
}

export function buildAssetAction(definition, labels = {}) {
  return {
    id: 'launch',
    label: () => assetActionLabel(definition, labels),
    className: 'primary',
    disabled: () => isAssetPurchaseDisabled(definition),
    onClick: () => startAsset(definition)
  };
}

export function calculateAssetSalePrice(instance) {
  const lastIncome = Math.max(0, Number(instance?.lastIncome) || 0);
  const basePrice = Math.max(0, Math.round(lastIncome) * 3);
  const qualityLevel = Number(instance?.quality?.level);
  const qualityMultiplier = Number.isFinite(qualityLevel) ? Math.max(1, Math.floor(qualityLevel) + 1) : 1;
  return Math.max(0, Math.round(basePrice * qualityMultiplier));
}

export function sellAssetInstance(definition, instanceId) {
  if (!definition || !instanceId) return false;

  let sold = false;

  executeAction(() => {
    const assetState = getAssetState(definition.id);
    const instances = assetState.instances || [];
    const index = instances.findIndex(instance => instance.id === instanceId);
    if (index === -1) return false;

    const instance = instances[index];
    const price = calculateAssetSalePrice(instance);
    const label = instanceLabel(definition, index);

    if (price > 0) {
      addMoney(price, `${label} sold off for $${formatMoney(price)}. Fresh funds unlocked!`, 'passive');
      recordPayoutContribution({
        key: getAssetMetricId(definition, 'sale', 'payout'),
        label: `🏷️ ${definition.singular || definition.name} sale`,
        amount: price,
        category: 'sale'
      });
    } else {
      addLog(`${label} was scrapped for parts—no earnings yet, so no cash back.`, 'info');
    }

    instances.splice(index, 1);
    markDirty(ASSET_CORE_UI_SECTIONS);
    sold = true;
  });

  return sold;
}

export function setAssetInstanceName(assetId, instanceId, name) {
  if (!assetId || !instanceId) return false;
  const definition = getAssetDefinition(assetId);
  if (!definition) return false;

  const trimmed = typeof name === 'string' ? name.trim() : '';
  const safe = trimmed ? trimmed.slice(0, 60) : '';
  let changed = false;

  executeAction(() => {
    const state = getState();
    const assetState = getAssetState(assetId, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const index = instances.findIndex(entry => entry?.id === instanceId);
    if (index === -1) return;

    const instance = instances[index];
    const previous = typeof instance.customName === 'string' ? instance.customName : '';
    if (!safe && !previous) return;
    if (safe === previous) return;

    if (safe) {
      instance.customName = safe;
    } else {
      delete instance.customName;
    }
    changed = true;
    markDirty('cards');

    const labelBase = definition.singular || definition.name || 'Asset';
    const fallbackLabel = `${labelBase} #${index + 1}`;
    const message = safe
      ? `${fallbackLabel} is now titled “${safe}.” Subscribers love the fresh branding.`
      : `${fallbackLabel} reset to its default title.`;
    addLog(message, 'info');
  });

  return changed;
}

