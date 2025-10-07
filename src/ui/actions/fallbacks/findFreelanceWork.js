import { formatHours, formatMoney } from '../../../core/helpers.js';
import { addLog } from '../../../core/log.js';
import { getState } from '../../../core/state.js';
import { registerActionProvider } from '../providers.js';
import { collectOutstandingActionEntries } from '../outstanding/index.js';
import { getAvailableOffers, acceptHustleOffer, HUSTLE_TEMPLATES } from '../../../game/hustles.js';
import { executeAction } from '../../../game/actions.js';
import { spendTime } from '../../../game/time.js';
import { checkDayEnd } from '../../../game/lifecycle.js';
import { resolveOfferPayout } from '../../hustles/offerHelpers.js';
import { definitionRequirementsMet } from '../../../game/requirements/checks.js';
import { describeHustleRequirements } from '../../../game/hustles/helpers.js';

const TASK_ID = 'fallback:freelance-search';
const TASK_DURATION_HOURS = 0.25;
const DEFAULT_TASK_TITLE = 'Find work';
const TASK_SUBTITLE = 'Scan the gig board for a quick-turn contract.';
const WARNING_TYPE = 'warning';

const TEMPLATE_NAME_BY_ID = new Map(
  HUSTLE_TEMPLATES
    .filter(template => template?.id)
    .map(template => [template.id, template.name || template.id])
);

const TEMPLATE_BY_ID = new Map(
  HUSTLE_TEMPLATES
    .filter(template => template?.id)
    .map(template => [template.id, template])
);

const STUDY_CATEGORY_KEYS = new Set(['study', 'education', 'course', 'training', 'lesson', 'class']);

