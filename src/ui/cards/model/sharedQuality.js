import { formatHours, formatMoney } from '../../../core/helpers.js';
import {
  canPerformQualityAction,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityTracks
} from '../../../game/assets/quality/actions.js';
import { getNextQualityLevel } from '../../../game/assets/quality/levels.js';

export function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function buildMilestoneProgress(definition, instance, options = {}) {
  const { maxedSummary, readySummary } = options;
  const quality = instance?.quality || {};
  const level = Math.max(0, clampNumber(quality.level));
  const nextLevel = getNextQualityLevel(definition, level);
  const tracks = getQualityTracks(definition);
  const progress = quality.progress || {};

  if (!nextLevel?.requirements) {
    return {
      level,
      percent: 1,
      summary: maxedSummary || 'Maxed out — milestone ready for future tuning.',
      nextLevel: null,
      steps: []
    };
  }

  let totalGoal = 0;
  let totalCurrent = 0;
  const steps = [];

  Object.entries(nextLevel.requirements).forEach(([key, rawGoal]) => {
    const goal = Math.max(0, clampNumber(rawGoal));
    if (goal <= 0) return;
    const current = Math.max(0, clampNumber(progress?.[key]));
    const capped = Math.min(current, goal);
    totalGoal += goal;
    totalCurrent += capped;
    const track = tracks?.[key] || {};
    const label = track.shortLabel || track.label || key;
    steps.push({
      key,
      label,
      current: capped,
      goal
    });
  });

  const percent = totalGoal > 0 ? Math.min(1, totalCurrent / totalGoal) : 1;
  const summary = steps.length
    ? steps.map(step => `${step.current}/${step.goal} ${step.label}`).join(' • ')
    : readySummary || 'No requirements — milestone ready to trigger.';

  return {
    level,
    percent,
    summary,
    nextLevel,
    steps
  };
}

export function buildActionSnapshot(definition, instance, action, state, options = {}) {
  const {
    lockedReason = 'Requires an upgrade first.',
    limitReason = 'Daily limit reached — try again tomorrow.',
    inactiveCopy = remaining => remaining > 0
      ? `Launch finishes in ${remaining} day${remaining === 1 ? '' : 's'}`
      : 'Launch prep wrapping up soon',
    decorate
  } = options;

  const timeCost = Math.max(0, clampNumber(action.time));
  const moneyCost = Math.max(0, clampNumber(action.cost));
  const usage = getQualityActionUsage(definition, instance, action);
  const availability = getQualityActionAvailability(definition, instance, action, state);
  const unlocked = Boolean(availability?.unlocked);
  const canRun = canPerformQualityAction(definition, instance, action, state);
  const tracks = getQualityTracks(definition);
  let disabledReason = '';

  if (instance.status !== 'active') {
    const remaining = Math.max(0, clampNumber(instance.daysRemaining));
    disabledReason = inactiveCopy(remaining, { definition, instance, action, state }) || '';
  } else if (!unlocked) {
    disabledReason = availability?.reason || lockedReason;
  } else if ((usage?.remainingUses ?? Infinity) <= 0) {
    disabledReason = limitReason;
  } else if (timeCost > 0 && state.timeLeft < timeCost) {
    disabledReason = `Need ${formatHours(timeCost)} free.`;
  } else if (moneyCost > 0 && state.money < moneyCost) {
    disabledReason = `Need $${formatMoney(moneyCost)} on hand.`;
  }

  const baseSnapshot = {
    id: action.id,
    label: action.label || 'Quality push',
    time: timeCost,
    cost: moneyCost,
    available: canRun,
    unlocked,
    usage,
    disabledReason,
    skills: action.skills || []
  };

  if (typeof decorate === 'function') {
    const extras = decorate({
      definition,
      instance,
      action,
      state,
      tracks,
      timeCost,
      moneyCost,
      usage,
      availability,
      baseSnapshot
    });
    if (extras && typeof extras === 'object') {
      return { ...baseSnapshot, ...extras };
    }
  }

  return baseSnapshot;
}

export default {
  clampNumber,
  buildMilestoneProgress,
  buildActionSnapshot
};
