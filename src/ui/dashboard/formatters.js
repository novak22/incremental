import { formatHours, formatMoney } from '../../core/helpers.js';

export function clampNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getMetricLabel(entry = {}) {
  return entry.label
    || entry?.definition?.label
    || entry?.definition?.name
    || entry.key
    || 'Metric';
}

export function extractIconPrefix(label) {
  if (typeof label !== 'string') return '';
  const match = label.match(/^([^\w]*)/u);
  return match ? match[1].trim() : '';
}

export function formatTimeEntries(summary = {}) {
  const entries = Array.isArray(summary.timeBreakdown) ? summary.timeBreakdown : [];
  return entries.map(entry => {
    const hours = clampNumber(entry?.hours);
    return {
      key: entry?.key,
      label: getMetricLabel(entry),
      value: `${formatHours(hours)} today`,
      hours,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition
    };
  });
}

export function formatPayoutEntries(entries = []) {
  return entries.map(entry => {
    const amount = clampNumber(entry?.amount);
    const baseLabel = getMetricLabel(entry);
    let label = baseLabel;

    if (entry?.source?.type === 'asset') {
      const prefix = extractIconPrefix(entry?.label);
      const name = entry?.source?.name || baseLabel;
      const decorated = entry?.source?.count > 1 ? `${name} (${entry.source.count})` : name;
      label = prefix ? `${prefix} ${decorated}`.trim() : decorated;
    }

    return {
      key: entry?.key,
      label,
      value: `$${formatMoney(amount)} today`,
      amount,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition,
      stream: entry?.stream,
      source: entry?.source
    };
  });
}

export function formatSpendEntries(entries = []) {
  return entries.map(entry => {
    const amount = clampNumber(entry?.amount);
    return {
      key: entry?.key,
      label: getMetricLabel(entry),
      value: `$${formatMoney(amount)} today`,
      amount,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition
    };
  });
}

export function formatStudyEntries(entries = []) {
  return entries.map(entry => {
    const hours = clampNumber(entry?.hoursPerDay);
    const remaining = Math.max(0, clampNumber(entry?.remainingDays));
    const status = entry?.status || (entry?.studiedToday ? 'scheduled' : 'waiting');
    return {
      trackId: entry?.trackId,
      label: `📘 ${entry?.name}`,
      value: `${formatHours(hours)} / day • ${remaining} day${remaining === 1 ? '' : 's'} left (${status})`,
      hoursPerDay: hours,
      remainingDays: remaining,
      studiedToday: Boolean(entry?.studiedToday),
      status
    };
  });
}

export function buildSummaryPresentations(summary = {}) {
  return {
    timeEntries: formatTimeEntries(summary),
    earningsEntries: formatPayoutEntries(Array.isArray(summary.earningsBreakdown) ? summary.earningsBreakdown : []),
    passiveEntries: formatPayoutEntries(Array.isArray(summary.passiveBreakdown) ? summary.passiveBreakdown : []),
    spendEntries: formatSpendEntries(Array.isArray(summary.spendBreakdown) ? summary.spendBreakdown : []),
    studyEntries: formatStudyEntries(Array.isArray(summary.studyBreakdown) ? summary.studyBreakdown : [])
  };
}

export function describeDelta(popularity = {}) {
  const raw = Number(popularity.delta);
  if (!Number.isFinite(raw)) return 'Fresh reading';
  if (raw === 0) return 'Holding steady';
  const sign = raw > 0 ? '+' : '';
  return `${sign}${raw} vs yesterday`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  const percent = Math.round(value * 100);
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}

export default {
  clampNumber,
  clampScore,
  getMetricLabel,
  extractIconPrefix,
  formatTimeEntries,
  formatPayoutEntries,
  formatSpendEntries,
  formatStudyEntries,
  buildSummaryPresentations,
  describeDelta,
  formatPercent
};