function normalizeKey(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function isStudyDescriptor(value) {
  const normalized = normalizeKey(value);
  return normalized && STUDY_CATEGORY_KEYS.has(normalized);
}

function formatCategoryLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function resolveOfferCategory(offer = {}) {
  const direct = typeof offer.templateCategory === 'string' && offer.templateCategory.trim()
    ? offer.templateCategory.trim()
    : null;
  if (direct) {
    return direct;
  }
  const metadataCategory = typeof offer.metadata?.templateCategory === 'string'
    && offer.metadata.templateCategory.trim()
    ? offer.metadata.templateCategory.trim()
    : null;
  return metadataCategory;
}

function resolveTemplateName(offer = {}) {
  const templateId = typeof offer.templateId === 'string' && offer.templateId.trim()
    ? offer.templateId.trim()
    : null;
  if (templateId && TEMPLATE_NAME_BY_ID.has(templateId)) {
    return TEMPLATE_NAME_BY_ID.get(templateId);
  }
  const definitionId = typeof offer.definitionId === 'string' && offer.definitionId.trim()
    ? offer.definitionId.trim()
    : null;
  if (definitionId && TEMPLATE_NAME_BY_ID.has(definitionId)) {
    return TEMPLATE_NAME_BY_ID.get(definitionId);
  }
  return null;
}

function resolveOfferTemplate(offer = {}) {
  const templateId = typeof offer.templateId === 'string' && offer.templateId.trim()
    ? offer.templateId.trim()
    : null;
  if (templateId && TEMPLATE_BY_ID.has(templateId)) {
    return TEMPLATE_BY_ID.get(templateId);
  }
  const definitionId = typeof offer.definitionId === 'string' && offer.definitionId.trim()
    ? offer.definitionId.trim()
    : null;
  if (definitionId && TEMPLATE_BY_ID.has(definitionId)) {
    return TEMPLATE_BY_ID.get(definitionId);
  }
  return null;
}

function isOfferDownworkAligned(offer = {}, template = null) {
  const resolvedTemplate = template || resolveOfferTemplate(offer) || null;
  if (!resolvedTemplate) {
    return false;
  }

  if (isStudyDescriptor(resolvedTemplate.category)) {
    return false;
  }

  if (isStudyDescriptor(resolvedTemplate?.market?.category)) {
    return false;
  }

  if (isStudyDescriptor(resolvedTemplate?.tag?.type)) {
    return false;
  }

  if (isStudyDescriptor(resolvedTemplate?.progress?.type)) {
    return false;
  }

  const offerCategory = normalizeKey(offer?.templateCategory || offer?.category);
  if (isStudyDescriptor(offerCategory)) {
    return false;
  }

  const metadataCategory = normalizeKey(offer?.metadata?.templateCategory);
  if (isStudyDescriptor(metadataCategory)) {
    return false;
  }

  const resolvedCategory = resolveOfferCategory(offer);
  if (isStudyDescriptor(resolvedCategory)) {
    return false;
  }

  return true;
}

function resolveTaskTitle(candidate) {
  const offer = candidate?.offer;
  const templateName = resolveTemplateName(offer);
  if (templateName) {
    return `Find ${templateName} work`;
  }
  const category = resolveOfferCategory(offer);
  if (category) {
    return `Find ${formatCategoryLabel(category)} work`;
  }
  return DEFAULT_TASK_TITLE;
}

function resolveTaskSubtitle(candidate) {
  const category = resolveOfferCategory(candidate?.offer);
  if (category) {
    const lowerLabel = formatCategoryLabel(category).toLowerCase();
    return `Scout today's ${lowerLabel} gigs and snag the coziest contract.`;
  }
  return TASK_SUBTITLE;
}

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

function isOfferEligibleForState(offer, state) {
  const template = resolveOfferTemplate(offer);
  if (!template) {
    return false;
  }

  if (!isOfferDownworkAligned(offer, template)) {
    return false;
  }

  if (typeof template.getDisabledReason === 'function') {
    const disabledReason = template.getDisabledReason(state);
    if (disabledReason) {
      return false;
    }
  }

  if (!definitionRequirementsMet(template, state)) {
    return false;
  }

  const requirementDescriptors = describeHustleRequirements(template, state) || [];
  const unmetDescriptor = requirementDescriptors.find(entry => entry && entry.met === false);
  if (unmetDescriptor) {
    return false;
  }

  return true;
}

function selectHustleCandidate(state) {
  const offers = getAvailableOffers(state, { includeClaimed: false }) || [];
  const hustleOffers = offers.filter(offer => offer && offer.status !== 'claimed' && !offer.claimed);

  const eligibleOffers = hustleOffers.filter(offer => isOfferEligibleForState(offer, state));

  if (!eligibleOffers.length) {
    return null;
  }

  const candidates = eligibleOffers.map(buildCandidate);
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
  const categoryLabel = formatCategoryLabel(resolveOfferCategory(candidate.offer));
  if (categoryLabel) {
    parts.push(categoryLabel);
  }
  const label = candidate.offer.variant?.label;
  if (label && label !== categoryLabel) {
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

function runHustleSearch() {
  const state = getState();
  const candidate = selectHustleCandidate(state);
  if (!candidate?.offer) {
    addLog('No hustle gigs are open right now. Check back after the next market refresh.', WARNING_TYPE);
    return { success: false };
  }

  const availableTime = toFiniteNumber(state?.timeLeft);
  if (availableTime != null && availableTime < TASK_DURATION_HOURS) {
    addLog(`You need ${formatHours(TASK_DURATION_HOURS)} free to scout a new gig. Clear a little time first.`, WARNING_TYPE);
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
    addLog('That gig slipped away before you could accept it. Keep scouting for the next one!', WARNING_TYPE);
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

  const candidate = selectHustleCandidate(workingState);
  if (!candidate?.offer) {
    return null;
  }

  const durationText = formatHours(TASK_DURATION_HOURS);
  const meta = buildMetaSummary(candidate);
  const title = resolveTaskTitle(candidate);
  const subtitle = resolveTaskSubtitle(candidate);

  return {
    id: 'freelance-search-fallback',
    focusCategory: 'hustle',
    entries: [
      {
        id: TASK_ID,
        title,
        subtitle,
        meta,
        durationHours: TASK_DURATION_HOURS,
        durationText,
        repeatable: true,
        focusCategory: 'hustle',
        focusBucket: 'hustle',
        onClick: runHustleSearch
      }
    ]
  };
}, -10);

export const __testables = {
  isOfferDownworkAligned
};
