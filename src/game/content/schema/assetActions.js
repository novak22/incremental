import { formatHours, formatMoney, toNumber } from '../../../core/helpers.js';
import { countActiveAssetInstances, getActionState, getState } from '../../../core/state.js';
import { executeAction } from '../../actions.js';
import { addMoney, spendMoney } from '../../currency.js';
import { checkDayEnd } from '../../lifecycle.js';
import { recordCostContribution, recordPayoutContribution, recordTimeContribution } from '../../metrics.js';
import { summarizeAssetRequirements } from '../../requirements.js';
import { spendTime } from '../../time.js';
import { awardSkillProgress } from '../../skills/index.js';
import {
  applyInstantHustleEducationBonus,
  describeInstantHustleEducationBonuses,
  formatEducationBonusSummary
} from '../../educationEffects.js';
import { getHustleEffectMultiplier } from '../../upgrades/effects.js';
import { applyModifiers } from '../../data/economyMath.js';
import { applyMetric, normalizeHustleMetrics } from './metrics.js';
import { logEducationPayoffSummary, logHustleBlocked } from './logMessaging.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { advanceActionInstance, completeActionInstance } from '../../actions/progress.js';
import { createContractTemplate } from '../../actions/templates/contract.js';

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
    progress: config.progress
  };

  const definition = createContractTemplate(baseDefinition, {
    progress: {
      type: 'instant',
      completion: 'instant'
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

  function runHustle(context) {
    const effectiveTime = resolveEffectiveTime(context.state);
    context.effectiveTime = effectiveTime;
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

    const updatedUsage = updateDailyUsage(context.state);
    if (updatedUsage) {
      context.limitUsage = updatedUsage;
      markDirty('actions');
    }

    config.onComplete?.(context);
    markDirty('cards');
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
        const progressOverrides = definition.progress ? { ...definition.progress } : { ...config.progress };
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
        config.onRun?.(context);
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
