import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { getAssetState } from '../../core/state.js';
import { getAssets, getActionDefinition } from '../../game/registryService.js';
import {
  canPerformQualityAction,
  getQualityActions,
  getQualityTracks,
  performQualityAction
} from '../../game/assets/quality/actions.js';
import { getNextQualityLevel } from '../../game/assets/quality/levels.js';
import { instanceLabel } from '../../game/assets/details.js';
import { collectOutstandingActionEntries } from '../actions/registry.js';
import { registerActionProvider } from '../actions/providers.js';
import { getAvailableOffers, acceptHustleOffer } from '../../game/hustles.js';
import { describeHustleRequirements } from '../../game/hustles/helpers.js';
import {
  resolveOfferHours,
  resolveOfferPayout,
  resolveOfferSchedule,
  describeQuickActionOfferMeta
} from '../hustles/offerHelpers.js';
import { describeRequirementGuidance } from '../hustles/requirements.js';

function getQualitySnapshot(instance = {}) {
  const level = Math.max(0, clampNumber(instance?.quality?.level));
  const progress = instance?.quality?.progress && typeof instance.quality.progress === 'object'
    ? { ...instance.quality.progress }
    : {};
  return {
    level,
    progress
  };
}

function resolveProgressAmount(action, context) {
  if (!action) return 0;
  if (typeof action.progressAmount === 'function') {
    try {
      const amount = Number(action.progressAmount(context));
      if (Number.isFinite(amount) && amount > 0) {
        return amount;
      }
    } catch (error) {
      return 0;
    }
  }
  if (Number.isFinite(Number(action.progressAmount))) {
    const numeric = Number(action.progressAmount);
    return numeric > 0 ? numeric : 0;
  }
  if (action.progressKey) {
    return 1;
  }
  return 0;
}

function getProgressPerRun(asset, instance, action, state) {
  if (!asset || !instance || !action) return 0;
  const quality = getQualitySnapshot(instance);
  const context = {
    state,
    definition: asset,
    instance,
    quality,
    upgrade: id => state?.upgrades?.[id]
  };
  return resolveProgressAmount(action, context);
}

function estimateRemainingRuns(asset, instance, action, remaining, state) {
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return 0;
  }
  const progressPerRun = getProgressPerRun(asset, instance, action, state);
  if (!Number.isFinite(progressPerRun) || progressPerRun <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(remaining / progressPerRun));
}

export function buildQuickActions(state) {
  const workingState = state || {};
  const offers = getAvailableOffers(workingState, { includeUpcoming: false, includeClaimed: false }) || [];
  const currentDay = Math.max(1, clampNumber(workingState.day) || 1);

  const items = offers.map(offer => {
    const definition = getActionDefinition(offer.definitionId || offer.templateId) || {};
    const requirements = describeHustleRequirements(definition, workingState) || [];
    const unmetRequirements = requirements.filter(entry => entry && entry.met === false);
    const requirementsMet = unmetRequirements.length === 0;
    const lockGuidance = describeRequirementGuidance(unmetRequirements);
    const hours = resolveOfferHours(offer, definition, { toNumber: clampNumber });
    const payout = resolveOfferPayout(offer, definition, { toNumber: clampNumber });
    const roi = hours > 0 ? payout / Math.max(hours, 0.0001) : payout;
    const durationText = formatHours(hours);
    const schedule = resolveOfferSchedule(offer);
    const remainingDays = Number.isFinite(offer.expiresOnDay)
      ? Math.max(0, Math.floor(offer.expiresOnDay) - currentDay + 1)
      : null;

    const label = offer?.variant?.label
      || definition?.name
      || offer?.templateId
      || 'Hustle offer';

    const description = offer?.variant?.description || definition?.description || '';

    const meta = describeQuickActionOfferMeta({
      payout,
      schedule,
      durationText,
      remainingDays,
      formatMoneyFn: formatMoney
    });

    const enhancedMeta = requirementsMet
      ? meta
      : [lockGuidance, meta].filter(Boolean).join(' • ');
    const descriptionText = description;

    return {
      id: offer.id,
      label,
      primaryLabel: 'Accept',
      description: descriptionText,
      onClick: () => acceptHustleOffer(offer.id, { state: workingState }),
      roi,
      timeCost: hours,
      payout,
      payoutText: payout > 0 ? `$${formatMoney(payout)}` : '',
      durationHours: hours,
      durationText,
      meta: enhancedMeta,
      repeatable: false,
      remainingRuns: 1,
      remainingDays,
      schedule,
      offer,
      disabled: !requirementsMet,
      disabledReason: lockGuidance || 'Meet the prerequisites before accepting this hustle.'
    };
  });

  if (!items.length) {
    const guidance = 'Fresh leads roll in with tomorrow\'s market refresh.';
    items.push({
      id: 'hustles:no-offers',
      label: 'No hustle offers available',
      primaryLabel: 'Check back tomorrow',
      description: guidance,
      onClick: null,
      roi: 0,
      timeCost: 0,
      payout: 0,
      payoutText: '',
      durationHours: 0,
      durationText: '',
      meta: guidance,
      repeatable: false,
      remainingRuns: 0,
      remainingDays: null,
      schedule: 'onCompletion'
    });
  }

  items.sort((a, b) => {
    const daysA = Number.isFinite(a.remainingDays) ? a.remainingDays : Infinity;
    const daysB = Number.isFinite(b.remainingDays) ? b.remainingDays : Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    if (b.roi !== a.roi) {
      return b.roi - a.roi;
    }
    return a.label.localeCompare(b.label);
  });

  return items;
}

