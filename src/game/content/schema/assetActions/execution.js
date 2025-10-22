import { formatHours, formatMoney, toNumber } from '../../../../core/helpers.js';
import { countActiveAssetInstances, getState } from '../../../../core/state.js';
import { markDirty } from '../../../../core/events/invalidationBus.js';
import { executeAction } from '../../../actions.js';
import { recordTimeContribution } from '../../../metrics.js';
import { summarizeAssetRequirements } from '../../../requirements/descriptors.js';
import { spendTime } from '../../../time.js';
import { scheduleDayEndCheck } from '../../../time/dayEndScheduler.js';
import { awardSkillProgress } from '../../../skills/index.js';
import { applyMetric } from '../metrics.js';
import { logHustleBlocked } from '../logMessaging.js';
import { advanceActionInstance, completeActionInstance } from '../../../actions/progress/instances.js';
import { createDailyLimitTracker } from './dailyLimitTracker.js';
import { createTimeHelpers } from './timeManagement.js';
import { createPayoutProcessing } from './payoutProcessing.js';
import { createAcceptanceCostApplier } from './acceptanceCost.js';

function meetsAssetRequirements(requirements = [], state = getState()) {
  if (!requirements?.length) return true;
  return requirements.every(req => countActiveAssetInstances(req.assetId, state) >= toNumber(req.count, 1));
}

export { createDailyLimitTracker };

export function createExecutionHooks({
  definition,
  metadata,
  config,
  resolveDailyUsage,
  reserveDailyUsage,
  releaseDailyUsage,
  consumeDailyUsage
}) {
  const { resolveEffectiveTime, computeCompletionHours } = createTimeHelpers({ definition, metadata });
  const { applyHustlePayoutMultiplier, calculatePayoutContext, applyPayoutSideEffects } =
    createPayoutProcessing({ definition, metadata });
  const applyAcceptanceCost = createAcceptanceCostApplier({ metadata });

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

    const shouldApplySideEffects = workingContext.__completionSideEffectsApplied !== true;

    if (shouldApplySideEffects && workingContext.effectiveTime > 0) {
      applyMetric(recordTimeContribution, metadata.metrics?.time, { hours: workingContext.effectiveTime });
    }

    workingContext.skipDefaultPayout = () => {
      workingContext.__skipDefaultPayout = true;
    };

    if (shouldApplySideEffects && metadata.skills) {
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

    const payoutDetails = calculatePayoutContext(basePayout, workingContext);
    if (payoutDetails) {
      Object.assign(workingContext, payoutDetails);
      if (payoutDetails.educationSummary) {
        workingContext.__educationSummary = payoutDetails.educationSummary;
      }
    }

    if (shouldApplySideEffects) {
      const updatedUsage = consumeDailyUsage(state);
      if (updatedUsage) {
        workingContext.limitUsage = updatedUsage;
        markDirty('actions');
      }
      workingContext.__completionSideEffectsApplied = true;
    }

    return workingContext;
  }

  function runHustle(context) {
    const effectiveTime = resolveEffectiveTime(context.state);
    context.effectiveTime = effectiveTime;
    const shouldApplySideEffects = context.__completionSideEffectsApplied !== true;

    if (shouldApplySideEffects && effectiveTime > 0) {
      spendTime(effectiveTime);
      applyMetric(recordTimeContribution, metadata.metrics?.time, { hours: effectiveTime });
    }

    context.skipDefaultPayout = () => {
      context.__skipDefaultPayout = true;
    };

    config.onExecute?.(context);

    if (shouldApplySideEffects && metadata.skills) {
      context.skillXpAwarded = awardSkillProgress({
        skills: metadata.skills,
        timeSpentHours: effectiveTime,
        moneySpent: metadata.cost,
        label: definition.name
      });
    }

    if (metadata.payout?.grantOnAction) {
      const payoutDetails = calculatePayoutContext(metadata.payout.amount, context);
      if (payoutDetails) {
        Object.assign(context, payoutDetails);
        applyPayoutSideEffects(context, payoutDetails);
      }
    }

    if (shouldApplySideEffects) {
      const updatedUsage = consumeDailyUsage(context.state);
      if (updatedUsage) {
        context.limitUsage = updatedUsage;
        markDirty('actions');
      }
      context.__completionSideEffectsApplied = true;
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
        applyAcceptanceCost({ state, instance });
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
    scheduleDayEndCheck();
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
    consumeDailyUsage,
    applyAcceptanceCost,
    applyHustlePayoutMultiplier
  };
}
