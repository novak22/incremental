import { formatHours, formatMoney } from '../../../core/helpers.js';
import { clampNumber } from '../formatters.js';
import { getAssetState } from '../../../core/state.js';
import { getAssets, getActionDefinition } from '../../../game/registryService.js';
import {
  canPerformQualityAction,
  getQualityActions,
  getQualityTracks,
  performQualityAction
} from '../../../game/assets/quality/actions.js';
import { getNextQualityLevel } from '../../../game/assets/quality/levels.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { describeHustleRequirements } from '../../../game/hustles/helpers.js';
import { describeRequirementGuidance } from '../../hustles/requirements.js';
import { getAvailableOffers } from '../../../game/hustles.js';
import {
  resolveOfferHours,
  resolveOfferPayout,
  resolveOfferSchedule,
  describeHustleOfferMeta,
  groupOffersByTemplateVariant
} from '../../hustles/offerHelpers.js';
import { selectGroupOffers } from './filters.js';

function normalizeCategory(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('study') || trimmed.startsWith('education')) {
    return 'study';
  }
  if (trimmed.startsWith('maint')) {
    return 'maintenance';
  }
  return trimmed;
}

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

export function estimateRemainingRuns(asset, instance, action, remaining, state) {
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return 0;
  }
  const progressPerRun = getProgressPerRun(asset, instance, action, state);
  if (!Number.isFinite(progressPerRun) || progressPerRun <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(remaining / progressPerRun));
}

export function extractQuickActionCandidates(state = {}) {
  const workingState = state || {};
  const offers = getAvailableOffers(workingState, { includeUpcoming: false, includeClaimed: false }) || [];
  const currentDay = Math.max(1, clampNumber(workingState.day) || 1);

  const groups = groupOffersByTemplateVariant(offers);

  return groups.map(group => {
    const { primaryOffer, availableOffers, fallbackOffers } = selectGroupOffers(group, currentDay);
    if (!primaryOffer) {
      return null;
    }

    const definition = getActionDefinition(group.definitionId || group.templateId) || {};
    const requirements = describeHustleRequirements(definition, workingState) || [];
    const unmetRequirements = requirements.filter(entry => entry && entry.met === false);
    const requirementsMet = unmetRequirements.length === 0;
    const lockGuidance = describeRequirementGuidance(unmetRequirements);

    const hours = resolveOfferHours(primaryOffer, definition, { toNumber: clampNumber });
    const payout = resolveOfferPayout(primaryOffer, definition, { toNumber: clampNumber });
    const schedule = resolveOfferSchedule(primaryOffer);
    const offerMeta = describeHustleOfferMeta({
      offer: primaryOffer,
      definition,
      currentDay,
      formatHoursFn: formatHours,
      formatMoneyFn: formatMoney,
      toNumber: clampNumber
    });

    const seatsAvailable = availableOffers.reduce((total, entry) => {
      const seats = clampNumber(entry?.seats);
      return total + (Number.isFinite(seats) && seats > 0 ? Math.floor(seats) : 1);
    }, 0);

    const normalizedCategory = normalizeCategory(group.category || definition?.market?.category || 'hustle');
    const remainingRuns = availableOffers.length > 0 ? availableOffers.length : 1;

    const actionId = primaryOffer?.id || `offer-group:${group.id}`;
    const offerIds = Array.isArray(group.offers)
      ? group.offers.map(entry => entry?.id).filter(Boolean)
      : [];

    return {
      id: actionId,
      groupId: group.id,
      offerIds,
      state: workingState,
      definition,
      primaryOffer,
      requirementsMet,
      lockGuidance,
      payout,
      hours,
      schedule,
      offerMeta,
      roi: hours > 0 ? payout / Math.max(hours, 0.0001) : payout,
      remainingRuns,
      remainingDays: offerMeta.expiresIn,
      seatsAvailable: seatsAvailable > 0 ? seatsAvailable : offerMeta.seatsAvailable,
      seatPolicy: offerMeta.seatPolicy,
      normalizedCategory,
      labelCandidates: {
        variantLabel: group.variantLabel,
        definitionName: definition?.name,
        templateId: primaryOffer?.templateId,
        fallback: 'Hustle offer'
      },
      descriptionSource: primaryOffer?.variant?.description || definition?.description || '',
      availableOffers,
      fallbackOffers
    };
  }).filter(Boolean);
}

export function buildAssetUpgradeData(state) {
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
