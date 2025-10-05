import { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS } from './actions/definitions.js';
import { rollDailyOffers, getAvailableOffers, getClaimedOffers } from './hustles/market.js';
import { getState } from '../core/state.js';
import { structuredClone } from '../core/helpers.js';
import {
  ensureHustleMarketState,
  claimHustleMarketOffer,
  getMarketOfferById,
  getMarketClaimedOffers
} from '../core/state/slices/hustleMarket.js';
import { definitionRequirementsMet } from './requirements/checks.js';
import { describeHustleRequirements } from './hustles/helpers.js';

export const HUSTLE_TEMPLATES = INSTANT_ACTIONS;
export const HUSTLES = HUSTLE_TEMPLATES;
export const KNOWLEDGE_HUSTLES = STUDY_ACTIONS;

export { ACTIONS, INSTANT_ACTIONS, STUDY_ACTIONS };
export { rollDailyOffers, getAvailableOffers, getClaimedOffers };

export * from './hustles/helpers.js';

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
  const marketState = ensureHustleMarketState(workingState, { fallbackDay: currentDay });
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
    rng
  });
}

const TEMPLATE_BY_ID = new Map(HUSTLE_TEMPLATES.map(template => [template.id, template]));

function resolveFirstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function resolveFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
  }
  return null;
}

function resolveOfferHours(offer, template) {
  const metadata = offer?.metadata || {};
  const requirements = typeof metadata.requirements === 'object' && metadata.requirements !== null
    ? metadata.requirements
    : {};
  return resolveFirstNumber(
    metadata.hoursRequired,
    requirements.hours,
    requirements.timeHours,
    metadata.timeHours,
    template?.time,
    template?.action?.timeCost
  );
}

function resolveOfferPayoutAmount(offer, template) {
  const metadata = offer?.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  return resolveFirstNumber(
    metadata.payoutAmount,
    payout.amount,
    template?.payout?.amount
  );
}

function resolveOfferPayoutSchedule(offer) {
  const metadata = offer?.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  return resolveFirstString(
    metadata.payoutSchedule,
    payout.schedule
  ) || 'onCompletion';
}

export function acceptHustleOffer(offerOrId, { state = getState() } = {}) {
  const workingState = state || getState();
  if (!workingState) {
    return null;
  }

  const fallbackDay = Math.max(1, Math.floor(Number(workingState.day) || 1));
  ensureHustleMarketState(workingState, { fallbackDay });

  let offer = null;
  if (offerOrId && typeof offerOrId === 'object') {
    offer = offerOrId;
  } else if (typeof offerOrId === 'string') {
    offer = getMarketOfferById(workingState, offerOrId, { day: fallbackDay });
  }

  if (!offer || !offer.id) {
    return null;
  }

  if (offer.claimed) {
    const claimed = getMarketClaimedOffers(workingState, { day: fallbackDay, includeExpired: true })
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

  const metadata = offer.metadata || {};
  const hoursRequired = resolveOfferHours(offer, template);
  const deadlineDay = Number.isFinite(Number(offer.expiresOnDay))
    ? Math.max(fallbackDay, Math.floor(Number(offer.expiresOnDay)))
    : null;
  const overrides = {};
  if (hoursRequired != null) {
    overrides.hoursRequired = hoursRequired;
  }
  if (deadlineDay != null) {
    overrides.deadlineDay = deadlineDay;
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
  const acceptedOnDay = Math.max(1, Math.floor(Number(workingState.day) || offer.availableOnDay || 1));

  const payoutDetails = { schedule: payoutSchedule };
  if (payoutAmount != null) {
    payoutDetails.amount = payoutAmount;
  }

  return claimHustleMarketOffer(workingState, offer.id, {
    acceptedOnDay,
    deadlineDay: deadlineDay ?? offer.availableOnDay,
    hoursRequired: hoursRequired != null ? hoursRequired : instance.hoursRequired,
    instanceId: instance.id,
    payout: payoutDetails,
    metadata
  });
}
