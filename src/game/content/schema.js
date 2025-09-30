import { ensureArray, formatHours, formatMoney, toNumber } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import {
  countActiveAssetInstances,
  getAssetState,
  getHustleState,
  getState,
  getUpgradeState
} from '../../core/state.js';
import { getAssetDefinition, getUpgradeDefinition } from '../../core/state/registry.js';
import { executeAction } from '../actions.js';
import { addMoney, spendMoney } from '../currency.js';
import { checkDayEnd } from '../lifecycle.js';
import { recordCostContribution, recordPayoutContribution, recordTimeContribution } from '../metrics.js';
import {
  renderAssetRequirementDetail,
  summarizeAssetRequirements,
  updateAssetCardLock
} from '../requirements.js';
import { spendTime } from '../time.js';
import { awardSkillProgress } from '../skills/index.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
  setupCostDetail,
  setupDetail
} from '../assets/helpers.js';
import {
  applyInstantHustleEducationBonus,
  describeInstantHustleEducationBonuses,
  formatEducationBonusSummary
} from '../educationEffects.js';
import {
  buildSlotLedger,
  describeSlotLedger,
  getAssetEffectMultiplier,
  getExclusiveConflict,
  getHustleEffectMultiplier,
  wouldExceedSlotCapacity
} from '../upgrades/effects.js';

function formatHourDetail(hours, effective) {
  if (!hours) return '⏳ Time: <strong>Instant</strong>';
  const base = formatHours(hours);
  if (Number.isFinite(Number(effective)) && Math.abs(effective - hours) > 0.01) {
    return `⏳ Time: <strong>${formatHours(effective)}</strong> (base ${base})`;
  }
  return `⏳ Time: <strong>${base}</strong>`;
}

function formatCostDetail(cost) {
  if (!cost) return null;
  return `💵 Cost: <strong>$${formatMoney(cost)}</strong>`;
}

function formatPayoutDetail(payout) {
  if (!payout || !payout.amount) return null;
  const base = `💰 Payout: <strong>$${formatMoney(payout.amount)}</strong>`;
  if (payout.delaySeconds) {
    return `${base} after ${payout.delaySeconds}s`;
  }
  return base;
}

function meetsAssetRequirements(requirements = [], state = getState()) {
  if (!requirements?.length) return true;
  return requirements.every(req => countActiveAssetInstances(req.assetId, state) >= toNumber(req.count, 1));
}

function buildMetricConfig(id, prefix, overrides = {}, defaults = {}) {
  if (overrides === false) return null;
  const key = overrides.key || defaults.key || `${prefix}:${id}:${defaults.type || prefix}`;
  const label = overrides.label || defaults.label;
  const category = overrides.category || defaults.category;
  return { key, label, category };
}

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

function normalizeHustleMetrics(id, metrics = {}) {
  return {
    time: buildMetricConfig(id, 'hustle', metrics.time, {
      key: `hustle:${id}:time`,
      label: metrics.time?.label || 'Hustle time investment',
      category: metrics.time?.category || 'hustle'
    }),
    cost: buildMetricConfig(id, 'hustle', metrics.cost, {
      key: `hustle:${id}:cost`,
      label: metrics.cost?.label || 'Hustle spending',
      category: metrics.cost?.category || 'hustle'
    }),
    payout: buildMetricConfig(id, 'hustle', metrics.payout, {
      key: `hustle:${id}:payout`,
      label: metrics.payout?.label || 'Hustle payout',
      category: metrics.payout?.category || 'hustle'
    })
  };
}

function applyMetric(recordFn, metric, payload) {
  if (!metric) return;
  recordFn({ ...metric, ...payload });
}

