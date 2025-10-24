import resolveIncomeFromBase from './income/engine.js';

export const VISITS_PER_DOLLAR = 100;

const BLOG_VISIT_FORMULA_DEFAULTS = Object.freeze({
  scale: 60, // C
  postsExponent: 0.8, // a
  seoExponent: 1.6, // b
  backlinkBleed: 0.05, // ε
  referralScale: 15, // w_ref
  backlinkExponent: 1.1 // g
});

function normalizePositiveNumber(value, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.max(min, Math.min(max, numeric));
}

function normalizeWholeNumber(value, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function deriveBlogPostCount({ definition, instance }) {
  const directProgress = normalizePositiveNumber(instance?.quality?.progress?.posts);
  if (directProgress > 0) {
    return directProgress;
  }

  const level = normalizeWholeNumber(instance?.quality?.level);
  const levels = Array.isArray(definition?.quality?.levels) ? definition.quality.levels : [];
  let inferredPosts = 0;
  levels.forEach(entry => {
    if (!entry || normalizeWholeNumber(entry.level) > level) {
      return;
    }
    const requirement = normalizePositiveNumber(entry?.requirements?.posts);
    if (requirement > inferredPosts) {
      inferredPosts = requirement;
    }
  });
  return inferredPosts;
}

function computeBlogVisitBaseUnits({ definition, instance, defaultBase = 0 }) {
  if (!instance) {
    return Math.max(0, Math.round(defaultBase));
  }

  const posts = Math.max(0, deriveBlogPostCount({ definition, instance }));
  const seoScore = normalizeWholeNumber(instance?.metrics?.seoScore, { min: 0, max: 100 });
  const backlinks = normalizeWholeNumber(instance?.metrics?.backlinks);

  const {
    scale: C,
    postsExponent: a,
    seoExponent: b,
    backlinkBleed: epsilon,
    referralScale: wRef,
    backlinkExponent: g
  } = BLOG_VISIT_FORMULA_DEFAULTS;

  const seoRatio = seoScore / 100;
  const backlinkLog = Math.log(1 + backlinks);

  const organic = Math.pow(posts, a) * Math.pow(seoRatio, b) * (1 + epsilon * backlinkLog);
  const referral = wRef * Math.pow(backlinkLog, g);
  const baseVisits = C * (organic + referral);

  if (!Number.isFinite(baseVisits)) {
    return Math.max(0, Math.round(defaultBase));
  }

  return Math.max(0, Math.round(baseVisits));
}

const VISIT_CALCULATOR_DEFAULT_OPTIONS = Object.freeze({
  triggerEvents: false
});

function coerceVisitAmount(value) {
  const numeric = Math.round(Number(value) || 0);
  return Math.max(0, numeric);
}

function toTrafficLabel(entry) {
  if (!entry) return 'Traffic';
  if (entry.type === 'base') {
    return 'Base traffic projection';
  }
  if (!entry.label) {
    return 'Traffic';
  }
  return entry.label.replace(/payout/gi, 'traffic');
}

function convertEntryToVisits(entry) {
  const visits = coerceVisitAmount(entry?.amount);
  return {
    id: entry?.id || null,
    label: toTrafficLabel(entry),
    amount: visits,
    visits,
    type: entry?.type || 'segment',
    percent: Number.isFinite(Number(entry?.percent)) ? Number(entry.percent) : null
  };
}

/**
 * Projects daily visit volume using the same modifier pipeline as asset payouts.
 *
 * The income engine already collects every passive modifier (quality multipliers,
 * education boosts, events, upgrades) in a single authoritative place. By feeding
 * it visit-scaled base units we guarantee traffic previews stay in lockstep with
 * real payouts. Future traffic tuning should flow through this calculator so the
 * visit simulation remains the canonical mirror of payout math.
 */
export default function projectVisitsFromBase({
  definition,
  assetState,
  instance,
  baseAmount,
  triggerEvents = VISIT_CALCULATOR_DEFAULT_OPTIONS.triggerEvents
}) {
  const numericBase = Math.max(0, Math.round(Number(baseAmount) || 0));
  if (numericBase <= 0 && (!definition || definition.id !== 'blog')) {
    return { visitsPerDay: 0, breakdown: null };
  }

  const defaultVisitBaseUnits = numericBase * VISITS_PER_DOLLAR;
  const visitBaseUnits = definition?.id === 'blog'
    ? computeBlogVisitBaseUnits({ definition, instance, defaultBase: defaultVisitBaseUnits })
    : defaultVisitBaseUnits;

  if (visitBaseUnits <= 0) {
    return { visitsPerDay: 0, breakdown: null };
  }

  const income = resolveIncomeFromBase({
    definition,
    assetState,
    instance,
    baseAmount: visitBaseUnits,
    triggerEvents,
    updateInstance: false
  });

  const visitsPerDay = coerceVisitAmount(income?.payoutRounded);
  if (visitsPerDay <= 0) {
    return { visitsPerDay: 0, breakdown: null };
  }

  const entries = Array.isArray(income?.finalEntries)
    ? income.finalEntries.map(convertEntryToVisits)
    : [];

  const totalFromEntries = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const diff = visitsPerDay - totalFromEntries;
  if (diff !== 0 && entries.length) {
    const lastEntry = entries[entries.length - 1];
    lastEntry.amount += diff;
    lastEntry.visits += diff;
  }

  return {
    visitsPerDay,
    breakdown: {
      total: visitsPerDay,
      entries
    }
  };
}

