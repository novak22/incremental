import { ensureArray, formatMoney, toNumber } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState, getUpgradeState } from '../../core/state.js';
import { getAssetDefinition, getUpgradeDefinition } from '../../core/state/registry.js';
import { executeAction } from '../actions.js';
import { spendMoney } from '../currency.js';
import { checkDayEnd } from '../lifecycle.js';
import { recordCostContribution } from '../metrics.js';
import { renderAssetRequirementDetail, updateAssetCardLock } from '../requirements.js';
import { awardSkillProgress } from '../skills/index.js';
import { buildAssetAction } from '../assets/actions.js';
import { maintenanceDetail } from '../assets/maintenance.js';
import {
  incomeDetail,
  latestYieldDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
  setupCostDetail,
  setupDetail
} from '../assets/details.js';
import {
  buildSlotLedger,
  describeSlotLedger,
  getExclusiveConflict,
  wouldExceedSlotCapacity
} from '../upgrades/effects.js';
import { resolveDetailEntry } from '../upgrades/detailResolvers.js';
import { resolveRequirement as resolveUpgradeRequirement } from '../upgrades/requirementResolvers.js';
import { applyMetric, buildMetricConfig, normalizeSlotMap } from './schema/metrics.js';
import {
  describeEffectSummary,
  formatKeyLabel,
  formatSlotLabel,
  formatSlotMap,
  logUpgradeBlocked
} from './schema/logMessaging.js';
import { markDirty } from '../../core/events/invalidationBus.js';

export { createInstantHustle } from './schema/assetActions.js';

export function createAssetDefinition(config) {
  const definition = {
    ...config,
    type: 'asset',
    defaultState: config.defaultState || { instances: [] }
  };

  const detailKeys = config.detailKeys || [
    'owned',
    'setup',
    'setupCost',
    'maintenance',
    'requirements',
    'qualitySummary',
    'qualityProgress',
    'income',
    'latestYield'
  ];

  const builders = {
    owned: () => ownedDetail(definition),
    setup: () => setupDetail(definition),
    setupCost: () => setupCostDetail(definition),
    maintenance: () => maintenanceDetail(definition),
    requirements: () => renderAssetRequirementDetail(definition.id),
    qualitySummary: () => qualitySummaryDetail(definition),
    qualityProgress: () => qualityProgressDetail(definition),
    income: () => incomeDetail(definition),
    latestYield: () => latestYieldDetail(definition)
  };

  const baseDetailEntries = detailKeys.map((detail, index) => {
    if (typeof detail === 'function') {
      return { key: typeof detail.key === 'string' ? detail.key : `custom-${index}`, render: () => detail(definition) };
    }
    if (typeof detail === 'string' && builders[detail]) {
      return { key: detail, render: () => builders[detail]() };
    }
    return { key: typeof detail === 'string' ? detail : `custom-${index}`, render: () => detail };
  });

  const extraDetailEntries = (config.details || []).map((detail, index) => {
    const key = typeof detail === 'object' && detail?.key
      ? String(detail.key)
      : `extra-${index}`;
    if (typeof detail === 'function') {
      return { key, render: () => detail(definition) };
    }
    return { key, render: () => detail };
  });

  definition.detailEntries = [...baseDetailEntries, ...extraDetailEntries];
  definition.details = definition.detailEntries.map(entry => entry.render);

  definition.action = buildAssetAction(definition, config.actionLabels);

  if (config.lockCard !== false) {
    definition.cardState = (_state, card) => updateAssetCardLock(definition.id, card);
  }

  return definition;
}



function normalizeUpgradeRequirements(config = []) {
  return config.map(req => {
    if (typeof req === 'string') {
      return { type: 'upgrade', id: req };
    }
    return req;
  });
}

