import { formatHours, formatMoney } from '../../../core/helpers.js';
import { addLog } from '../../../core/log.js';
import { getState } from '../../../core/state.js';
import { registerActionProvider } from '../providers.js';
import { collectOutstandingActionEntries } from '../outstanding/index.js';
import { getAvailableOffers, acceptHustleOffer } from '../../../game/hustles.js';
import { executeAction } from '../../../game/actions.js';
import { spendTime } from '../../../game/time.js';
import { checkDayEnd } from '../../../game/lifecycle.js';
import { resolveOfferPayout } from '../../hustles/offerHelpers.js';

const TASK_ID = 'fallback:freelance-search';
const TASK_DURATION_HOURS = 0.25;
const TASK_TITLE = 'Find freelance work';
const TASK_SUBTITLE = 'Scan the market for a quick-turn writing gig.';
const WARNING_TYPE = 'warning';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pickFirstPositive(candidates = []) {
  for (const candidate of candidates) {
    const numeric = toFiniteNumber(candidate);
    if (numeric != null && numeric > 0) {
      return numeric;
    }
  }
  return null;
}

function resolveDaysRequired(offer = {}) {
  const metadata = offer.metadata || {};
  const progressMetadata = typeof metadata.progress === 'object' && metadata.progress !== null
    ? metadata.progress
    : {};
  const variantMetadata = offer.variant?.metadata || {};
  const variantProgress = typeof variantMetadata.progress === 'object' && variantMetadata.progress !== null
    ? variantMetadata.progress
    : {};

  const candidates = [
    metadata.daysRequired,
    progressMetadata.daysRequired,
    variantMetadata.daysRequired,
    variantProgress.daysRequired,
    metadata.durationDays,
    progressMetadata.durationDays,
    offer.variant?.durationDays,
    metadata.requirements?.days,
    metadata.requirements?.daysRequired
  ];

  const resolved = pickFirstPositive(candidates);
  if (resolved == null) {
    return null;
  }
  const normalized = Math.max(1, Math.floor(resolved));
  return normalized;
}

function buildCandidate(offer) {
  const payout = resolveOfferPayout(offer, null, { toNumber: Number });
  const daysRequired = resolveDaysRequired(offer);
  const normalizedDays = Number.isFinite(daysRequired) ? daysRequired : Number.POSITIVE_INFINITY;
  const normalizedPayout = Number.isFinite(payout) ? payout : 0;
  return {
    offer,
    payout: normalizedPayout,
    daysRequired: normalizedDays
  };
}

function selectFreelanceCandidate(state) {
  const offers = getAvailableOffers(state, { includeClaimed: false }) || [];
  const freelanceOffers = offers.filter(offer => {
    if (!offer || offer.status === 'claimed' || offer.claimed) {
      return false;
    }
    const templateId = offer.templateId || offer.definitionId;
    return templateId === 'freelance';
  });

  if (!freelanceOffers.length) {
    return null;
  }

  const candidates = freelanceOffers.map(buildCandidate);
  candidates.sort((a, b) => {
    if (a.daysRequired !== b.daysRequired) {
      return a.daysRequired - b.daysRequired;
    }
    if (a.payout !== b.payout) {
      return b.payout - a.payout;
    }
    const expiresA = Number.isFinite(a.offer?.expiresOnDay) ? a.offer.expiresOnDay : Number.POSITIVE_INFINITY;
    const expiresB = Number.isFinite(b.offer?.expiresOnDay) ? b.offer.expiresOnDay : Number.POSITIVE_INFINITY;
    if (expiresA !== expiresB) {
      return expiresA - expiresB;
    }
    return (a.offer?.id || '').localeCompare(b.offer?.id || '');
  });

  return candidates[0] || null;
}

function hasActiveHustleCommitments(state) {
  const outstanding = collectOutstandingActionEntries(state) || [];
  return outstanding.some(entry => entry?.raw?.definition?.category === 'hustle');
}

function buildMetaSummary(candidate) {
  if (!candidate?.offer) {
    return '';
  }
  const parts = [];
  const label = candidate.offer.variant?.label;
  if (label) {
    parts.push(label);
  }
  if (candidate.payout > 0) {
    parts.push(`$${formatMoney(candidate.payout)}`);
  }
  if (Number.isFinite(candidate.daysRequired) && candidate.daysRequired !== Number.POSITIVE_INFINITY) {
    parts.push(`${candidate.daysRequired}-day commitment`);
  }
  return parts.join(' • ');
}

function runFreelanceSearch() {
  const state = getState();
  const candidate = selectFreelanceCandidate(state);
  if (!candidate?.offer) {
    addLog('No freelance gigs are open right now. Check back after the next market refresh.', WARNING_TYPE);
    return { success: false };
  }

  const availableTime = toFiniteNumber(state?.timeLeft);
  if (availableTime != null && availableTime < TASK_DURATION_HOURS) {
    addLog(`You need ${formatHours(TASK_DURATION_HOURS)} free to line up a freelance gig. Clear a little time first.`, WARNING_TYPE);
    return { success: false };
  }

  let accepted = null;
  executeAction(() => {
    accepted = acceptHustleOffer(candidate.offer.id, { state });
    if (accepted) {
      spendTime(TASK_DURATION_HOURS);
      checkDayEnd();
    }
  });

  if (!accepted) {
    addLog('That contract slipped away before you could accept it. Keep scouting for the next one!', WARNING_TYPE);
    return { success: false };
  }

  return { success: true, hours: TASK_DURATION_HOURS };
}

registerActionProvider(({ state }) => {
  const workingState = state || getState();
  if (!workingState) {
    return null;
  }

  if (hasActiveHustleCommitments(workingState)) {
    return null;
  }

  const candidate = selectFreelanceCandidate(workingState);
  if (!candidate?.offer) {
    return null;
  }

  const durationText = formatHours(TASK_DURATION_HOURS);
  const meta = buildMetaSummary(candidate);

  return {
    id: 'freelance-search-fallback',
    focusCategory: 'hustle',
    entries: [
      {
        id: TASK_ID,
        title: TASK_TITLE,
        subtitle: TASK_SUBTITLE,
        meta,
        durationHours: TASK_DURATION_HOURS,
        durationText,
        repeatable: true,
        focusCategory: 'hustle',
        focusBucket: 'hustle',
        onClick: runFreelanceSearch
      }
    ]
  };
}, -10);
