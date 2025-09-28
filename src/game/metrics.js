import { createEmptyDailyMetrics, ensureDailyMetrics, getState } from '../core/state.js';

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
}

export function resetDailyMetrics(target = getState()) {
  if (!target) return;
  target.metrics = target.metrics || {};
  target.metrics.daily = createEmptyDailyMetrics();
}