function upgradeRequirementMet(requirement) {
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const state = getAssetState(requirement.id);
      const instances = state?.instances || [];
      if (requirement.active) {
        return instances.filter(instance => instance.status === 'active').length >= toNumber(requirement.count, 1);
      }
      return instances.length >= toNumber(requirement.count, 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

function renderUpgradeRequirement(requirement) {
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const definition = getUpgradeDefinition(requirement.id);
      const label = definition?.name || requirement.id;
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || requirement.id;
      const count = toNumber(requirement.count, 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

export function createUpgrade(config, hooks = {}) {
  const rawRequirements = [...ensureArray(config.requires), ...ensureArray(config.prerequisites)];
  const requirements = normalizeUpgradeRequirements(rawRequirements).map(requirement => {
    const resolved = resolveUpgradeRequirement(requirement);
    if (typeof hooks.transformRequirement === 'function') {
      return hooks.transformRequirement(resolved, config) || resolved;
    }
    return resolved;
  });
  const provides = normalizeSlotMap(config.provides);
  const consumes = normalizeSlotMap(config.consumes);
  const effects = { ...(config.effects || {}) };
  const affects = {
    assets: config.affects?.assets ? { ...config.affects.assets } : {},
    hustles: config.affects?.hustles ? { ...config.affects.hustles } : {},
    actions: config.affects?.actions ? { ...config.affects.actions } : {}
  };
  const synergies = Array.isArray(config.synergies) ? config.synergies.slice() : [];
  const baseState = {
    ...(config.defaultState ? { ...config.defaultState } : { purchased: false })
  };
  if (!Object.prototype.hasOwnProperty.call(baseState, 'purchasedDay')) {
    baseState.purchasedDay = null;
  }

  const definition = {
    ...config,
    type: 'upgrade',
    category: config.category || null,
    family: config.family || null,
    exclusivityGroup: config.exclusivityGroup || null,
    provides,
    consumes,
    effects,
    affects,
    synergies,
    defaultState: baseState
  };
  definition.requirements = requirements;

  const details = [];
  if (config.cost) {
    details.push(() => `💵 Cost: <strong>$${formatMoney(config.cost)}</strong>`);
  }
  requirements.forEach(requirement => {
    details.push(() => renderUpgradeRequirement(requirement));
  });
  if (config.unlocks) {
    details.push(() => `Unlocks: <strong>${config.unlocks}</strong>`);
  }
  if (config.boosts) {
    details.push(() => `Boosts: <strong>${config.boosts}</strong>`);
  }
  if (provides) {
    details.push(() => `🧰 Provides: <strong>${formatSlotMap(provides)}</strong>`);
  }
  if (consumes) {
    details.push(() => {
      const ledger = buildSlotLedger({ exclude: [definition.id] });
      const pieces = Object.entries(consumes).map(([slot, amount]) => {
        const summary = describeSlotLedger(slot, ledger);
        const available = summary ? Math.max(0, summary.available) : 0;
        return `${formatSlotLabel(slot, amount)} (available ${available})`;
      });
      return `🎯 Requires: <strong>${pieces.join(', ')}</strong>`;
    });
  }
  const effectSummary = describeEffectSummary(effects, affects);
  if (effectSummary) {
    details.push(() => `⚙️ Effects: <strong>${effectSummary}</strong>`);
  }
  if (definition.exclusivityGroup) {
    details.push(() => `🔒 Exclusive lane: <strong>${formatKeyLabel(definition.exclusivityGroup)}</strong>`);
  }
  const configDetails = ensureArray(config.details)
    .map(entry => resolveDetailEntry(entry))
    .filter(Boolean);
  const hookDetails = ensureArray(hooks.details)
    .map(entry => resolveDetailEntry(entry))
    .filter(Boolean);
  definition.details = [...details, ...configDetails, ...hookDetails];

  const costMetric = buildMetricConfig(config.id, 'upgrade', config.metrics?.cost, {
    key: `upgrade:${config.id}`,
    label: config.metrics?.cost?.label || `${config.name} purchase`,
    category: config.metrics?.cost?.category || 'upgrade',
    type: 'cost'
  });

  const getContext = () => {
    const state = getState();
    const upgradeState = getUpgradeState(config.id);
    const missing = requirements.filter(req => !upgradeRequirementMet(req));
    const conflict = getExclusiveConflict(definition, { state });
    const slotConflict = wouldExceedSlotCapacity(definition, { state });
    return {
      definition,
      state,
      upgradeState,
      requirements,
      missing,
      conflict,
      slotConflict
    };
  };

  const actionConfig = {
    className: hooks.actionClassName || config.actionClassName || 'secondary',
    label: hooks.actionLabel || config.actionLabel,
    labels: { ...(config.labels || {}), ...(hooks.labels || {}) }
  };

  function computeLabel(context) {
    const fallback = `Purchase ${definition.name}`;
    if (!context.state) {
      if (typeof actionConfig.label === 'function') {
        return actionConfig.label(context) || fallback;
      }
      return actionConfig.label || fallback;
    }
    if (!config.repeatable && context.upgradeState?.purchased) {
      const purchasedLabel = actionConfig.labels.purchased;
      if (typeof purchasedLabel === 'function') {
        return purchasedLabel(context) || `${definition.name} Ready`;
      }
      return purchasedLabel || `${definition.name} Ready`;
    }
    if (context.missing.length) {
      const missingLabel = actionConfig.labels.missing;
      if (typeof missingLabel === 'function') {
        return missingLabel(context) || 'Requires Prerequisite';
      }
      return missingLabel || 'Requires Prerequisite';
    }
    if (!context.upgradeState?.purchased && context.conflict) {
      const conflictLabel = actionConfig.labels.conflict;
      if (typeof conflictLabel === 'function') {
        return conflictLabel(context) || `${context.conflict.name || 'Upgrade'} Active`;
      }
      return conflictLabel || `${context.conflict.name || 'Upgrade'} Active`;
    }
    if (!context.upgradeState?.purchased && context.slotConflict) {
      const slotLabel = actionConfig.labels.slots;
      if (typeof slotLabel === 'function') {
        return slotLabel(context) || 'No Slots Available';
      }
      return slotLabel || 'No Slots Available';
    }
    if (typeof actionConfig.label === 'function') {
      return actionConfig.label(context) || fallback;
    }
    return actionConfig.label || fallback;
  }

  function isDisabled(context) {
    if (!context.state) return true;
    if (!config.repeatable && context.upgradeState?.purchased) return true;
    if (context.missing.length) return true;
    if (!context.upgradeState?.purchased && context.conflict) return true;
    if (context.slotConflict) return true;
    if (config.cost && context.state.money < config.cost) return true;
    if (typeof hooks.disabled === 'function' && hooks.disabled(context)) return true;
    if (typeof config.disabled === 'function' && config.disabled(context)) return true;
    return false;
  }

  definition.action = {
    label: () => {
      const context = getContext();
      return computeLabel(context);
    },
    className: actionConfig.className,
    disabled: () => {
      const context = getContext();
      return isDisabled(context);
    },
    onClick: () => {
      executeAction(() => {
        const context = getContext();
        if (!context.state) return;
        if (isDisabled(context)) {
          logUpgradeBlocked({ context, config, consumes });
          return;
        }
        if (config.cost) {
          spendMoney(config.cost);
          applyMetric(recordCostContribution, costMetric, { amount: config.cost });
        }
        if (!config.repeatable) {
          context.upgradeState.purchased = true;
        }
        context.upgradeState.purchasedDay = context.state?.day ?? null;
        const skillLabel = typeof definition.name === 'string' ? definition.name : config.id;
        const skillXp = awardSkillProgress({
          skills: config.skills,
          moneySpent: config.cost,
          label: skillLabel,
          state: context.state
        });
        context.skillXpAwarded = skillXp;
        hooks.onPurchase?.(context);
        config.onPurchase?.(context);
        if (config.logMessage) {
          addLog(
            typeof config.logMessage === 'function' ? config.logMessage(context) : config.logMessage,
            config.logType || 'upgrade'
          );
        }
        markDirty('cards');
      });
      checkDayEnd();
    }
  };

  const cardStateFn = typeof hooks.cardState === 'function' ? hooks.cardState : config.cardState;
  if (cardStateFn || config.lockCard !== false) {
    definition.cardState = (state, card) => {
      if (typeof cardStateFn === 'function') {
        cardStateFn(state, card, {
          requirements,
          definition
        });
        return;
      }
      if (!card) return;
      const context = getContext();
      card.classList.toggle('locked', !config.repeatable && Boolean(context.upgradeState?.purchased));
      card.classList.toggle('requires-upgrade', context.missing.length > 0);
    };
  }

  const extraContentFn = typeof hooks.extraContent === 'function' ? hooks.extraContent : config.extraContent;
  if (typeof extraContentFn === 'function') {
    definition.extraContent = (card, ...args) => extraContentFn(card, ...args);
  }
  const updateFn = typeof hooks.update === 'function' ? hooks.update : config.update;
  if (typeof updateFn === 'function') {
    definition.update = updateFn;
  }
  if (config.process) {
    definition.process = config.process;
  }

  return definition;
}
