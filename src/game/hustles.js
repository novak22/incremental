import { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS } from './actions/definitions.js';
import { rollDailyOffers, getAvailableOffers, getClaimedOffers, getMarketRollAuditLog } from './hustles/market.js';
import { getState } from '../core/state.js';
import { structuredClone } from '../core/helpers.js';
import {
  resolveFirstNumber,
  resolveFirstString,
  resolveOfferHours,
  resolveOfferPayoutAmount,
  resolveOfferPayoutSchedule
} from './hustles/offerUtils.js';
import {
  ensureActionMarketCategoryState,
  claimActionMarketOffer,
  getActionMarketOfferById,
  getActionMarketClaimedOffers,
  releaseActionMarketOffer
} from '../core/state/slices/actionMarket/index.js';
import { definitionRequirementsMet } from './requirements/checks.js';
import { describeHustleRequirements } from './hustles/helpers.js';
import { markDirty } from '../core/events/invalidationBus.js';

export const HUSTLE_TEMPLATES = [...INSTANT_ACTIONS, ...STUDY_ACTIONS];
export const HUSTLES = HUSTLE_TEMPLATES;
export const KNOWLEDGE_HUSTLES = STUDY_ACTIONS;

const HUSTLE_ACTION_CATEGORY = 'hustle';

export { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS };
export { rollDailyOffers, getAvailableOffers, getClaimedOffers, getMarketRollAuditLog };

export * from './hustles/helpers.js';

export function releaseClaimedHustleOffer(identifiers, { state = getState() } = {}) {
  const workingState = state || getState();
  if (!workingState) {
    return false;
  }
  return releaseActionMarketOffer(workingState, HUSTLE_ACTION_CATEGORY, identifiers);
}

