import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';
import { getAvailableOffers, getClaimedOffers, acceptHustleOffer, rollDailyOffers } from '../../../game/hustles.js';
import { executeAction } from '../../../game/actions.js';
import { collectOutstandingActionEntries } from '../../actions/outstanding/index.js';
import { describeHustleOfferMeta, describeSeatAvailability } from '../../hustles/offerHelpers.js';
import { describeRequirementGuidance } from '../../hustles/requirements.js';

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

  return definitions.map(definition => {
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

    const readyOffers = offerEntries.filter(entry => entry.ready);
    const upcomingOffers = offerEntries.filter(entry => !entry.ready);

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

    const primaryOffer = readyOffers[0] || upcomingOffers[0] || null;

    let actionConfig = null;

    if (primaryOffer) {
      const locked = Boolean(primaryOffer.locked);
      const ready = Boolean(primaryOffer.ready) && !locked;

      if (locked) {
        const lockedLabel = `Locked — ${primaryOffer.label}`;
        const lockedGuidance = requirementGuidance || primaryOffer.unlockHint || '';
        actionConfig = {
          label: lockedLabel,
          disabled: true,
          className: 'primary',
          onClick: null,
          guidance: lockedGuidance || undefined
        };
      } else if (ready) {
        actionConfig = {
          label: `Accept ${primaryOffer.label}`,
          disabled: false,
          className: 'primary',
          onClick: primaryOffer.onAccept,
          guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
        };
      } else {
        const availableIn = Number.isFinite(primaryOffer.availableIn) ? primaryOffer.availableIn : null;
        const daysText = availableIn === 1 ? '1 day' : `${availableIn} days`;
        const label = availableIn && availableIn > 0 ? `Opens in ${daysText}` : 'Opens soon';
        actionConfig = {
          label,
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
        onClick: () =>
          executeActionFn(() => {
            rollOffers({ templates: [definition], day: currentDay, state });
          }),
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
    if (resolvedCategory) {
      const categoryLabel = resolvedCategory
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      badges.push(`${categoryLabel} market`);
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
      category: resolvedCategory,
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
      action: requirementGuidance && actionConfig && !actionConfig.guidance
        ? { ...actionConfig, guidance: requirementGuidance }
        : actionConfig,
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
        tag: definition.tag?.label || '',
        category: resolvedCategory
      },
      seat: seatSummary
        ? {
            policy: aggregatedSeatPolicy,
            available: aggregatedSeats,
            summary: seatSummary
          }
        : null
    };
  });
}
