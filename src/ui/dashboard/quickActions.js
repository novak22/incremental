import { formatHours } from '../../core/helpers.js';
import { clampNumber } from './formatters.js';
import { collectOutstandingActionEntries } from '../actions/registry.js';
import { registerActionProvider } from '../actions/providers.js';
import { executeAction } from '../../game/actions.js';
import { acceptHustleOffer } from '../../game/hustles.js';
import {
  extractQuickActionCandidates,
  buildAssetUpgradeData
} from './quickActions/data.js';
import {
  ensureQuickActionEntries,
  sortQuickActions
} from './quickActions/filters.js';
import { buildQuickActionHints, createEmptyQuickActionEntry } from './quickActions/hints.js';

function buildQuickActionEntry(candidate) {
  const hints = buildQuickActionHints(candidate);
  const workingState = candidate?.state || {};
  const offer = candidate?.primaryOffer;

  return {
    id: candidate?.id,
    groupId: candidate?.groupId,
    offerIds: candidate?.offerIds || [],
    label: hints.label,
    primaryLabel: hints.primaryLabel,
    description: hints.description,
    onClick: () => {
      if (!offer) {
        return null;
      }
      let result = null;
      const offerId = offer?.id || offer;
      executeAction(() => {
        result = acceptHustleOffer(offerId, { state: workingState });
      });
      return result;
    },
    roi: candidate?.roi ?? 0,
    timeCost: candidate?.hours ?? 0,
    payout: candidate?.payout ?? 0,
    payoutText: hints.payoutText,
    durationHours: candidate?.hours ?? 0,
    durationText: hints.durationText,
    meta: hints.meta,
    repeatable: hints.repeatable,
    remainingRuns: candidate?.remainingRuns ?? 0,
    remainingDays: candidate?.remainingDays ?? null,
    schedule: candidate?.schedule,
    offer,
    excludeFromQueue: true,
    disabled: hints.disabled,
    disabledReason: hints.disabledReason,
    focusCategory: hints.focusCategory,
    focusBucket: hints.focusBucket
  };
}

export function buildQuickActions(state) {
  const candidates = extractQuickActionCandidates(state);
  const entries = candidates.map(buildQuickActionEntry);
  const hydrated = ensureQuickActionEntries(entries, { fallbackFactory: createEmptyQuickActionEntry });
  return sortQuickActions(hydrated);
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
  return buildAssetUpgradeData(state);
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
    disabledReason: action.disabledReason,
    excludeFromQueue: action.excludeFromQueue === true
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