function clampDay(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const fallbackParsed = Number(fallback);
    if (!Number.isFinite(fallbackParsed) || fallbackParsed <= 0) {
      return 1;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

export function ensureDailyOffersForDay({
  state = getState(),
  templates = HUSTLE_TEMPLATES,
  day,
  now,
  rng
} = {}) {
  const workingState = state || getState();
  if (!workingState) {
    return [];
  }

  const currentDay = clampDay(day ?? workingState.day ?? 1, workingState.day ?? 1);
  const marketState = ensureActionMarketCategoryState(workingState, HUSTLE_ACTION_CATEGORY, { fallbackDay: currentDay });
  const hasOffers = Array.isArray(marketState.offers) && marketState.offers.length > 0;
  const rolledToday = marketState.lastRolledOnDay === currentDay;

  if (rolledToday && hasOffers) {
    return marketState.offers.map(offer => structuredClone(offer));
  }

  return rollDailyOffers({
    templates,
    day: currentDay,
    now,
    state: workingState,
    rng,
    category: HUSTLE_ACTION_CATEGORY
  });
}

const TEMPLATE_BY_ID = new Map(HUSTLE_TEMPLATES.map(template => [template.id, template]));

export function acceptHustleOffer(offerOrId, { state = getState() } = {}) {
  const workingState = state || getState();
  if (!workingState) {
    return null;
  }

  const fallbackDay = Math.max(1, Math.floor(Number(workingState.day) || 1));
  ensureActionMarketCategoryState(workingState, HUSTLE_ACTION_CATEGORY, { fallbackDay });

  let offer = null;
  if (offerOrId && typeof offerOrId === 'object') {
    offer = offerOrId;
  } else if (typeof offerOrId === 'string') {
    offer = getActionMarketOfferById(workingState, HUSTLE_ACTION_CATEGORY, offerOrId, { day: fallbackDay });
  }

  if (!offer || !offer.id) {
    return null;
  }

  if (offer.claimed) {
    const claimed = getActionMarketClaimedOffers(workingState, HUSTLE_ACTION_CATEGORY, { day: fallbackDay, includeExpired: true })
      .find(entry => entry.offerId === offer.id);
    return claimed || null;
  }

  let template = TEMPLATE_BY_ID.get(offer.templateId) || TEMPLATE_BY_ID.get(offer.definitionId);
  if (!template) {
    template = ACTIONS.find(definition => definition.id === offer.definitionId || definition.id === offer.templateId) || null;
    if (template) {
      TEMPLATE_BY_ID.set(template.id, template);
    }
  }

  if (!template) {
    return null;
  }

  if (!definitionRequirementsMet(template, workingState)) {
    return null;
  }

  const requirementDescriptors = describeHustleRequirements(template, workingState) || [];
  const unmetDescriptor = requirementDescriptors.find(entry => entry && entry.met === false);
  if (unmetDescriptor) {
    return null;
  }

  const metadata = structuredClone(offer.metadata || {});
  const acceptedOnDay = Math.max(1, Math.floor(Number(workingState.day) || offer.availableOnDay || 1));
  const hoursRequired = resolveOfferHours(offer, template);
  const overrides = {};
  if (hoursRequired != null) {
    overrides.hoursRequired = hoursRequired;
  }

  const progressMetadata = typeof metadata.progress === 'object' && metadata.progress !== null
    ? metadata.progress
    : {};
  const progressOverrides = {};

  const resolvedHoursPerDay = resolveFirstNumber(
    metadata.hoursPerDay,
    progressMetadata.hoursPerDay
  );
  if (resolvedHoursPerDay != null && resolvedHoursPerDay > 0) {
    progressOverrides.hoursPerDay = resolvedHoursPerDay;
  }

  const resolvedDaysRequired = resolveFirstNumber(
    metadata.daysRequired,
    progressMetadata.daysRequired
  );
  if (resolvedDaysRequired != null && resolvedDaysRequired > 0) {
    progressOverrides.daysRequired = Math.max(1, Math.floor(resolvedDaysRequired));
  }

  const resolvedCompletion = resolveFirstString(
    metadata.completionMode,
    progressMetadata.completionMode,
    progressMetadata.completion
  );
  const completionMode = resolvedCompletion || resolveFirstString(
    metadata.completionMode,
    progressMetadata.completionMode,
    progressMetadata.completion
  );
  if (completionMode) {
    progressOverrides.completion = completionMode;
  }

  const resolvedProgressLabel = resolveFirstString(
    metadata.progressLabel,
    progressMetadata.label
  );
  if (resolvedProgressLabel) {
    progressOverrides.label = resolvedProgressLabel;
  }

  const resolvedOfferDeadline = Number.isFinite(Number(offer.expiresOnDay))
    ? Math.max(fallbackDay, Math.floor(Number(offer.expiresOnDay)))
    : null;

  const normalizedDaysRequired = progressOverrides.daysRequired
    ?? (Number.isFinite(resolvedDaysRequired) && resolvedDaysRequired > 0
      ? Math.max(1, Math.floor(resolvedDaysRequired))
      : null);

  let deadlineDay = resolvedOfferDeadline;
  if (normalizedDaysRequired != null && normalizedDaysRequired > 1) {
    deadlineDay = acceptedOnDay + normalizedDaysRequired - 1;
  }

  if (deadlineDay != null) {
    overrides.deadlineDay = deadlineDay;
    progressOverrides.deadlineDay = deadlineDay;

    const progressContainer = typeof metadata.progress === 'object' && metadata.progress !== null
      ? metadata.progress
      : (metadata.progress = {});
    progressContainer.deadlineDay = deadlineDay;

    if (typeof metadata.enrollment === 'object' && metadata.enrollment !== null) {
      metadata.enrollment.deadlineDay = deadlineDay;
    }
  }

  if (Object.keys(progressOverrides).length) {
    overrides.progress = {
      ...overrides.progress,
      ...progressOverrides
    };
  }

  if (typeof template.acceptInstance !== 'function') {
    return null;
  }

  const instance = template.acceptInstance({
    state: workingState,
    metadata,
    overrides
  });

  if (!instance) {
    return null;
  }

  if (instance.progress && typeof instance.progress === 'object') {
    if (progressOverrides.hoursPerDay != null) {
      instance.progress.hoursPerDay = progressOverrides.hoursPerDay;
    }
    if (progressOverrides.daysRequired != null) {
      instance.progress.daysRequired = progressOverrides.daysRequired;
    }
    if (completionMode) {
      instance.progress.completion = completionMode;
      instance.progress.completionMode = completionMode;
    }
    if (progressOverrides.label && !instance.progress.label) {
      instance.progress.label = progressOverrides.label;
    }
  }

  const payoutAmount = resolveOfferPayoutAmount(offer, template);
  const payoutSchedule = resolveOfferPayoutSchedule(offer);
  const payoutDetails = { schedule: payoutSchedule };
  if (payoutAmount != null) {
    payoutDetails.amount = payoutAmount;
  }

  const acceptedEntry = claimActionMarketOffer(workingState, HUSTLE_ACTION_CATEGORY, offer.id, {
    acceptedOnDay,
    deadlineDay: deadlineDay ?? offer.availableOnDay,
    hoursRequired: hoursRequired != null ? hoursRequired : instance.hoursRequired,
    instanceId: instance.id,
    payout: payoutDetails,
    metadata
  });

  if (acceptedEntry) {
    markDirty({
      dashboard: true,
      cards: true,
      headerAction: true
    });
  }

  return acceptedEntry;
}
