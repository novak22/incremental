import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';
import { getAvailableOffers, getClaimedOffers, acceptHustleOffer, rollDailyOffers } from '../../../game/hustles.js';
import { executeAction } from '../../../game/actions.js';
import { collectOutstandingActionEntries } from '../../actions/outstanding/index.js';
import { describeHustleOfferMeta, describeSeatAvailability } from '../../hustles/offerHelpers.js';
import { describeRequirementGuidance } from '../../hustles/requirements.js';

function normalizeCategory(value, fallback = 'action') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.toLowerCase();
}

function formatCategoryLabel(value) {
  if (!value) {
    return 'Action';
  }
  const parts = value
    .split(/[\s:_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));
  return parts.length ? parts.join(' ') : 'Action';
}

function buildDescriptorCopy(categoryLabel) {
  const noun = (categoryLabel || 'action').toLowerCase();
  return {
    ready: {
      title: 'Ready to accept',
      description: `Step 1 • Accept: Claim your next ${noun} and move it into your active worklist.`
    },
    upcoming: {
      title: 'Queued for later',
      description: `These ${noun} leads unlock with tomorrow's refresh. Prep so you can accept quickly.`
    },
    commitments: {
      title: 'In progress',
      description: `Step 2 • Work: Log hours until this ${noun} is complete.`
    }
  };
}

function cloneDescriptorCopy(copy = {}) {
  const next = {};
  Object.entries(copy || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      next[key] = { ...value };
    } else {
      next[key] = value;
    }
  });
  return next;
}

function cloneDescriptors(descriptors = {}) {
  if (!descriptors || typeof descriptors !== 'object') {
    return {};
  }
  const { copy, ...rest } = descriptors;
  return {
    ...rest,
    copy: cloneDescriptorCopy(copy)
  };
}

function cloneRequirementItems(source = {}) {
  const summary = typeof source.summary === 'string' ? source.summary : '';
  const items = Array.isArray(source.items)
    ? source.items.map(item => (item && typeof item === 'object' ? { ...item } : item))
    : [];
  return { summary, items };
}

function cloneCommitment(entry = {}) {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }
  const cloned = { ...entry };
  if (entry.progress && typeof entry.progress === 'object') {
    cloned.progress = { ...entry.progress };
  }
  return cloned;
}

function cloneCommitments(list = []) {
  return (Array.isArray(list) ? list : []).map(cloneCommitment);
}

function cloneMetrics(metrics = {}) {
  if (!metrics || typeof metrics !== 'object') {
    return {};
  }
  const cloned = { ...metrics };
  if (metrics.time && typeof metrics.time === 'object') {
    cloned.time = { ...metrics.time };
  }
  if (metrics.payout && typeof metrics.payout === 'object') {
    cloned.payout = { ...metrics.payout };
  }
  return cloned;
}

function cloneLimit(limit) {
  if (!limit || typeof limit !== 'object') {
    return limit ?? null;
  }
  return { ...limit };
}

function cloneSeat(seat) {
  if (!seat || typeof seat !== 'object') {
    return seat ?? null;
  }
  return { ...seat };
}

function cloneFilters(filters = {}) {
  return { ...(filters || {}) };
}

function cloneTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }
  return tags.map(tag => (tag && typeof tag === 'object' ? { ...tag } : tag));
}

function cloneBaseModel(base = {}) {
  return {
    ...base,
    descriptors: cloneDescriptors(base.descriptors),
    requirements: cloneRequirementItems(base.requirements),
    commitments: cloneCommitments(base.commitments),
    badges: Array.isArray(base.badges) ? [...base.badges] : [],
    filters: cloneFilters(base.filters),
    metrics: cloneMetrics(base.metrics),
    limit: cloneLimit(base.limit),
    seat: cloneSeat(base.seat),
    labels: base.labels && typeof base.labels === 'object' ? { ...base.labels } : base.labels,
    tags: cloneTags(base.tags)
  };
}

