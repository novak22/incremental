import { formatHours, formatMoney } from '../../core/helpers.js';

const defaultNumberResolver = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
};

function pickFirstFinite(candidates = [], { toNumber = defaultNumberResolver, min = -Infinity } = {}) {
  for (const value of candidates) {
    const numeric = toNumber(value);
    if (Number.isFinite(numeric) && numeric >= min) {
      return numeric;
    }
  }
  return null;
}

export function resolveOfferHours(offer, template, { toNumber = defaultNumberResolver } = {}) {
  if (!offer) return 0;
  const metadata = offer.metadata || {};
  const requirements = typeof metadata.requirements === 'object' && metadata.requirements !== null
    ? metadata.requirements
    : {};
  const candidates = [
    metadata.hoursRequired,
    requirements.hours,
    requirements.timeHours,
    template?.time,
    template?.action?.timeCost
  ];
  const resolved = pickFirstFinite(candidates, { toNumber, min: 0 });
  return resolved != null ? resolved : 0;
}

export function resolveOfferPayout(offer, template, { toNumber = defaultNumberResolver } = {}) {
  if (!offer) return 0;
  const metadata = offer.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  const candidates = [metadata.payoutAmount, payout.amount, template?.payout?.amount];
  const resolved = pickFirstFinite(candidates, { toNumber, min: 0 });
  return resolved != null ? resolved : 0;
}

export function resolveOfferSchedule(offer) {
  if (!offer) return 'onCompletion';
  const metadata = offer.metadata || {};
  const payout = typeof metadata.payout === 'object' && metadata.payout !== null
    ? metadata.payout
    : {};
  return metadata.payoutSchedule || payout.schedule || 'onCompletion';
}

export function describeQuickActionOfferMeta({
  payout = 0,
  schedule,
  durationText,
  remainingDays,
  formatMoneyFn = formatMoney
} = {}) {
  const parts = [];
  if (payout > 0) {
    const payoutText = `$${formatMoneyFn(payout)}`;
    if (!schedule || schedule === 'onCompletion') {
      parts.push(`${payoutText} on completion`);
    } else if (schedule === 'daily') {
      parts.push(`${payoutText} / day`);
    } else {
      parts.push(`${payoutText} • ${schedule}`);
    }
  }
  if (durationText) {
    parts.push(durationText);
  }
  if (Number.isFinite(remainingDays)) {
    parts.push(`${remainingDays} day${remainingDays === 1 ? '' : 's'} left`);
  }
  return parts.join(' • ');
}

export function describeHustleOfferMeta({
  offer,
  definition,
  currentDay = 1,
  formatHoursFn = formatHours,
  formatMoneyFn = formatMoney,
  toNumber = defaultNumberResolver
} = {}) {
  const hours = resolveOfferHours(offer, definition, { toNumber });
  const payout = resolveOfferPayout(offer, definition, { toNumber });
  const schedule = resolveOfferSchedule(offer);
  const metadata = offer?.metadata || {};
  const progressMetadata = typeof metadata.progress === 'object' && metadata.progress !== null
    ? metadata.progress
    : {};

  const hoursPerDay = pickFirstFinite(
    [metadata.hoursPerDay, progressMetadata.hoursPerDay],
    { toNumber, min: Number.EPSILON }
  );

  const daysRequiredCandidate = pickFirstFinite(
    [metadata.daysRequired, progressMetadata.daysRequired],
    { toNumber, min: Number.EPSILON }
  );
  const daysRequired = daysRequiredCandidate != null
    ? Math.max(1, Math.floor(daysRequiredCandidate))
    : null;

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

  const availableIn = Number.isFinite(offer?.availableOnDay)
    ? Math.max(0, Math.floor(offer.availableOnDay) - currentDay)
    : 0;
  const expiresIn = Number.isFinite(offer?.expiresOnDay)
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
    hoursPerDay: Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : null,
    daysRequired,
    completionMode,
    progressLabel,
    availableIn,
    expiresIn,
    summary: parts.join(' • ')
  };
}
