import { toNumber } from '../../../core/helpers.js';

export function buildMetricConfig(id, prefix, overrides = {}, defaults = {}) {
  if (overrides === false) return null;
  const key = overrides.key || defaults.key || `${prefix}:${id}:${defaults.type || prefix}`;
  const label = overrides.label || defaults.label;
  const category = overrides.category || defaults.category;
  const type = overrides.type || defaults.type;
  const config = { key, label, category };
  if (type) {
    config.type = type;
  }
  return config;
}

export function normalizeHustleMetrics(id, metrics = {}) {
  return {
    time: buildMetricConfig(id, 'hustle', metrics.time, {
      key: `hustle:${id}:time`,
      label: metrics.time?.label || 'Hustle time investment',
      category: metrics.time?.category || 'hustle'
    }),
    cost: buildMetricConfig(id, 'hustle', metrics.cost, {
      key: `hustle:${id}:cost`,
      label: metrics.cost?.label || 'Hustle spending',
      category: metrics.cost?.category || 'hustle'
    }),
    payout: buildMetricConfig(id, 'hustle', metrics.payout, {
      key: `hustle:${id}:payout`,
      label: metrics.payout?.label || 'Hustle payout',
      category: metrics.payout?.category || 'hustle'
    })
  };
}

export function applyMetric(recordFn, metric, payload) {
  if (!metric) return;
  recordFn({ ...metric, ...payload });
}

export function normalizeSlotMap(map) {
  if (!map) return null;
  const entries = Object.entries(map)
    .map(([slot, value]) => [slot, toNumber(value, 0)])
    .filter(([, value]) => Number.isFinite(value) && value !== 0);
  if (!entries.length) return null;
  return Object.fromEntries(entries);
}