function buildOfferActionConfig(offer = {}, {
  requirementGuidance = '',
  readyGuidance = '',
  waitingGuidance = ''
} = {}) {
  if (!offer) {
    return null;
  }
  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked;

  if (locked) {
    const lockedLabel = offer.lockedLabel || `Locked — ${offer.label || 'Offer'}`;
    const guidance = requirementGuidance || offer.unlockHint || '';
    return {
      label: lockedLabel,
      disabled: true,
      className: 'primary',
      onClick: null,
      guidance: guidance || undefined
    };
  }

  if (ready) {
    return {
      label: `Accept ${offer.label || 'Offer'}`,
      disabled: false,
      className: 'primary',
      onClick: typeof offer.onAccept === 'function' ? offer.onAccept : null,
      guidance: readyGuidance || undefined
    };
  }

  const availableIn = Number.isFinite(offer.availableIn) ? offer.availableIn : null;
  const daysText = availableIn === 1 ? '1 day' : `${availableIn} days`;
  return {
    label: availableIn && availableIn > 0 ? `Opens in ${daysText}` : 'Opens soon',
    disabled: true,
    className: 'primary',
    onClick: null,
    guidance: waitingGuidance || undefined
  };
}

function buildPlaceholderAction({
  definition = {},
  state,
  currentDay,
  executeActionFn,
  rollOffers,
  rerollGuidance,
  emptyGuidance
} = {}) {
  if (typeof rollOffers === 'function') {
    const rerollLabel = definition.market?.manualRerollLabel || 'Roll a fresh offer';
    const guidance = definition.market?.manualRerollHelp || rerollGuidance;
    return {
      label: rerollLabel,
      disabled: false,
      className: 'secondary',
      onClick: () => {
        if (typeof executeActionFn === 'function') {
          executeActionFn(() => {
            rollOffers({ templates: [definition], day: currentDay, state });
          });
        } else {
          rollOffers({ templates: [definition], day: currentDay, state });
        }
      },
      guidance: guidance || undefined
    };
  }

  const emptyLabel = definition.market?.emptyActionLabel || 'Check back tomorrow';
  const guidance = definition.market?.emptyGuidance || emptyGuidance;
  return {
    label: emptyLabel,
    disabled: true,
    className: 'secondary',
    onClick: null,
    guidance: guidance || undefined
  };
}