export function buildInProgressActions(state = {}) {
  const outstanding = collectOutstandingActionEntries(state) || [];
  return outstanding.map(entry => ({
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle || '',
    meta: entry.meta || '',
    payoutText: entry.payoutText || '',
    payout: entry.payout,
    remainingDays: entry.progress?.remainingDays ?? null,
    deadlineDay: entry.progress?.deadlineDay ?? null,
    hoursRemaining: entry.progress?.hoursRemaining ?? null,
    hoursLogged: entry.progress?.hoursLogged ?? null,
    hoursRequired: entry.progress?.hoursRequired ?? null,
    progress: entry.progress || null
  }));
}

export function buildAssetUpgradeRecommendations(state) {
  if (!state) return [];

  const suggestions = [];

  for (const asset of getAssets()) {
    const qualityActions = getQualityActions(asset);
    if (!qualityActions.length) continue;

    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    if (!instances.length) continue;

    const tracks = getQualityTracks(asset);

    instances.forEach(instance => {
      if (instance?.status !== 'active') return;

      const quality = instance.quality || {};
      const level = Math.max(0, clampNumber(quality.level));
      const nextLevel = getNextQualityLevel(asset, level);
      if (!nextLevel?.requirements) return;

      const progress = quality.progress || {};
      const requirements = Object.entries(nextLevel.requirements);
      if (!requirements.length) return;

      const assetStateInstances = assetState.instances || [];
      const assetIndex = assetStateInstances.indexOf(instance);
      const label = instanceLabel(asset, assetIndex >= 0 ? assetIndex : 0);
      const performance = Math.max(0, clampNumber(instance.lastIncome));

      requirements.forEach(([key, targetValue]) => {
        const target = Math.max(0, clampNumber(targetValue));
        if (target <= 0) return;
        const current = Math.max(0, clampNumber(progress?.[key]));
        const remaining = Math.max(0, target - current);
        if (remaining <= 0) return;

        const action = qualityActions.find(entry => entry.progressKey === key);
        if (!action) return;
        if (!canPerformQualityAction(asset, instance, action, state)) return;

        const completion = target > 0 ? Math.min(1, current / target) : 1;
        const percentComplete = Math.max(0, Math.min(100, Math.round(completion * 100)));
        const percentRemaining = Math.max(0, 100 - percentComplete);
        const track = tracks?.[key] || {};
        const requirementLabel = track.shortLabel || track.label || key;
        const timeCost = Math.max(0, clampNumber(action.time));
        const moneyCost = Math.max(0, clampNumber(action.cost));
        const effortParts = [];
        if (timeCost > 0) {
          effortParts.push(`${formatHours(timeCost)} focus`);
        }
        if (moneyCost > 0) {
          effortParts.push(`$${formatMoney(moneyCost)}`);
        }
        const progressNote = `${Math.min(current, target)}/${target} logged (${percentComplete}% complete)`;
        const meta = effortParts.length ? `${progressNote} • ${effortParts.join(' • ')}` : progressNote;
        const actionLabel = typeof action.label === 'function'
          ? action.label({ definition: asset, instance, state })
          : action.label;
        const buttonLabel = actionLabel || 'Boost Quality';
        const remainingRuns = estimateRemainingRuns(asset, instance, action, remaining, state);
        const repeatable = remainingRuns == null ? true : remainingRuns > 1;

        suggestions.push({
          id: `asset-upgrade:${asset.id}:${instance.id}:${action.id}:${key}`,
          title: `${label} · ${buttonLabel}`,
          subtitle: `${remaining} ${requirementLabel} to go for Quality ${nextLevel.level} (${percentRemaining}% to go).`,
          meta,
          buttonLabel,
          onClick: () => performQualityAction(asset.id, instance.id, action.id),
          performance,
          completion,
          remaining,
          level,
          timeCost,
          remainingRuns,
          repeatable,
          cost: moneyCost
        });
      });
    });
  }

  suggestions.sort((a, b) => {
    if (a.performance !== b.performance) {
      return a.performance - b.performance;
    }
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    if (a.completion !== b.completion) {
      return a.completion - b.completion;
    }
    if (a.remaining !== b.remaining) {
      return b.remaining - a.remaining;
    }
    return a.title.localeCompare(b.title);
  });

  return suggestions;
}

