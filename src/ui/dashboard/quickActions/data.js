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
import { getSortedLevels } from '../../../game/assets/quality/levels.js';
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

function shouldReplaceUpgradeSuggestion(existing = {}, candidate = {}) {
  const existingLevel = Number.isFinite(existing?.targetLevel) ? existing.targetLevel : Infinity;
  const candidateLevel = Number.isFinite(candidate?.targetLevel) ? candidate.targetLevel : Infinity;
  if (candidateLevel !== existingLevel) {
    return candidateLevel < existingLevel;
  }

  const existingRemaining = Number.isFinite(existing?.remaining) ? existing.remaining : Infinity;
  const candidateRemaining = Number.isFinite(candidate?.remaining) ? candidate.remaining : Infinity;
  if (candidateRemaining !== existingRemaining) {
    return candidateRemaining < existingRemaining;
  }

  const existingCompletion = Number.isFinite(existing?.completion) ? existing.completion : 0;
  const candidateCompletion = Number.isFinite(candidate?.completion) ? candidate.completion : 0;
  if (candidateCompletion !== existingCompletion) {
    return candidateCompletion > existingCompletion;
  }

  const existingOrder = Number.isFinite(existing?.orderIndex) ? existing.orderIndex : Infinity;
  const candidateOrder = Number.isFinite(candidate?.orderIndex) ? candidate.orderIndex : Infinity;
  return candidateOrder < existingOrder;
}

function mergeUpgradeSuggestion(targetMap, key, suggestion) {
  if (!targetMap || !key) return;

  const existing = targetMap.get(key);
  if (!existing) {
    targetMap.set(key, suggestion);
    return;
  }

  const preservedOrder = Math.min(
    Number.isFinite(existing?.orderIndex) ? existing.orderIndex : Infinity,
    Number.isFinite(suggestion?.orderIndex) ? suggestion.orderIndex : Infinity
  );

  if (shouldReplaceUpgradeSuggestion(existing, suggestion)) {
    const replacement = { ...suggestion };
    if (Number.isFinite(preservedOrder)) {
      replacement.orderIndex = preservedOrder;
    }
    targetMap.set(key, replacement);
    return;
  }

  if (Number.isFinite(preservedOrder)) {
    existing.orderIndex = preservedOrder;
  }
  targetMap.set(key, existing);
}

export function buildAssetUpgradeData(state) {
  if (!state) return [];

  const suggestionMap = new Map();
  let suggestionSequence = 0;

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
      const futureLevels = getSortedLevels(asset).filter(entry => entry.level > level);
      if (!futureLevels.length) return;

      const progress = quality.progress || {};

      const assetStateInstances = assetState.instances || [];
      const assetIndex = assetStateInstances.indexOf(instance);
      const label = instanceLabel(asset, assetIndex >= 0 ? assetIndex : 0);
      const performance = Math.max(0, clampNumber(instance.lastIncome));

      futureLevels.forEach(levelDef => {
        const requirements = Object.entries(levelDef.requirements || {});
        if (!requirements.length) return;

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

          const suggestion = {
            id: `asset-upgrade:${asset.id}:${instance.id}:${action.id}:${key}:L${levelDef.level}`,
            title: `${label} · ${buttonLabel}`,
            subtitle: `${remaining} ${requirementLabel} to go for Quality ${levelDef.level} (${percentRemaining}% to go).`,
            meta,
            buttonLabel,
            onClick: () => performQualityAction(asset.id, instance.id, action.id),
            performance,
            completion,
            remaining,
            level,
            targetLevel: levelDef.level,
            timeCost,
            remainingRuns,
            repeatable,
            cost: moneyCost,
            orderIndex: suggestionSequence++
          };

          const dedupeKey = `${asset.id}:${instance.id}:${action.id}:${key}`;
          mergeUpgradeSuggestion(suggestionMap, dedupeKey, suggestion);
        });
      });
    });
  }

  const suggestions = Array.from(suggestionMap.values());
  suggestions.sort((a, b) => {
    if (a.performance !== b.performance) {
      return a.performance - b.performance;
    }
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    const targetA = Number.isFinite(a?.targetLevel) ? a.targetLevel : Infinity;
    const targetB = Number.isFinite(b?.targetLevel) ? b.targetLevel : Infinity;
    if (targetA !== targetB) {
      return targetA - targetB;
    }
    if (a.completion !== b.completion) {
      return b.completion - a.completion;
    }
    if (a.remaining !== b.remaining) {
      return a.remaining - b.remaining;
    }
    const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : Infinity;
    const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : Infinity;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.title.localeCompare(b.title);
  });

  return suggestions;
}
