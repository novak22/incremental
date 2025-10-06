import { normalizeActionEntries, formatDuration, formatPayoutSummary } from './utils.js';

function resolveString(...candidates) {
  for (const value of candidates) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    return trimmed;
  }
  return '';
}

function resolveNumber(...candidates) {
  for (const value of candidates) {
    if (value == null) {
      continue;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      continue;
    }
    return Math.max(0, numeric);
  }
  return 0;
}

function resolveDurationText(durationHours, ...candidates) {
  const text = resolveString(...candidates);
  if (text) {
    return text;
  }
  return formatDuration(durationHours);
}

function resolvePayoutText(payout, schedule, ...candidates) {
  const text = resolveString(...candidates);
  if (text) {
    return text;
  }
  if (payout <= 0) {
    return '';
  }
  return formatPayoutSummary(payout, schedule);
}

export function buildQueueEntryModel(entry = {}, options = {}) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const [normalized] = normalizeActionEntries([entry]);
  const base = normalized || {};
  const schedule = options?.schedule ?? entry?.schedule ?? base.schedule;

  const result = {
    ...base,
    ...entry
  };

  result.title = resolveString(options?.title, entry?.title, entry?.label, entry?.name, base.title, 'Action');
  result.subtitle = resolveString(options?.subtitle, entry?.subtitle, entry?.description, base.subtitle);

  const durationHours = resolveNumber(
    options?.durationHours,
    entry?.durationHours,
    entry?.timeCost,
    entry?.hours,
    base.durationHours,
    0
  );
  result.durationHours = durationHours;
  result.durationText = resolveDurationText(
    durationHours,
    options?.durationText,
    entry?.durationText,
    base.durationText
  );

  const payout = resolveNumber(options?.payout, entry?.payout, base.payout, 0);
  result.payout = payout;
  result.payoutText = resolvePayoutText(
    payout,
    schedule,
    options?.payoutText,
    entry?.payoutText,
    base.payoutText
  );

  const defaultMeta = [result.payoutText, result.durationText].filter(Boolean).join(' • ');
  result.meta = resolveString(options?.meta, entry?.meta, base.meta, defaultMeta);

  if (!result.buttonLabel && entry?.primaryLabel) {
    result.buttonLabel = entry.primaryLabel;
  }

  return result;
}

export function buildQueueEntryCollection(source = [], options = {}) {
  const entries = Array.isArray(source?.entries)
    ? source.entries
    : Array.isArray(source)
      ? source
      : [];
  return entries
    .filter(Boolean)
    .map(entry => buildQueueEntryModel(entry, options))
    .filter(Boolean);
}

export default {
  buildQueueEntryModel,
  buildQueueEntryCollection
};