export function buildQuickActionModel(state = {}) {
  const suggestions = buildQuickActions(state);
  const inProgress = buildInProgressActions(state);
  const entries = suggestions.map(action => ({
    id: action.id,
    title: action.label,
    subtitle: action.description,
    buttonLabel: action.primaryLabel,
    onClick: action.onClick,
    payout: action.payout,
    payoutText: action.payoutText,
    durationHours: action.durationHours,
    durationText: action.durationText,
    meta: action.meta,
    repeatable: action.repeatable,
    remainingRuns: action.remainingRuns,
    disabled: action.disabled,
    disabledReason: action.disabledReason
  }));
  const baseHours = clampNumber(state.baseTime) + clampNumber(state.bonusTime) + clampNumber(state.dailyBonusTime);
  const hoursAvailable = Math.max(0, clampNumber(state.timeLeft));
  const hoursSpent = Math.max(0, baseHours - hoursAvailable);
  return {
    entries,
    emptyMessage: 'No ready actions. Check upgrades or ventures.',
    buttonClass: 'primary',
    defaultLabel: 'Queue',
    hoursAvailable,
    hoursAvailableLabel: formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: formatHours(hoursSpent),
    day: clampNumber(state.day),
    moneyAvailable: clampNumber(state.money),
    inProgress
  };
}

export function buildAssetActionModel(state = {}) {
  const suggestions = buildAssetUpgradeRecommendations(state);
  const entries = suggestions.map(action => {
    const timeCost = Math.max(0, clampNumber(action.timeCost));
    return {
      id: action.id,
      title: action.title,
      subtitle: action.subtitle,
      meta: action.meta,
      metaClass: 'upgrade-actions__meta',
      buttonLabel: action.buttonLabel,
      onClick: action.onClick,
      timeCost,
      durationHours: timeCost,
      durationText: formatHours(timeCost),
      moneyCost: Math.max(0, clampNumber(action.cost)),
      repeatable: Boolean(action.repeatable),
      remainingRuns: action.remainingRuns ?? null
    };
  });
  return {
    entries,
    emptyMessage: 'Every venture is humming along. Check back after today’s upkeep.',
    buttonClass: 'secondary',
    defaultLabel: 'Boost',
    scroller: { limit: 6 },
    moneyAvailable: clampNumber(state.money)
  };
}

registerActionProvider(({ state }) => {
  const model = buildQuickActionModel(state);
  const entries = (Array.isArray(model?.entries) ? model.entries : []).map((entry, index) => ({
    ...entry,
    focusCategory: entry?.focusCategory || 'hustle',
    orderIndex: Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index
  }));

  return {
    id: 'quick-actions',
    focusCategory: 'hustle',
    entries,
    metrics: {
      emptyMessage: model?.emptyMessage,
      buttonClass: model?.buttonClass,
      defaultLabel: model?.defaultLabel,
      hoursAvailable: model?.hoursAvailable,
      hoursAvailableLabel: model?.hoursAvailableLabel,
      hoursSpent: model?.hoursSpent,
      hoursSpentLabel: model?.hoursSpentLabel,
      moneyAvailable: model?.moneyAvailable,
      scroller: model?.scroller,
      inProgressEntries: model?.inProgress
    }
  };
}, 30);

registerActionProvider(({ state }) => {
  const model = buildAssetActionModel(state);
  const entries = (Array.isArray(model?.entries) ? model.entries : []).map((entry, index) => ({
    ...entry,
    meta: [entry?.subtitle, entry?.meta].filter(Boolean).join(' • ') || entry?.meta || '',
    focusCategory: entry?.focusCategory || 'upgrade',
    orderIndex: Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index
  }));

  return {
    id: 'asset-upgrades',
    focusCategory: 'upgrade',
    entries,
    metrics: {
      emptyMessage: model?.emptyMessage,
      buttonClass: model?.buttonClass,
      defaultLabel: model?.defaultLabel,
      moneyAvailable: model?.moneyAvailable,
      scroller: model?.scroller
    }
  };
}, 20);