export function createInstantHustle(config) {
  const metadata = {
    id: config.id,
    time: toNumber(config.time, 0),
    cost: toNumber(config.cost, 0),
    requirements: config.requirements || [],
    payout: config.payout
      ? {
          amount: toNumber(config.payout.amount, 0),
          delaySeconds: toNumber(config.payout.delaySeconds, 0) || undefined,
          grantOnAction: config.payout.grantOnAction !== false,
          logType: config.payout.logType || 'hustle',
          message: config.payout.message
        }
      : null,
    metrics: normalizeHustleMetrics(config.id, config.metrics || {}),
    skills: config.skills,
    dailyLimit: Number.isFinite(Number(config.dailyLimit)) && Number(config.dailyLimit) > 0
      ? Math.max(1, Math.floor(Number(config.dailyLimit)))
      : null
  };

  function resolveDailyUsage(state = getState(), { sync = false } = {}) {
    const hustleState = getHustleState(metadata.id, state);
    const currentDay = Number(state?.day) || 1;

    if (!metadata.dailyLimit) {
      return {
        hustleState,
        currentDay,
        limit: null,
        used: Number(hustleState.runsToday) || 0,
        remaining: null
      };
    }

    const lastRunDay = Number(hustleState.lastRunDay) || 0;
    const usedToday = lastRunDay === currentDay ? Number(hustleState.runsToday) || 0 : 0;

    if (sync && lastRunDay !== currentDay) {
      hustleState.lastRunDay = currentDay;
      hustleState.runsToday = usedToday;
    }

    return {
      hustleState,
      currentDay,
      limit: metadata.dailyLimit,
      used: usedToday,
      remaining: Math.max(0, metadata.dailyLimit - usedToday)
    };
  }

  function updateDailyUsage(state) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    const nextUsed = Math.min(metadata.dailyLimit, usage.used + 1);
    usage.hustleState.lastRunDay = usage.currentDay;
    usage.hustleState.runsToday = nextUsed;
    const remaining = Math.max(0, metadata.dailyLimit - nextUsed);
    return {
      limit: metadata.dailyLimit,
      used: nextUsed,
      remaining,
      day: usage.currentDay
    };
  }

  const definition = {
    ...config,
    type: 'hustle',
    tag: config.tag || { label: 'Instant', type: 'instant' },
    defaultState: (() => {
      const base = { ...(config.defaultState || {}) };
      if (metadata.dailyLimit) {
        if (typeof base.runsToday !== 'number') base.runsToday = 0;
        if (typeof base.lastRunDay !== 'number') base.lastRunDay = 0;
      }
      return base;
    })(),
    skills: metadata.skills
  };

  definition.tags = Array.isArray(config.tags) ? config.tags.slice() : [];

  function resolveEffectiveTime(state = getState()) {
    if (!metadata.time) return metadata.time;
    const { multiplier } = getHustleEffectMultiplier(definition, 'setup_time_mult', {
      state,
      actionType: 'setup'
    });
    const adjusted = metadata.time * (Number.isFinite(multiplier) ? multiplier : 1);
    return Number.isFinite(adjusted) ? Math.max(0, adjusted) : metadata.time;
  }

  function describeEffectiveTime() {
    return formatHourDetail(metadata.time, resolveEffectiveTime());
  }

  function applyHustlePayoutMultiplier(amount, context) {
    if (!amount) {
      return { amount: 0, multiplier: 1, sources: [] };
    }
    const { multiplier, sources } = getHustleEffectMultiplier(definition, 'payout_mult', {
      state: context.state,
      actionType: 'payout'
    });
    if (!Number.isFinite(multiplier) || multiplier === 1) {
      return { amount, multiplier: 1, sources: [] };
    }
    return { amount: amount * multiplier, multiplier, sources };
  }

  definition.dailyLimit = metadata.dailyLimit;
  definition.getDailyUsage = state => resolveDailyUsage(state, { sync: false });

  const baseDetails = [];
  if (metadata.time > 0) {
    baseDetails.push(() => describeEffectiveTime());
  }
  if (metadata.cost > 0) {
    const detail = formatCostDetail(metadata.cost);
    if (detail) baseDetails.push(() => detail);
  }
  const payoutDetail = formatPayoutDetail(metadata.payout);
  if (payoutDetail) {
    baseDetails.push(() => payoutDetail);
  }
  if (metadata.requirements.length) {
    baseDetails.push(() => `Requires: <strong>${summarizeAssetRequirements(metadata.requirements)}</strong>`);
  }

  if (metadata.dailyLimit) {
    baseDetails.push(() => {
      const usage = resolveDailyUsage(getState(), { sync: false });
      const remaining = usage?.remaining ?? metadata.dailyLimit;
      const limit = usage?.limit ?? metadata.dailyLimit;
      const status = remaining > 0
        ? `${remaining}/${limit} runs left today`
        : 'Daily limit reached today';
      return `🗓️ Daily limit: <strong>${limit} per day</strong> (${status})`;
    });
  }

  const educationDetails = describeInstantHustleEducationBonuses(config.id);

  definition.details = [...baseDetails, ...educationDetails, ...(config.details || [])];

  const actionClassName = config.actionClassName || 'primary';

  function getDisabledReason(state) {
    if (metadata.dailyLimit) {
      const usage = resolveDailyUsage(state, { sync: true });
      if (usage.remaining <= 0) {
        const runsLabel = metadata.dailyLimit === 1
          ? 'once'
          : `${metadata.dailyLimit} times`;
        return `Daily limit reached: ${definition.name} can only run ${runsLabel} per day. Fresh slots unlock tomorrow.`;
      }
    }
    const effectiveTime = resolveEffectiveTime(state);
    if (effectiveTime > 0 && state.timeLeft < effectiveTime) {
      return `You need at least ${formatHours(effectiveTime)} free before starting ${definition.name}.`;
    }
    if (metadata.cost > 0 && state.money < metadata.cost) {
      return `You need $${formatMoney(metadata.cost)} before funding ${definition.name}.`;
    }
    if (!meetsAssetRequirements(metadata.requirements, state)) {
      return `You still need: ${summarizeAssetRequirements(metadata.requirements, state)}.`;
    }
    return null;
  }

  function runHustle(context) {
    const effectiveTime = resolveEffectiveTime(context.state);
    if (effectiveTime > 0) {
      spendTime(effectiveTime);
      applyMetric(recordTimeContribution, metadata.metrics.time, { hours: effectiveTime });
    }
    if (metadata.cost > 0) {
      spendMoney(metadata.cost);
      applyMetric(recordCostContribution, metadata.metrics.cost, { amount: metadata.cost });
    }

    context.skipDefaultPayout = () => {
      context.__skipDefaultPayout = true;
    };

    config.onExecute?.(context);

    if (metadata.skills) {
      context.skillXpAwarded = awardSkillProgress({
        skills: metadata.skills,
        timeSpentHours: effectiveTime,
        moneySpent: metadata.cost,
        label: definition.name
      });
    }

    if (metadata.payout && metadata.payout.grantOnAction && !context.__skipDefaultPayout) {
      const basePayout = metadata.payout.amount;
      const { amount: finalPayout, applied: appliedBonuses } = applyInstantHustleEducationBonus({
        hustleId: metadata.id,
        baseAmount: basePayout,
        state: context.state
      });

      context.basePayout = basePayout;
      context.educationAdjustedPayout = finalPayout;
      context.appliedEducationBoosts = appliedBonuses;

      const upgradeResult = applyHustlePayoutMultiplier(finalPayout, context);
      const upgradedAmount = upgradeResult.amount;
      const roundedPayout = Math.max(0, Math.round(upgradedAmount));

      context.upgradeMultiplier = upgradeResult.multiplier;
      context.upgradeSources = upgradeResult.sources;
      context.finalPayout = roundedPayout;
      context.payoutGranted = roundedPayout;

      const template = metadata.payout.message;
      let message;
      if (typeof template === 'function') {
        message = template(context);
      } else if (template) {
        message = template;
      } else {
        const bonusNote = appliedBonuses.length ? ' Education bonus included!' : '';
        const upgradeNote = upgradeResult.sources.length ? ' Upgrades amplified the payout!' : '';
        message = `${definition.name} paid $${formatMoney(roundedPayout)}.${bonusNote}${upgradeNote}`;
      }

      addMoney(roundedPayout, message, metadata.payout.logType);
      applyMetric(recordPayoutContribution, metadata.metrics.payout, { amount: roundedPayout });

      if (appliedBonuses.length) {
        const summary = formatEducationBonusSummary(appliedBonuses);
        if (summary) {
          addLog(`Your studies kicked in: ${summary}.`, 'info');
        }
      }
    }

    const updatedUsage = updateDailyUsage(context.state);
    if (updatedUsage) {
      context.limitUsage = updatedUsage;
    }

    config.onComplete?.(context);
  }

  definition.action = {
    label: config.actionLabel || 'Run Hustle',
    className: actionClassName,
    disabled: () => {
      const state = getState();
      if (!state) return true;
      return Boolean(getDisabledReason(state));
    },
    onClick: () => {
      executeAction(() => {
        const state = getState();
        if (!state) return;
        const reason = getDisabledReason(state);
        if (reason) {
          addLog(reason, 'warning');
          return;
        }
        const context = {
          definition,
          metadata,
          state,
          payoutGranted: 0,
          __skipDefaultPayout: false
        };
        runHustle(context);
      });
      checkDayEnd();
    }
  };

  definition.metricIds = {
    time: metadata.metrics.time?.key || null,
    cost: metadata.metrics.cost?.key || null,
    payout: metadata.metrics.payout?.key || null
  };
  definition.action.metricIds = definition.action.metricIds || metadata.metrics;

  return definition;
}

