import { formatHours, formatMoney, toNumber } from '../../../../core/helpers.js';
import { countActiveAssetInstances, getActionState, getState } from '../../../../core/state.js';
import { markDirty } from '../../../../core/events/invalidationBus.js';
import { executeAction } from '../../../actions.js';
import { addMoney } from '../../../currency.js';
import { checkDayEnd } from '../../../lifecycle.js';
import { recordPayoutContribution, recordTimeContribution } from '../../../metrics.js';
import { summarizeAssetRequirements } from '../../../requirements.js';
import { spendTime } from '../../../time.js';
import { awardSkillProgress } from '../../../skills/index.js';
import {
  applyInstantHustleEducationBonus,
  formatEducationBonusSummary
} from '../../../educationEffects.js';
import { getHustleEffectMultiplier } from '../../../upgrades/effects/index.js';
import { applyModifiers } from '../../../data/economyMath.js';
import { applyMetric } from '../metrics.js';
import { logEducationPayoffSummary, logHustleBlocked } from '../logMessaging.js';
import { advanceActionInstance, completeActionInstance } from '../../../actions/progress/instances.js';

function meetsAssetRequirements(requirements = [], state = getState()) {
  if (!requirements?.length) return true;
  return requirements.every(req => countActiveAssetInstances(req.assetId, state) >= toNumber(req.count, 1));
}

