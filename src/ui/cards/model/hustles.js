import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';
import { getAvailableOffers, getClaimedOffers, acceptHustleOffer, rollDailyOffers } from '../../../game/hustles.js';
import { collectOutstandingActionEntries } from '../../actions/registry.js';

function resolveOfferHours(offer, definition) {
  if (!offer) return 0;
  const metadata = offer.metadata || {};
  const requirements = typeof metadata.requirements === 'object' && metadata.requirements !== null
    ? metadata.requirements
    : {};
  const candidates = [
    metadata.hoursRequired,
    requirements.hours,
    requirements.timeHours,
    definition?.time,
    definition?.action?.timeCost
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return 0;
}

function resolveOfferPayout(offer, definition) {
  if (!offer) return 0;
  const metadata = offer.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  const candidates = [metadata.payoutAmount, payout.amount, definition?.payout?.amount];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return 0;
}

function resolveOfferSchedule(offer) {
  if (!offer) return 'onCompletion';
  const metadata = offer.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  return metadata.payoutSchedule || payout.schedule || 'onCompletion';
}

function describeOfferMeta({
  offer,
  definition,
  currentDay,
  formatHoursFn,
  formatMoneyFn
}) {
  const hours = resolveOfferHours(offer, definition);
  const payout = resolveOfferPayout(offer, definition);
  const schedule = resolveOfferSchedule(offer);
  const metadata = offer?.metadata || {};
  const progressMetadata = typeof metadata.progress === 'object' && metadata.progress !== null
    ? metadata.progress
    : {};
  const hoursPerDayCandidates = [
    metadata.hoursPerDay,
    progressMetadata.hoursPerDay
  ];
  let hoursPerDay = null;
  for (const value of hoursPerDayCandidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      hoursPerDay = numeric;
      break;
    }
  }
  const daysRequiredCandidates = [
    metadata.daysRequired,
    progressMetadata.daysRequired
  ];
  let daysRequired = null;
  for (const value of daysRequiredCandidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      daysRequired = Math.max(1, Math.floor(numeric));
      break;
    }
  }
  const completionCandidates = [
    metadata.completionMode,
    progressMetadata.completionMode,
    progressMetadata.completion
  ];
  let completionMode = null;
  for (const candidate of completionCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      completionMode = candidate.trim();
      break;
    }
  }
  const progressLabel = typeof metadata.progressLabel === 'string' && metadata.progressLabel.trim()
    ? metadata.progressLabel.trim()
    : typeof progressMetadata.label === 'string' && progressMetadata.label.trim()
      ? progressMetadata.label.trim()
      : null;
  const availableIn = Number.isFinite(offer.availableOnDay)
    ? Math.max(0, Math.floor(offer.availableOnDay) - currentDay)
    : 0;
  const expiresIn = Number.isFinite(offer.expiresOnDay)
    ? Math.max(0, Math.floor(offer.expiresOnDay) - currentDay + 1)
    : null;

  const parts = [];
  if (availableIn > 0) {
    parts.push(`Opens in ${availableIn} day${availableIn === 1 ? '' : 's'}`);
  } else {
    parts.push('Available now');
  }

  if (hours > 0) {
    parts.push(`${formatHoursFn(hours)} focus`);
  }

  if (Number.isFinite(hoursPerDay) && hoursPerDay > 0) {
    if (Number.isFinite(daysRequired) && daysRequired > 0) {
      parts.push(`${formatHoursFn(hoursPerDay)}/day for ${daysRequired} day${daysRequired === 1 ? '' : 's'}`);
    } else {
      parts.push(`${formatHoursFn(hoursPerDay)}/day commitment`);
    }
  }

  if (payout > 0) {
    const payoutLabel = `$${formatMoneyFn(payout)}`;
    if (!schedule || schedule === 'onCompletion') {
      parts.push(`${payoutLabel} on completion`);
    } else if (schedule === 'daily') {
      parts.push(`${payoutLabel} / day`);
    } else {
      parts.push(`${payoutLabel} • ${schedule}`);
    }
  }

  if (completionMode === 'manual') {
    parts.push('Manual completion');
  }

  if (expiresIn != null) {
    parts.push(`Expires in ${expiresIn} day${expiresIn === 1 ? '' : 's'}`);
  }

  return {
    hours,
    payout,
    schedule,
    hoursPerDay,
    daysRequired,
    completionMode,
    progressLabel,
    availableIn,
    expiresIn,
    summary: parts.join(' • ')
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

  return definitions.map(definition => {
    const time = Number(definition.time || definition.action?.timeCost) || 0;
    const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
    const roi = time > 0 ? payout / time : payout;
    const searchPieces = [definition.name, definition.description].filter(Boolean).join(' ');
    const search = searchPieces.toLowerCase();

    const requirements = (describeRequirements?.(definition, state) || []).map(req => ({ ...req }));
    const requirementSummary = requirements.length
      ? requirements.map(req => `${req.label} ${req.met ? '✓' : '•'}`).join('  ')
      : 'No requirements';

    const usage = getUsage?.(definition, state) || null;
    const limitSummary = usage
      ? usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Daily limit reached for today. Resets tomorrow.'
      : '';

    const templateOffers = offersByTemplate.get(definition.id) || [];
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

    const readyOffers = [];
    const upcomingOffers = [];
    sortedOffers.forEach(offer => {
      const meta = describeOfferMeta({
        offer,
        definition,
        currentDay,
        formatHoursFn,
        formatMoneyFn
      });
      const ready = meta.availableIn <= 0;
      const entry = {
        id: offer.id,
        label: offer?.variant?.label || definition.name || offer.templateId,
        description: offer?.variant?.description || '',
        meta: meta.summary,
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
        onAccept: () => acceptOffer(offer.id, { state })
      };
      if (ready) {
        readyOffers.push(entry);
      } else {
        upcomingOffers.push(entry);
      }
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
      progress: entry.progress || null
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
        }
      });
    });

    const primaryOffer = readyOffers[0] || upcomingOffers[0] || null;

    let actionConfig = null;

    if (primaryOffer) {
      const ready = primaryOffer.ready;
      if (ready) {
        actionConfig = {
          label: `Accept ${primaryOffer.label}`,
          disabled: false,
          className: 'primary',
          onClick: primaryOffer.onAccept,
          guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
        };
      } else {
        const daysText = primaryOffer.availableIn === 1 ? '1 day' : `${primaryOffer.availableIn} days`;
        actionConfig = {
          label: `Opens in ${daysText}`,
          disabled: true,
          className: 'primary',
          onClick: null,
          guidance: 'Next wave of offers unlocks tomorrow. Line up your prep and check back after the reset.'
        };
      }
    } else if (typeof rollOffers === 'function') {
      const rerollLabel = definition.market?.manualRerollLabel || 'Roll a fresh offer';
      const rerollGuidance = definition.market?.manualRerollHelp || 'Spin up a new lead if you can\'t wait for tomorrow.';
      actionConfig = {
        label: rerollLabel,
        disabled: false,
        className: 'secondary',
        onClick: () => rollOffers({ templates: [definition], day: currentDay, state }),
        guidance: rerollGuidance
      };
    } else {
      const emptyLabel = definition.market?.emptyActionLabel || 'Check back tomorrow';
      const emptyGuidance = definition.market?.emptyGuidance || 'Fresh leads roll in with tomorrow\'s market refresh.';
      actionConfig = {
        label: emptyLabel,
        disabled: true,
        className: 'secondary',
        onClick: null,
        guidance: emptyGuidance
      };
    }

    const badges = [`${formatHoursFn(time)} time`];
    if (payout > 0) {
      badges.push(`$${formatMoneyFn(payout)} payout`);
    }
    if (definition.tag?.label) {
      badges.push(definition.tag.label);
    }
    if (commitments.length) {
      badges.push(`${commitments.length} active`);
    }
    if (upcomingOffers.length) {
      badges.push(`${upcomingOffers.length} queued`);
    }

    const available = Boolean(readyOffers.length);

    return {
      id: definition.id,
      name: definition.name || definition.id,
      description: definition.description || '',
      tag: definition.tag || null,
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
      action: actionConfig,
      available,
      offers: readyOffers,
      upcoming: upcomingOffers,
      commitments,
      filters: {
        search,
        time,
        payout,
        roi,
        available,
        limitRemaining: usage ? usage.remaining : null,
        tag: definition.tag?.label || ''
      }
    };
  });
}