function normalizeSlotMap(map) {
  if (!map || typeof map !== 'object') return null;
  const normalized = {};
  Object.entries(map).forEach(([slot, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) return;
    normalized[slot] = numeric;
  });
  return Object.keys(normalized).length ? normalized : null;
}

function formatKeyLabel(key) {
  if (!key) return '';
  return key
    .toString()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

function formatSlotMap(map) {
  if (!map) return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

function describeTargetScope(scope) {
  if (!scope || typeof scope !== 'object') return '';
  const tags = ensureArray(scope.tags).map(tag => `#${tag}`);
  const ids = ensureArray(scope.ids);
  const families = ensureArray(scope.families).map(formatKeyLabel);
  const categories = ensureArray(scope.categories).map(formatKeyLabel);
  const fragments = [];
  if (ids.length) fragments.push(ids.join(', '));
  if (families.length) fragments.push(`${families.join(', ')} family`);
  if (categories.length) fragments.push(`${categories.join(', ')} category`);
  if (tags.length) fragments.push(tags.join(', '));
  return fragments.join(' • ');
}

function describeEffectSummary(effects, affects) {
  if (!effects || typeof effects !== 'object') return null;
  const parts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% maintenance speed`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality progress`;
        break;
      default:
        label = `${effect}: ${numeric}`;
    }
    const targetPieces = [];
    const assetScope = describeTargetScope(affects?.assets);
    if (assetScope) targetPieces.push(`assets (${assetScope})`);
    const hustleScope = describeTargetScope(affects?.hustles);
    if (hustleScope) targetPieces.push(`hustles (${hustleScope})`);
    const actionScope = ensureArray(affects?.actions?.types);
    if (actionScope.length) {
      targetPieces.push(`actions (${actionScope.join(', ')})`);
    }
    const targetSummary = targetPieces.length ? ` → ${targetPieces.join(' & ')}` : '';
    parts.push(`${label}${targetSummary}`);
  });
  return parts.length ? parts.join(' • ') : null;
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