export function createDailyLimitTracker(metadata) {
  function sanitizePendingCount(value, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }
    if (!Number.isFinite(max)) {
      return Math.floor(numeric);
    }
    return Math.max(0, Math.min(Math.floor(numeric), Math.floor(max)));
  }

  function resolveDailyUsage(state = getState(), { sync = false } = {}) {
    const actionState = getActionState(metadata.id, state);
    const currentDay = Number(state?.day) || 1;

    const lastRunDay = Number(actionState.lastRunDay) || 0;
    const baseRuns = Number(actionState.runsToday) || 0;
    const sanitizedRuns = Math.max(0, baseRuns);
    const usedToday = metadata.dailyLimit
      ? (lastRunDay === currentDay ? sanitizedRuns : 0)
      : sanitizedRuns;

    const pendingDay = Number(actionState.pendingAcceptsDay) || 0;
    const pendingBase = pendingDay === currentDay ? actionState.pendingAccepts : 0;
    const pendingToday = sanitizePendingCount(pendingBase, metadata.dailyLimit);

    if (sync) {
      if (metadata.dailyLimit) {
        if (lastRunDay !== currentDay) {
          actionState.lastRunDay = currentDay;
          actionState.runsToday = usedToday;
        }
        if (pendingDay !== currentDay) {
          actionState.pendingAcceptsDay = pendingToday > 0 ? currentDay : null;
          actionState.pendingAccepts = pendingToday;
        } else if (actionState.pendingAccepts !== pendingToday) {
          actionState.pendingAccepts = pendingToday;
        }
      } else if (!Number.isFinite(baseRuns) || baseRuns < 0) {
        actionState.runsToday = 0;
      }
      if (pendingToday === 0 && metadata.dailyLimit) {
        actionState.pendingAccepts = 0;
        actionState.pendingAcceptsDay = null;
      }
    }

    if (!metadata.dailyLimit) {
      return {
        actionState,
        currentDay,
        limit: null,
        used: Math.max(0, baseRuns),
        pending: pendingToday,
        remaining: null
      };
    }

    const remaining = Math.max(0, metadata.dailyLimit - usedToday - pendingToday);

    return {
      actionState,
      currentDay,
      limit: metadata.dailyLimit,
      used: usedToday,
      pending: pendingToday,
      remaining
    };
  }

  function reserveDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    if (usage.remaining <= 0) {
      return null;
    }
    const available = metadata.dailyLimit - usage.used;
    const nextPending = Math.min(available, usage.pending + 1);
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = usage.currentDay;
    const remaining = Math.max(0, metadata.dailyLimit - usage.used - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: usage.used,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  function releaseDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    const nextPending = usage.pending > 0 ? usage.pending - 1 : 0;
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = nextPending > 0 ? usage.currentDay : null;
    const remaining = Math.max(0, metadata.dailyLimit - usage.used - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: usage.used,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  function consumeDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    const nextPending = usage.pending > 0 ? usage.pending - 1 : 0;
    const nextUsed = Math.min(metadata.dailyLimit, usage.used + 1);
    usage.actionState.lastRunDay = usage.currentDay;
    usage.actionState.runsToday = nextUsed;
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = nextPending > 0 ? usage.currentDay : null;
    const remaining = Math.max(0, metadata.dailyLimit - nextUsed - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: nextUsed,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  return { resolveDailyUsage, reserveDailyUsage, releaseDailyUsage, consumeDailyUsage };
}

export function createExecutionHooks({
  definition,
  metadata,
  config,
  resolveDailyUsage,
  reserveDailyUsage,
  releaseDailyUsage,
  consumeDailyUsage
}) {
  function resolveEffectiveTime(state = getState()) {
    if (!metadata.time) return metadata.time;
    const { multiplier } = getHustleEffectMultiplier(definition, 'setup_time_mult', {
      state,
      actionType: 'setup'
    });
    const adjusted = metadata.time * (Number.isFinite(multiplier) ? multiplier : 1);
    return Number.isFinite(adjusted) ? Math.max(0, adjusted) : metadata.time;
  }

  function getDisabledReason(state) {
    if (metadata.dailyLimit) {
      const usage = resolveDailyUsage(state, { sync: true });
      if (usage.remaining <= 0) {
        if (usage.pending > 0 && usage.used < metadata.dailyLimit) {
          return `All ${definition.name} contracts for today are already claimed. Complete or cancel an active contract to free a slot.`;
        }
        const runsLabel = metadata.dailyLimit === 1 ? 'once' : `${metadata.dailyLimit} times`;
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

    const updatedUsage = consumeDailyUsage(state);
    if (updatedUsage) {
      workingContext.limitUsage = updatedUsage;
      markDirty('actions');
    }

    return workingContext;
  }

  function runHustle(context) {
    const effectiveTime = resolveEffectiveTime(context.state);
    context.effectiveTime = effectiveTime;
    if (effectiveTime > 0) {
      spendTime(effectiveTime);
      applyMetric(recordTimeContribution, metadata.metrics.time, { hours: effectiveTime });
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
      const { amount: educationAdjusted, applied: appliedBonuses } = applyInstantHustleEducationBonus({
        hustleId: metadata.id,
        baseAmount: basePayout,
        state: context.state
      });

      context.basePayout = basePayout;
      context.educationAdjustedPayout = educationAdjusted;
      context.appliedEducationBoosts = appliedBonuses;

      const upgradeResult = applyHustlePayoutMultiplier(educationAdjusted, context);
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
        logEducationPayoffSummary(summary);
      }
    }

    const updatedUsage = consumeDailyUsage(context.state);
    if (updatedUsage) {
      context.limitUsage = updatedUsage;
      markDirty('actions');
    }

    config.onComplete?.(context);
    markDirty('cards');
  }

  function disabled() {
    const state = getState();
    if (!state) return true;
    return Boolean(getDisabledReason(state));
  }

  function handleActionClick() {
    executeAction(() => {
      const state = getState();
      if (!state) return;
      const reason = getDisabledReason(state);
      if (reason) {
        logHustleBlocked(reason);
        return;
      }
      const context = {
        definition,
        state,
        metadata,
        get usage() {
          return resolveDailyUsage(state, { sync: false });
        }
      };
      const effectiveTime = resolveEffectiveTime(state);
      const deadlineDay = metadata.dailyLimit ? Number(state?.day) || null : null;
      const progressOverrides = definition.progress ? { ...definition.progress } : { ...(config.progress || {}) };
      if (deadlineDay != null) {
        progressOverrides.deadlineDay = deadlineDay;
      }
      const instance = definition.acceptInstance({
        state,
        metadata,
        overrides: {
          hoursRequired: effectiveTime > 0 ? effectiveTime : 0,
          deadlineDay,
          progress: progressOverrides
        }
      });
      if (instance) {
        context.instance = instance;
        const logDay = Number(state?.day) || instance.acceptedOnDay;
        advanceActionInstance(definition, instance, {
          state,
          day: logDay,
          hours: effectiveTime,
          autoComplete: false,
          completionContext: context,
          metadata
        });
      }
      runHustle(context);
      context.completionDay = Number(state?.day) || instance?.acceptedOnDay || null;
      const completionMode = (definition.progress || config.progress || {}).completion;
      const shouldDeferCompletion = completionMode === 'deferred' || completionMode === 'manual';
      if (instance && !shouldDeferCompletion) {
        completeActionInstance(definition, instance, context);
      }
    });
    checkDayEnd();
  }

  return {
    resolveEffectiveTime,
    getDisabledReason,
    runHustle,
    disabled,
    handleActionClick,
    prepareCompletion,
    reserveDailyUsage,
    releaseDailyUsage,
    consumeDailyUsage
  };
}
