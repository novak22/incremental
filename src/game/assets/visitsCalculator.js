import resolveIncomeFromBase from './income/engine.js';

export const VISITS_PER_DOLLAR = 100;

export const VISIT_CALCULATOR_DEFAULT_OPTIONS = Object.freeze({
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
  if (numericBase <= 0) {
    return { visitsPerDay: 0, breakdown: null };
  }

  const visitBaseUnits = numericBase * VISITS_PER_DOLLAR;
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

export { projectVisitsFromBase };