export default function buildHustleModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    describeRequirements = describeHustleRequirements,
    getUsage = getHustleDailyUsage,
    formatHours: formatHoursFn = formatHours,
    formatMoney: formatMoneyFn = formatMoney,
    getOffers = getAvailableOffers,
    getAcceptedOffers = getClaimedOffers,
    acceptOffer = acceptHustleOffer,
    executeAction: executeActionFn = executeAction,
    collectCommitments = collectOutstandingActionEntries,
    rollOffers = rollDailyOffers
  } = helpers;

  const state = getStateFn();

  const currentDay = Math.max(1, Number(state?.day) || 1);
  const offerList = getOffers(state, { day: currentDay, includeUpcoming: true, includeClaimed: false }) || [];
  const offersByTemplate = new Map();
  offerList.forEach(offer => {
    if (!offer) return;
    const templateId = offer.templateId;
    if (templateId) {
      if (!offersByTemplate.has(templateId)) {
        offersByTemplate.set(templateId, []);
      }
      offersByTemplate.get(templateId).push(offer);
    }
    const definitionId = offer.definitionId;
    if (definitionId && definitionId !== templateId) {
      if (!offersByTemplate.has(definitionId)) {
        offersByTemplate.set(definitionId, []);
      }
      offersByTemplate.get(definitionId).push(offer);
    }
  });

  const outstandingEntries = collectCommitments(state) || [];
  const commitmentsByDefinition = new Map();
  outstandingEntries.forEach(entry => {
    const definitionId = entry?.progress?.definitionId || entry?.definitionId;
    if (!definitionId) return;
    if (!commitmentsByDefinition.has(definitionId)) {
      commitmentsByDefinition.set(definitionId, []);
    }
    commitmentsByDefinition.get(definitionId).push(entry);
  });

  const acceptedList = getAcceptedOffers(state, { day: currentDay, includeExpired: false }) || [];
  const acceptedByDefinition = new Map();
  acceptedList.forEach(entry => {
    const definitionId = entry?.definitionId || entry?.templateId;
    if (!definitionId) return;
    if (!acceptedByDefinition.has(definitionId)) {
      acceptedByDefinition.set(definitionId, []);
    }
    acceptedByDefinition.get(definitionId).push(entry);
  });

  const models = [];

  definitions.forEach(definition => {
    if (!definition) return;
    const templateOffers = offersByTemplate.get(definition.id) || [];
    const resolvedCategory = (() => {
      const explicit = definition.market?.category;
      if (typeof explicit === 'string' && explicit.trim()) {
        return explicit.trim();
      }
      const offerWithCategory = templateOffers.find(offer => typeof offer?.templateCategory === 'string' && offer.templateCategory.trim());
      if (offerWithCategory) {
        return offerWithCategory.templateCategory.trim();
      }
      return '';
    })();
    const normalizedCategory = normalizeCategory(
      definition.category ?? definition.market?.category ?? resolvedCategory,
      'hustle'
    );
    const baseDescriptors = typeof definition.descriptors === 'object' && definition.descriptors !== null
      ? { ...definition.descriptors }
      : {};
    const descriptorCategory = normalizeCategory(baseDescriptors.category ?? normalizedCategory, normalizedCategory);
    const categoryLabel = formatCategoryLabel(baseDescriptors.categoryLabel || descriptorCategory);
    const descriptorCopy = buildDescriptorCopy(categoryLabel);
    const descriptors = {
      ...baseDescriptors,
      category: descriptorCategory,
      categoryLabel,
      copy: {
        ...descriptorCopy,
        ...(baseDescriptors.copy || {})
      }
    };
    const actionCategory = descriptors.category || normalizedCategory;
    const categoryNoun = (descriptors.categoryLabel || 'Action').toLowerCase();
    const defaultReadyGuidance = `Step 1 • Accept: Claim your next ${categoryNoun} and move it into your active worklist.`;
    const defaultWaitingGuidance = `Next wave unlocks tomorrow. Prep now so you're ready to accept and start logging progress.`;
    const defaultRerollGuidance = `Need something now? Roll a fresh ${categoryNoun} and keep the accept → work → complete loop moving.`;
    const defaultEmptyGuidance = `Fresh leads roll in with tomorrow's refresh. Accept the next ${categoryNoun} to keep momentum.`;

    const time = Number(definition.time || definition.action?.timeCost) || 0;
    const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
    const roi = time > 0 ? payout / time : payout;
    const searchPieces = [definition.name, definition.description].filter(Boolean).join(' ');
    const search = searchPieces.toLowerCase();

    const requirements = (describeRequirements?.(definition, state) || []).map(req => ({ ...req }));
    const unmetRequirements = requirements.filter(req => req && req.met === false);
    const requirementsMet = unmetRequirements.length === 0;
    const requirementGuidance = describeRequirementGuidance(unmetRequirements);
    const requirementSummary = requirements.length
      ? requirements.map(req => `${req.label} ${req.met ? '✓' : '•'}`).join('  ')
      : 'No requirements';

    const usage = getUsage?.(definition, state) || null;
    const limitSummary = usage
      ? usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Daily limit reached for today. Resets tomorrow.'
      : '';
    const sortedOffers = [...templateOffers].sort((a, b) => {
      const availableA = Number.isFinite(a?.availableOnDay) ? a.availableOnDay : Infinity;
      const availableB = Number.isFinite(b?.availableOnDay) ? b.availableOnDay : Infinity;
      if (availableA !== availableB) {
        return availableA - availableB;
      }
      const expiresA = Number.isFinite(a?.expiresOnDay) ? a.expiresOnDay : Infinity;
      const expiresB = Number.isFinite(b?.expiresOnDay) ? b.expiresOnDay : Infinity;
      return expiresA - expiresB;
    });

    const offerEntries = sortedOffers.map(offer => {
      const meta = describeHustleOfferMeta({
        offer,
        definition,
        currentDay,
        formatHoursFn,
        formatMoneyFn
      });
      const ready = meta.availableIn <= 0 && requirementsMet;
      const seatSummary = describeSeatAvailability({
        seatPolicy: meta.seatPolicy,
        seatsAvailable: meta.seatsAvailable
      });
      const metaSummary = [meta.summary, seatSummary].filter(Boolean).join(' • ');
      return {
        id: offer.id,
        label: offer?.variant?.label || definition.name || offer.templateId,
        description: offer?.variant?.description || '',
        meta: requirementsMet
          ? metaSummary
          : [requirementGuidance, metaSummary].filter(Boolean).join(' • '),
        hours: meta.hours,
        payout: meta.payout,
        schedule: meta.schedule,
        hoursPerDay: meta.hoursPerDay,
        daysRequired: meta.daysRequired,
        completionMode: meta.completionMode,
        progressLabel: meta.progressLabel,
        availableIn: meta.availableIn,
        expiresIn: meta.expiresIn,
        ready,
        locked: !requirementsMet,
        unlockHint: requirementGuidance,
        seatsAvailable: meta.seatsAvailable,
        seatPolicy: meta.seatPolicy,
        seatSummary,
        category: offer.templateCategory || resolvedCategory || '',
        onAccept: requirementsMet
          ? () => {
              let result = null;
              executeActionFn(() => {
                result = acceptOffer(offer.id, { state });
              });
              return result;
            }
          : null
      };
    });

    const aggregatedSeatPolicy = (() => {
      const activeEntry = offerEntries.find(entry => entry.seatPolicy);
      if (activeEntry?.seatPolicy) {
        return activeEntry.seatPolicy;
      }
      const metaPolicy = definition?.market?.metadata?.seatPolicy;
      return typeof metaPolicy === 'string' && metaPolicy.trim() ? metaPolicy.trim() : null;
    })();

    const aggregatedSeats = offerEntries.reduce((total, entry) => {
      const seats = Number(entry?.seatsAvailable);
      if (!Number.isFinite(seats) || seats <= 0) {
        return total;
      }
      return total + Math.floor(seats);
    }, 0);

    const seatSummary = describeSeatAvailability({
      seatPolicy: aggregatedSeatPolicy,
      seatsAvailable: Number.isFinite(aggregatedSeats) ? aggregatedSeats : null
    });

    const outstandingForDefinition = commitmentsByDefinition.get(definition.id) || [];
    const commitments = outstandingForDefinition.map(entry => ({
      id: entry.id,
      label: entry.title,
      description: entry.subtitle || '',
      meta: entry.meta || '',
      payoutText: entry.payoutText || '',
      payout: entry.payout,
      remainingDays: entry.progress?.remainingDays ?? null,
      deadlineDay: entry.progress?.deadlineDay ?? null,
      hoursRemaining: entry.progress?.hoursRemaining ?? null,
      hoursLogged: entry.progress?.hoursLogged ?? null,
      hoursRequired: entry.progress?.hoursRequired ?? null,
      percentComplete: entry.progress?.percentComplete ?? null,
      progress: entry.progress || null,
      category: entry.progress?.templateCategory || entry.templateCategory || resolvedCategory || ''
    }));

    const acceptedForDefinition = acceptedByDefinition.get(definition.id) || [];
    acceptedForDefinition.forEach(entry => {
      if (entry?.status === 'complete') {
        return;
      }
      const instanceId = entry?.instanceId;
      const exists = commitments.some(commitment => commitment?.progress?.instanceId === instanceId);
      if (exists) {
        return;
      }
      const remainingDays = Number.isFinite(entry?.deadlineDay)
        ? Math.max(0, Math.floor(entry.deadlineDay) - currentDay + 1)
        : null;
      commitments.push({
        id: entry?.id || `accepted:${entry?.offerId}`,
        label: entry?.metadata?.label || definition.name || 'Accepted hustle',
        description: entry?.metadata?.description || '',
        meta: remainingDays != null ? `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining` : '',
        payoutText: Number.isFinite(entry?.payout?.amount)
          ? `$${formatMoneyFn(entry.payout.amount)} on completion`
          : '',
        payout: entry?.payout?.amount,
        remainingDays,
        deadlineDay: entry?.deadlineDay ?? null,
        hoursRemaining: Number.isFinite(entry?.hoursRequired) ? entry.hoursRequired : null,
        hoursLogged: null,
        hoursRequired: Number.isFinite(entry?.hoursRequired) ? entry.hoursRequired : null,
        percentComplete: null,
        progress: {
          definitionId: definition.id,
          instanceId,
          remainingDays,
          deadlineDay: entry?.deadlineDay ?? null,
          hoursRemaining: Number.isFinite(entry?.hoursRequired) ? entry.hoursRequired : null,
          hoursRequired: Number.isFinite(entry?.hoursRequired) ? entry.hoursRequired : null,
          percentComplete: null
        },
        category: entry?.templateCategory || resolvedCategory || ''
      });
    });

    const templateKind = definition.templateKind || definition.type || null;

    const badges = [`${formatHoursFn(time)} time`];
    if (payout > 0) {
      badges.push(`$${formatMoneyFn(payout)} payout`);
    }
    if (definition.tag?.label) {
      badges.push(definition.tag.label);
    }
    if (actionCategory) {
      badges.push(`${descriptors.categoryLabel} track`);
    }
    const resolvedCategoryLabel = resolvedCategory
      ? resolvedCategory
          .split(/[\s:_-]+/)
          .filter(Boolean)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : '';
    if (resolvedCategoryLabel && resolvedCategoryLabel !== descriptors.categoryLabel) {
      badges.push(`${resolvedCategoryLabel} market`);
    }

    const baseFilters = {
      search,
      time,
      payout,
      roi,
      available: offerEntries.some(entry => entry.ready && !entry.locked),
      limitRemaining: usage ? usage.remaining : null,
      tag: definition.tag?.label || '',
      category: actionCategory || '',
      actionCategory: actionCategory || '',
      categoryLabel: descriptors.categoryLabel || '',
      templateKind: templateKind || '',
      marketCategory: resolvedCategory || ''
    };

    const baseModel = {
      id: definition.id,
      definitionId: definition.id,
      hustleId: definition.id,
      hustleLabel: definition.name || definition.id,
      name: definition.name || definition.id,
      description: definition.description || '',
      tag: definition.tag || null,
      templateKind,
      actionCategory,
      category: resolvedCategory || '',
      categoryLabel: descriptors.categoryLabel,
      descriptors,
      labels: {
        category: descriptors.categoryLabel
      },
      metrics: {
        time: { value: time, label: formatHoursFn(time) },
        payout: { value: payout, label: payout > 0 ? `$${formatMoneyFn(payout)}` : '' },
        roi
      },
      badges,
      requirements: {
        summary: requirementSummary,
        items: requirements
      },
      limit: usage
        ? {
            ...usage,
            summary: limitSummary,
            exhausted: usage.remaining <= 0
          }
        : null,
      action: null,
      available: baseFilters.available,
      status: baseFilters.available ? 'ready' : 'upcoming',
      offer: null,
      commitments,
      filters: baseFilters,
      seat: seatSummary
        ? {
            policy: aggregatedSeatPolicy,
            available: aggregatedSeats,
            summary: seatSummary
          }
        : null,
      expiresIn: null,
      tags: Array.isArray(definition.tags) ? [...definition.tags] : undefined
    };

    const perOfferModels = offerEntries.map((entry, index) => {
      const clone = cloneBaseModel(baseModel);
      clone.id = entry.id || `${definition.id}::${index}`;
      clone.offerId = entry.id || null;
      clone.offer = { ...entry };
      clone.status = entry.ready ? 'ready' : 'upcoming';
      clone.available = Boolean(entry.ready) && !entry.locked;
      clone.filters.available = clone.available;
      clone.action = buildOfferActionConfig(entry, {
        requirementGuidance,
        readyGuidance: defaultReadyGuidance,
        waitingGuidance: defaultWaitingGuidance
      });
      if (clone.action && requirementGuidance && !clone.action.guidance) {
        clone.action = { ...clone.action, guidance: requirementGuidance };
      }
      if (entry.seatSummary) {
        clone.seat = {
          policy: entry.seatPolicy,
          available: Number.isFinite(entry.seatsAvailable) ? entry.seatsAvailable : null,
          summary: entry.seatSummary
        };
      }
      clone.expiresIn = Number.isFinite(entry.expiresIn) ? entry.expiresIn : null;
      return clone;
    });

    if (perOfferModels.length > 0) {
      perOfferModels.forEach(model => {
        models.push(model);
      });
    } else {
      const placeholderAction = buildPlaceholderAction({
        definition,
        state,
        currentDay,
        executeActionFn,
        rollOffers,
        rerollGuidance: defaultRerollGuidance,
        emptyGuidance: defaultEmptyGuidance
      });
      if (commitments.length || baseModel.description || placeholderAction) {
        const placeholder = cloneBaseModel(baseModel);
        placeholder.id = `${definition.id}::placeholder`;
        placeholder.offer = null;
        placeholder.status = 'placeholder';
        placeholder.available = false;
        placeholder.filters.available = false;
        placeholder.action = placeholderAction || null;
        if (placeholder.action && requirementGuidance && !placeholder.action.guidance) {
          placeholder.action = { ...placeholder.action, guidance: requirementGuidance };
        }
        placeholder.expiresIn = null;
        models.push(placeholder);
      }
    }
  });

  return models;
}
