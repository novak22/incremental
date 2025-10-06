import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeQuickActionOfferMeta } from '../../hustles/offerHelpers.js';

const DEFAULT_LOCK_MESSAGE = 'Meet the prerequisites before accepting this hustle.';
const DEFAULT_PRIMARY_LABEL = 'Accept';
const FALLBACK_GUIDANCE = "Fresh leads roll in with tomorrow's market refresh.";

export function buildQuickActionHints(candidate = {}) {
  const hours = Number(candidate?.hours) || 0;
  const payout = Number(candidate?.payout) || 0;
  const durationText = hours > 0 ? formatHours(hours) : '';
  const payoutText = payout > 0 ? `$${formatMoney(payout)}` : '';

  const meta = describeQuickActionOfferMeta({
    payout,
    schedule: candidate?.schedule,
    durationText,
    daysRequired: candidate?.offerMeta?.daysRequired,
    remainingDays: candidate?.offerMeta?.expiresIn,
    seatPolicy: candidate?.seatPolicy,
    seatsAvailable: candidate?.seatsAvailable,
    formatMoneyFn: formatMoney
  });

  const enhancedMeta = candidate?.requirementsMet === false
    ? [candidate?.lockGuidance, meta].filter(Boolean).join(' • ')
    : meta;

  const labelCandidates = candidate?.labelCandidates || {};
  const label = labelCandidates.variantLabel
    || labelCandidates.definitionName
    || labelCandidates.templateId
    || labelCandidates.fallback
    || 'Hustle offer';

  return {
    label,
    description: candidate?.descriptionSource || '',
    primaryLabel: DEFAULT_PRIMARY_LABEL,
    durationText,
    payoutText,
    meta: enhancedMeta,
    repeatable: Number(candidate?.remainingRuns) > 1,
    disabled: candidate?.requirementsMet === false,
    disabledReason: candidate?.requirementsMet === false
      ? candidate?.lockGuidance || DEFAULT_LOCK_MESSAGE
      : null,
    focusCategory: candidate?.normalizedCategory || 'hustle',
    focusBucket: 'hustle'
  };
}

export function createEmptyQuickActionEntry() {
  return {
    id: 'hustles:no-offers',
    label: 'No hustle offers available',
    primaryLabel: 'Check back tomorrow',
    description: FALLBACK_GUIDANCE,
    onClick: null,
    roi: 0,
    timeCost: 0,
    payout: 0,
    payoutText: '',
    durationHours: 0,
    durationText: '',
    meta: FALLBACK_GUIDANCE,
    repeatable: false,
    remainingRuns: 0,
    remainingDays: null,
    schedule: 'onCompletion',
    offer: null,
    excludeFromQueue: true,
    focusCategory: 'hustle',
    focusBucket: 'hustle'
  };
}