export function createUpgrade(config) {
  const rawRequirements = [...ensureArray(config.requires), ...ensureArray(config.prerequisites)];
  const requirements = normalizeUpgradeRequirements(rawRequirements);
  const provides = normalizeSlotMap(config.provides);
  const consumes = normalizeSlotMap(config.consumes);
  const effects = { ...(config.effects || {}) };
  const affects = {
    assets: config.affects?.assets ? { ...config.affects.assets } : {},
    hustles: config.affects?.hustles ? { ...config.affects.hustles } : {},
    actions: config.affects?.actions ? { ...config.affects.actions } : {}
  };
  const synergies = Array.isArray(config.synergies) ? config.synergies.slice() : [];
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
    defaultState: config.defaultState || { purchased: false }
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
  definition.details = [...details, ...(config.details || [])];

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
    className: config.actionClassName || 'secondary',
    label: config.actionLabel,
    labels: config.labels || {}
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
          let message = config.blockedMessage || 'You still need to meet the requirements first.';
          if (!context.upgradeState?.purchased && context.conflict) {
            message = `${context.conflict.name || 'Another upgrade'} already occupies this lane.`;
          } else if (context.slotConflict) {
            const ledger = buildSlotLedger({ state: context.state });
            const summary = describeSlotLedger(context.slotConflict, ledger);
            const required = consumes?.[context.slotConflict] || 1;
            const available = summary ? Math.max(0, summary.available) : 0;
            message = `You need ${formatSlotLabel(context.slotConflict, required)} available (remaining ${available}).`;
          }
          addLog(message, 'warning');
          return;
        }
        if (config.cost) {
          spendMoney(config.cost);
          applyMetric(recordCostContribution, costMetric, { amount: config.cost });
        }
        if (!config.repeatable) {
          context.upgradeState.purchased = true;
        }
        const skillLabel = typeof definition.name === 'string' ? definition.name : config.id;
        const skillXp = awardSkillProgress({
          skills: config.skills,
          moneySpent: config.cost,
          label: skillLabel,
          state: context.state
        });
        context.skillXpAwarded = skillXp;
        config.onPurchase?.(context);
        if (config.logMessage) {
          addLog(
            typeof config.logMessage === 'function' ? config.logMessage(context) : config.logMessage,
            config.logType || 'upgrade'
          );
        }
      });
      checkDayEnd();
    }
  };

  if (config.cardState || config.lockCard !== false) {
    definition.cardState = (state, card) => {
      if (typeof config.cardState === 'function') {
        config.cardState(state, card, {
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

  if (config.extraContent) {
    definition.extraContent = config.extraContent;
  }
  if (config.update) {
    definition.update = config.update;
  }
  if (config.process) {
    definition.process = config.process;
  }

  return definition;
}
