import {
  createEmptyDailyMetrics,
  ensureDailyMetrics,
  ensureMetricsHistory,
  getState
} from '../core/state.js';
import { structuredClone } from '../core/helpers.js';

const MAX_METRIC_HISTORY = 7;

function normalizeNumber(value, defaultValue = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
}

function upsertMetricEntry(bucket, key, seed) {
  const existing = bucket[key];
  if (existing) {
    return existing;
  }
  const entry = { key, ...seed };
  bucket[key] = entry;
  return entry;
}

export function getDailyMetrics(target = getState()) {
  return ensureDailyMetrics(target);
}

export function recordTimeContribution({ key, label, hours, category = 'general' }) {
  if (!key || !label) return;
  const amount = normalizeNumber(hours);
  if (amount <= 0) return;
  const metrics = ensureDailyMetrics();
  if (!metrics) return;
  const entry = upsertMetricEntry(metrics.time, key, {
    label,
    hours: 0,
    category
  });
  entry.hours = normalizeNumber(entry.hours);
  entry.hours += amount;
  entry.label = label;
  entry.category = category || entry.category || 'general';
}

export function recordPayoutContribution({ key, label, amount, category = 'general' }) {
  if (!key || !label) return;
  const value = normalizeNumber(amount);
  if (value <= 0) return;
  const metrics = ensureDailyMetrics();
  if (!metrics) return;
  const entry = upsertMetricEntry(metrics.payouts, key, {
    label,
    amount: 0,
    category
  });
  entry.amount = normalizeNumber(entry.amount);
  entry.amount += value;
  entry.label = label;
  entry.category = category || entry.category || 'general';

  const state = getState();
  if (state) {
    state.totals = state.totals || {};
    const current = Number(state.totals.earned);
    state.totals.earned = (Number.isFinite(current) ? current : 0) + value;
  }
}

export function recordCostContribution({ key, label, amount, category = 'general' }) {
  if (!key || !label) return;
  const value = normalizeNumber(amount);
  if (value <= 0) return;
  const metrics = ensureDailyMetrics();
  if (!metrics) return;
  const entry = upsertMetricEntry(metrics.costs, key, {
    label,
    amount: 0,
    category
  });
  entry.amount = normalizeNumber(entry.amount);
  entry.amount += value;
  entry.label = label;
  entry.category = category || entry.category || 'general';

  const state = getState();
  if (state) {
    state.totals = state.totals || {};
    const current = Number(state.totals.spent);
    state.totals.spent = (Number.isFinite(current) ? current : 0) + value;
  }
}

export function resetDailyMetrics(target = getState()) {
  if (!target) return;
  target.metrics = target.metrics || {};
  target.metrics.daily = createEmptyDailyMetrics();
}

function normalizeHistoryBucket(bucket = {}, valueKey) {
  return Object.values(bucket)
    .map(entry => {
      const value = Number(entry?.[valueKey]);
      return {
        key: entry?.key,
        label: entry?.label,
        category: entry?.category || 'general',
        [valueKey]: Number.isFinite(value) ? value : 0
      };
    })
    .filter(entry => entry?.[valueKey] > 0)
    .sort((a, b) => b[valueKey] - a[valueKey]);
}

export function archiveDailyMetrics({ state = getState(), summary, day, timestamp } = {}) {
  const target = state || getState();
  if (!target) return;

  const metrics = ensureDailyMetrics(target);
  const history = ensureMetricsHistory(target);
  if (!metrics || !history) return;

  const totals = {
    income: normalizeNumber(summary?.totalEarnings, 0),
    spend: normalizeNumber(summary?.totalSpend, 0)
  };
  totals.net = totals.income - totals.spend;

  const entry = {
    day: Number.isFinite(day) ? day : Number(target.day) || 1,
    recordedAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
    totals,
    summary: summary ? structuredClone(summary) : null,
    ledger: {
      payouts: normalizeHistoryBucket(metrics.payouts, 'amount'),
      costs: normalizeHistoryBucket(metrics.costs, 'amount'),
      time: normalizeHistoryBucket(metrics.time, 'hours')
    }
  };

  history.push(entry);
  while (history.length > MAX_METRIC_HISTORY) {
    history.shift();
  }
}
