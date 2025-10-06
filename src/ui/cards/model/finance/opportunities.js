import { describeAssetLaunchAvailability } from '../assets.js';
import { getDailyIncomeRange } from '../../../../game/assets/payout.js';
import { getUpgradeSnapshot } from '../upgrades.js';
import { describeHustleRequirements } from '../../../../game/hustles/helpers.js';
import { getAvailableOffers, getClaimedOffers } from '../../../../game/hustles.js';
import { collectOutstandingActionEntries } from '../../../actions/outstanding.js';
import { ensureArray, toCurrency } from './utils.js';

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

export function buildAssetOpportunities(assetDefinitions = [], state, services = {}) {
  const {
    describeAssetLaunchAvailability: describeAvailability = describeAssetLaunchAvailability,
    getDailyIncomeRange: getDailyIncomeRangeFn = getDailyIncomeRange
  } = services;

  return assetDefinitions
    .map(definition => {
      const availability = describeAvailability(definition, state);
      const setupDays = Number(definition.setup?.days) || 0;
      const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
      const totalHours = toCurrency(setupDays * hoursPerDay);
      const payoutRange = getDailyIncomeRangeFn(definition);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(definition.setup?.cost || 0),
        ready: !availability.disabled,
        reasons: availability.reasons || [],
        setup: {
          days: setupDays,
          hoursPerDay,
          totalHours
        },
        payoutRange: {
          min: toCurrency(payoutRange?.min),
          max: toCurrency(payoutRange?.max)
        }
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

export function buildUpgradeOpportunities(upgradeDefinitions = [], state, services = {}) {
  const {
    getUpgradeSnapshot: getUpgradeSnapshotFn = getUpgradeSnapshot
  } = services;

  return upgradeDefinitions
    .map(definition => {
      const snapshot = getUpgradeSnapshotFn(definition, state);
      return {
        id: definition.id,
        name: definition.name || definition.id,
        cost: toCurrency(snapshot.cost),
        ready: snapshot.ready,
        purchased: snapshot.purchased,
        affordable: snapshot.affordable,
        description: definition.description || ''
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

export function buildHustleOpportunities(hustleDefinitions = [], state, services = {}) {
  const {
    describeHustleRequirements: describeRequirements = describeHustleRequirements,
    getOffers = getAvailableOffers,
    getAcceptedOffers = getClaimedOffers,
    collectCommitments = collectOutstandingActionEntries
  } = services;

  const currentDay = Math.max(1, Number(state?.day) || 1);
  const offers = getOffers(state, { day: currentDay, includeUpcoming: true, includeClaimed: false }) || [];
  const outstanding = collectCommitments(state) || [];
  const accepted = getAcceptedOffers(state, { day: currentDay, includeExpired: false }) || [];

  const commitmentsByInstance = new Map();
  outstanding.forEach(entry => {
    const key = entry?.progress?.instanceId;
    if (key) {
      commitmentsByInstance.set(key, entry);
    }
  });

  const acceptedByDefinition = new Map();
  accepted.forEach(entry => {
    const definitionId = entry?.definitionId || entry?.templateId;
    if (!definitionId) return;
    if (!acceptedByDefinition.has(definitionId)) {
      acceptedByDefinition.set(definitionId, []);
    }
    acceptedByDefinition.get(definitionId).push(entry);
  });

  const offerEntries = offers
    .map(offer => ({ offer, definitionId: offer?.definitionId || offer?.templateId }))
    .filter(entry => entry.offer && entry.definitionId);
  const entries = [];

  hustleDefinitions.forEach(definition => {
    const baseTime = Number(definition.time || definition.action?.timeCost) || 0;
    const basePayout = Number(definition.payout?.amount || definition.action?.payout) || 0;

    const requirements = ensureArray(describeRequirements?.(definition, state)).map(req => ({
      label: req.label,
      met: req.met
    }));

    const relevantOffers = offerEntries
      .filter(entry => entry.definitionId === definition.id)
      .map(entry => entry.offer);

    let hasEntries = false;

    relevantOffers.forEach(offer => {
      if (!offer) return;
      const hours = resolveOfferHours(offer, definition);
      const payout = resolveOfferPayout(offer, definition);
      const roi = hours > 0 ? payout / hours : payout;
      const schedule = resolveOfferSchedule(offer);
      const availableIn = Number.isFinite(offer.availableOnDay)
        ? Math.max(0, Math.floor(offer.availableOnDay) - currentDay)
        : 0;
      const remainingDays = Number.isFinite(offer.expiresOnDay)
        ? Math.max(0, Math.floor(offer.expiresOnDay) - currentDay + 1)
        : null;

      entries.push({
        id: offer.id,
        definitionId: definition.id,
        name: `${definition.name || definition.id}${offer?.variant?.label ? ` — ${offer.variant.label}` : ''}`,
        description: offer?.variant?.description || definition.description || '',
        time: hours,
        payout,
        roi,
        payoutSchedule: schedule,
        type: 'offer',
        status: availableIn <= 0 ? 'available' : 'upcoming',
        availableInDays: availableIn,
        remainingDays,
        requirements
      });
      hasEntries = true;
    });

    const outstandingForDefinition = outstanding.filter(entry => entry?.progress?.definitionId === definition.id);
    outstandingForDefinition.forEach(entry => {
      const hoursRemaining = Number.isFinite(entry?.progress?.hoursRemaining)
        ? entry.progress.hoursRemaining
        : Number.isFinite(entry?.progress?.hoursRequired)
          ? entry.progress.hoursRequired
          : baseTime;
      const payout = Number.isFinite(entry?.payout)
        ? entry.payout
        : basePayout;
      const roi = hoursRemaining > 0 ? payout / hoursRemaining : payout;
      entries.push({
        id: entry.id,
        definitionId: definition.id,
        name: entry.title || definition.name || definition.id,
        description: entry.subtitle || entry.description || '',
        time: hoursRemaining,
        payout,
        roi,
        payoutSchedule: entry.progress?.payoutSchedule || 'onCompletion',
        type: 'commitment',
        status: 'active',
        remainingDays: entry.progress?.remainingDays ?? null,
        meta: entry.meta || '',
        progress: entry.progress || null
      });
      hasEntries = true;
    });

    const acceptedForDefinition = acceptedByDefinition.get(definition.id) || [];
    acceptedForDefinition.forEach(entry => {
      if (entry?.status === 'complete') {
        return;
      }
      if (commitmentsByInstance.has(entry?.instanceId)) {
        return;
      }
      const hoursRequired = Number.isFinite(entry?.hoursRequired)
        ? entry.hoursRequired
        : baseTime;
      const payout = Number.isFinite(entry?.payout?.amount)
        ? entry.payout.amount
        : basePayout;
      const roi = hoursRequired > 0 ? payout / hoursRequired : payout;
      const remainingDays = Number.isFinite(entry?.deadlineDay)
        ? Math.max(0, Math.floor(entry.deadlineDay) - currentDay + 1)
        : null;
      entries.push({
        id: entry?.id || `accepted:${entry?.offerId}`,
        definitionId: definition.id,
        name: entry?.metadata?.label || `${definition.name || definition.id} commitment`,
        description: entry?.metadata?.description || definition.description || '',
        time: hoursRequired,
        payout,
        roi,
        payoutSchedule: entry?.payout?.schedule || 'onCompletion',
        type: 'commitment',
        status: 'pending',
        remainingDays,
        meta: '',
        progress: {
          definitionId: definition.id,
          instanceId: entry?.instanceId || null,
          hoursRequired,
          hoursRemaining: hoursRequired,
          remainingDays,
          deadlineDay: entry?.deadlineDay ?? null,
          payoutSchedule: entry?.payout?.schedule || 'onCompletion'
        }
      });
      hasEntries = true;
    });

    if (!hasEntries) {
      const roi = baseTime > 0 ? basePayout / baseTime : basePayout;
      entries.push({
        id: definition.id,
        definitionId: definition.id,
        name: definition.name || definition.id,
        description: definition.description || '',
        time: baseTime,
        payout: basePayout,
        roi,
        payoutSchedule: definition.payout?.schedule || 'onCompletion',
        type: 'offer',
        status: 'available',
        availableInDays: 0,
        remainingDays: null,
        requirements
      });
    }
  });

  const commitments = entries.filter(entry => entry.type === 'commitment');
  const offersList = entries.filter(entry => entry.type === 'offer');

  commitments.sort((a, b) => {
    const daysA = Number.isFinite(a.remainingDays) ? a.remainingDays : Infinity;
    const daysB = Number.isFinite(b.remainingDays) ? b.remainingDays : Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    return b.payout - a.payout;
  });

  offersList.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'available') return -1;
      if (b.status === 'available') return 1;
    }
    const availableA = Number.isFinite(a.availableInDays) ? a.availableInDays : Infinity;
    const availableB = Number.isFinite(b.availableInDays) ? b.availableInDays : Infinity;
    if (availableA !== availableB) {
      return availableA - availableB;
    }
    return b.roi - a.roi;
  });

  return [...commitments, ...offersList];
}

export function buildOpportunitySummary(assets, upgrades, hustles) {
  return {
    assets,
    upgrades,
    hustles
  };
}

