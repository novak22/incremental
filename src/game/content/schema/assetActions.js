import { formatHours, formatMoney, toNumber } from '../../../core/helpers.js';
import { countActiveAssetInstances, getActionState, getState } from '../../../core/state.js';
import { addMoney, spendMoney } from '../../currency.js';
import { recordCostContribution, recordPayoutContribution, recordTimeContribution } from '../../metrics.js';
import { summarizeAssetRequirements } from '../../requirements.js';
import { awardSkillProgress } from '../../skills/index.js';
import {
  applyInstantHustleEducationBonus,
  describeInstantHustleEducationBonuses,
  formatEducationBonusSummary
} from '../../educationEffects.js';
import { getHustleEffectMultiplier } from '../../upgrades/effects/index.js';
import { applyModifiers } from '../../data/economyMath.js';
import { applyMetric, normalizeHustleMetrics } from './metrics.js';
import { logEducationPayoffSummary } from './logMessaging.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { createContractTemplate } from '../../actions/templates/contract.js';
import {
  ensureActionMarketCategoryState,
  getActionMarketAvailableOffers
} from '../../../core/state/slices/actionMarket/index.js';
import { rollDailyOffers } from '../../hustles/market.js';

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
    const actionState = getActionState(metadata.id, state);
    const currentDay = Number(state?.day) || 1;

    if (!metadata.dailyLimit) {
      return {
        actionState,
        currentDay,
        limit: null,
        used: Number(actionState.runsToday) || 0,
        remaining: null
      };
    }

    const lastRunDay = Number(actionState.lastRunDay) || 0;
    const usedToday = lastRunDay === currentDay ? Number(actionState.runsToday) || 0 : 0;

    if (sync && lastRunDay !== currentDay) {
      actionState.lastRunDay = currentDay;
      actionState.runsToday = usedToday;
    }

    return {
      actionState,
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
    usage.actionState.lastRunDay = usage.currentDay;
    usage.actionState.runsToday = nextUsed;
    const remaining = Math.max(0, metadata.dailyLimit - nextUsed);
    return {
      limit: metadata.dailyLimit,
      used: nextUsed,
      remaining,
      day: usage.currentDay
    };
  }

  const suppliedProgress = typeof config.progress === 'object' && config.progress !== null
    ? { ...config.progress }
    : {};
  const progressDefaults = {
    type: suppliedProgress.type || 'hustle',
    completion: suppliedProgress.completion || (metadata.time > 0 ? 'manual' : 'instant')
  };

  if (suppliedProgress.hoursRequired != null) {
    progressDefaults.hoursRequired = suppliedProgress.hoursRequired;
  } else {
    const baseHours = Number(metadata.time);
    if (Number.isFinite(baseHours) && baseHours >= 0) {
      progressDefaults.hoursRequired = baseHours;
    }
  }

  const additionalProgressKeys = [
    'hoursPerDay',
    'daysRequired',
    'deadlineDay',
    'label',
    'completionMode',
    'progressLabel'
  ];
  for (const key of additionalProgressKeys) {
    if (suppliedProgress[key] != null) {
      progressDefaults[key] = suppliedProgress[key];
    }
  }

  const baseDefinition = {
    ...config,
    type: 'hustle',
    tag: config.tag || { label: 'Instant', type: 'instant' },
    defaultState: (() => {
      const base = { ...(config.defaultState || {}) };
      if (!Array.isArray(base.instances)) {
        base.instances = [];
      }
      if (metadata.dailyLimit) {
        if (typeof base.runsToday !== 'number') base.runsToday = 0;
        if (typeof base.lastRunDay !== 'number') base.lastRunDay = 0;
      }
      return base;
    })(),
    dailyLimit: metadata.dailyLimit,
    skills: metadata.skills,
    progress: progressDefaults,
    time: metadata.time
  };

  const acceptHooks = [];
  if (Array.isArray(config.acceptHooks)) {
    for (const hook of config.acceptHooks) {
      if (typeof hook === 'function') {
        acceptHooks.push(hook);
      }
    }
  }
  acceptHooks.push(context => {
    const state = context?.state || getState();
    if (!state) return;
    if (metadata.cost > 0) {
      spendMoney(metadata.cost);
      applyMetric(recordCostContribution, metadata.metrics.cost, { amount: metadata.cost });
      if (context?.instance) {
        context.instance.costPaid = (context.instance.costPaid || 0) + metadata.cost;
      }
    }
  });

  if (typeof config.onAccept === 'function') {
    acceptHooks.push(config.onAccept);
  }

  const completionHooks = [];

  completionHooks.push(hookContext => {
    if (hookContext?.__educationSummary) {
      logEducationPayoffSummary(hookContext.__educationSummary);
    }
  });

  if (typeof config.onComplete === 'function') {
    completionHooks.push(config.onComplete);
  }

  completionHooks.push(hookContext => {
    markDirty('cards');
    config.onRun?.(hookContext);
  });

  const definition = createContractTemplate(baseDefinition, {
    templateKind: 'manual',
    category: config.category || 'hustle',
    market: config.market,
    dailyLimit: metadata.dailyLimit,
    availability: config.availability,
    progress: progressDefaults,
    accept: {
      progress: progressDefaults,
      hooks: acceptHooks.map(hook => context => {
        hook({
          ...context,
          metadata: context.metadata || metadata,
          definition: context.definition || definition
        });
      })
    },
    complete: {
      hooks: completionHooks.map(hook => context => {
        hook({
          ...context,
          metadata: context.metadata || metadata,
          definition: context.definition || definition
        });
      })
    }
  });

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
    const effect = getHustleEffectMultiplier(definition, 'payout_mult', {
      state: context.state,
      actionType: 'payout'
    });
    if (!effect) {
      return { amount, multiplier: 1, sources: [] };
    }

    const baseMultiplier = Number.isFinite(effect.multiplier) ? effect.multiplier : 1;
    if (Array.isArray(effect.modifiers) && effect.modifiers.length) {
      const result = applyModifiers(amount, effect.modifiers, { clamp: effect.clamp });
      const finalAmount = Number.isFinite(result?.value) ? result.value : amount;
      const appliedSources = result.applied
        .filter(entry => entry.type === 'multiplier')
        .map(entry => ({ id: entry.id, label: entry.label, multiplier: entry.value }));
      return {
        amount: finalAmount,
        multiplier: Number.isFinite(result?.multiplier) ? result.multiplier : baseMultiplier,
        sources: appliedSources
      };
    }

    if (!Number.isFinite(baseMultiplier) || baseMultiplier === 1) {
      return { amount, multiplier: 1, sources: [] };
    }
    return { amount: amount * baseMultiplier, multiplier: baseMultiplier, sources: effect.sources || [] };
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

  function computeCompletionHours(instance, fallback) {
    const logged = Number(instance?.hoursLogged);
    if (Number.isFinite(logged) && logged >= 0) {
      return logged;
    }
    const progressHours = Number(instance?.progress?.hoursRequired);
    if (Number.isFinite(progressHours) && progressHours >= 0) {
      return progressHours;
    }
    return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
  }

  function prepareCompletion({ context = {}, instance, state, completionHours }) {
    const workingContext = context;
    workingContext.definition = definition;
    const instanceMetadata = instance?.metadata && typeof instance.metadata === 'object' ? instance.metadata : null;
    const providedMetadata = workingContext.metadata && typeof workingContext.metadata === 'object'
      ? workingContext.metadata
      : null;
    const resolvedMetadata = providedMetadata || instanceMetadata || metadata;
    workingContext.metadata = resolvedMetadata;
    workingContext.definitionMetadata = metadata;
    workingContext.state = state;

    const resolvedHours = Number.isFinite(completionHours)
      ? completionHours
      : computeCompletionHours(instance, metadata.time);
    workingContext.effectiveTime = Number.isFinite(resolvedHours) && resolvedHours >= 0 ? resolvedHours : 0;

    if (workingContext.effectiveTime > 0) {
      applyMetric(recordTimeContribution, metadata.metrics.time, { hours: workingContext.effectiveTime });
    }

    workingContext.skipDefaultPayout = () => {
      workingContext.__skipDefaultPayout = true;
    };

    if (metadata.skills) {
      workingContext.skillXpAwarded = awardSkillProgress({
        skills: metadata.skills,
        timeSpentHours: workingContext.effectiveTime,
        moneySpent: metadata.cost,
        label: definition.name,
        state
      });
    }

    config.onExecute?.(workingContext);

    const payoutAmountCandidates = [
      toNumber(resolvedMetadata?.payout?.amount, null),
      toNumber(resolvedMetadata?.payoutAmount, null),
      toNumber(instanceMetadata?.payout?.amount, null),
      toNumber(instanceMetadata?.payoutAmount, null),
      toNumber(metadata.payout?.amount, null)
    ];
    const basePayout = payoutAmountCandidates.find(value => Number.isFinite(value) && value >= 0) || 0;

    if (basePayout > 0 && !workingContext.__skipDefaultPayout) {
      const { amount: educationAdjusted, applied: appliedBonuses } = applyInstantHustleEducationBonus({
        hustleId: metadata.id,
        baseAmount: basePayout,
        state
      });

      workingContext.basePayout = basePayout;
      workingContext.educationAdjustedPayout = educationAdjusted;
      workingContext.appliedEducationBoosts = appliedBonuses;

      const upgradeResult = applyHustlePayoutMultiplier(educationAdjusted, workingContext);
      const upgradedAmount = upgradeResult.amount;
      const roundedPayout = Math.max(0, Math.round(upgradedAmount));

      workingContext.upgradeMultiplier = upgradeResult.multiplier;
      workingContext.upgradeSources = upgradeResult.sources;
      workingContext.finalPayout = roundedPayout;
      workingContext.payoutGranted = roundedPayout;

      if (appliedBonuses.length) {
        workingContext.__educationSummary = formatEducationBonusSummary(appliedBonuses);
      }
    }

    const updatedUsage = updateDailyUsage(state);
    if (updatedUsage) {
      workingContext.limitUsage = updatedUsage;
      markDirty('actions');
    }

    return workingContext;
  }

  function resolvePrimaryOfferAction({ state = getState(), includeUpcoming = true } = {}) {
    const workingState = state || getState();
    if (!workingState) {
      return null;
    }
    const currentDay = Math.max(1, Math.floor(Number(workingState.day) || 1));
    const marketState = ensureActionMarketCategoryState(workingState, 'hustle', { fallbackDay: currentDay });
    if (!marketState) {
      return null;
    }
    const offers = getActionMarketAvailableOffers(workingState, 'hustle', {
      day: currentDay,
      includeUpcoming
    });
    const matching = offers.filter(offer => offer?.templateId === metadata.id || offer?.definitionId === metadata.id);
    if (matching.length) {
      const readyOffer = matching.find(offer => Number(offer?.availableOnDay ?? currentDay) <= currentDay);
      const primary = readyOffer || matching[0];
      const label = primary?.variant?.label || definition.name || primary?.templateId || metadata.id;
      const disabledReason = getDisabledReason(workingState);
      return {
        type: 'offer',
        offer: primary,
        ready: Boolean(readyOffer),
        label: `Accept ${label}`,
        disabled: Boolean(disabledReason),
        disabledReason
      };
    }

    const rerollLabel = definition.market?.manualRerollLabel || 'Roll a fresh offer';
    return {
      type: 'reroll',
      label: rerollLabel,
      reroll: ({ day = currentDay } = {}) =>
        rollDailyOffers({ templates: [definition], state: workingState, day, category: 'hustle' })
    };
  }

  definition.action = {
    label: config.actionLabel || 'Accept Offer',
    className: actionClassName,
    disabled: () => true,
    onClick: null,
    resolvePrimaryAction: resolvePrimaryOfferAction
  };
  definition.getPrimaryOfferAction = resolvePrimaryOfferAction;
  definition.__prepareCompletion = ({ context, instance, state, completionHours }) =>
    prepareCompletion({ context, instance, state, completionHours });

  definition.metricIds = {
    time: metadata.metrics.time?.key || null,
    cost: metadata.metrics.cost?.key || null,
    payout: metadata.metrics.payout?.key || null
  };
  definition.action.metricIds = definition.action.metricIds || metadata.metrics;

  return definition;
}
