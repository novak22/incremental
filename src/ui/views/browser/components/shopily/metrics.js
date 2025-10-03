import { ensureArray } from '../../../../../core/helpers.js';

function describeMetricTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

export default function renderMetrics(metrics = {}, formatters = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? '')
  } = formatters;

  const entries = ensureArray([
    {
      label: 'Total Stores',
      value: metrics.totalStores || 0,
      note: 'Active & in setup',
      tone: 'neutral'
    },
    {
      label: 'Daily Sales',
      value: formatCurrency(metrics.dailySales || 0),
      note: 'Yesterday’s payouts',
      tone: describeMetricTone(metrics.dailySales)
    },
    {
      label: 'Daily Upkeep',
      value: formatCurrency(metrics.dailyUpkeep || 0),
      note: 'Cash needed each day',
      tone: describeMetricTone(-(metrics.dailyUpkeep || 0))
    },
    {
      label: 'Net / Day',
      value: formatSignedCurrency(metrics.netDaily || 0),
      note: 'Sales minus upkeep',
      tone: describeMetricTone(metrics.netDaily)
    }
  ]);

  const grid = document.createElement('dl');
  grid.className = 'shopily-metrics';

  entries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'shopily-metric';
    item.dataset.tone = entry.tone;

    const label = document.createElement('dt');
    label.className = 'shopily-metric__label';
    label.textContent = entry.label;

    const value = document.createElement('dd');
    value.className = 'shopily-metric__value';
    value.textContent = entry.value;

    const note = document.createElement('span');
    note.className = 'shopily-metric__note';
    note.textContent = entry.note;

    item.append(label, value, note);
    grid.appendChild(item);
  });

  return grid;
}
