import { formatHours } from '../../../../../core/helpers.js';
import { createSection, formatCurrency, formatSignedCurrency } from './shared.js';

function computeLifetimeHours(state = {}) {
  let total = 0;
  const history = Array.isArray(state?.metrics?.history) ? state.metrics.history : [];
  history.forEach(entry => {
    if (entry?.summary?.totalTime != null) {
      total += Number(entry.summary.totalTime) || 0;
      return;
    }
    const timeEntries = Array.isArray(entry?.ledger?.time) ? entry.ledger.time : [];
    timeEntries.forEach(item => {
      total += Number(item?.hours) || 0;
    });
  });

  const dailyBucket = state?.metrics?.daily?.time;
  if (dailyBucket && typeof dailyBucket === 'object') {
    Object.values(dailyBucket).forEach(entry => {
      total += Number(entry?.hours) || 0;
    });
  }

  if (total <= 0) {
    const baseHours = Math.max(0, Number(state?.baseTime) || 0);
    const completedDays = Math.max(0, (Number(state?.day) || 1) - 1);
    const usedToday = Math.max(0, baseHours - Math.max(0, Number(state?.timeLeft) || 0));
    total = completedDays * baseHours + usedToday;
  }

  return Math.max(0, total);
}

export function buildMetricEntries(summary = {}, state = {}, dailySummary = {}, highlights = []) {
  const lifetimeEarned = summary?.formatted?.earned || '$0';
  const lifetimeSpent = summary?.formatted?.spent || '$0';
  const totalHours = computeLifetimeHours(state);
  const hoursLabel = formatHours(totalHours);
  const earningsToday = Number(dailySummary?.totalEarnings) || 0;
  const spendToday = Number(dailySummary?.totalSpend) || 0;
  const netToday = earningsToday - spendToday;
  const topAsset = highlights[0] || null;

  return [
    { label: 'Lifetime earned', value: lifetimeEarned },
    { label: 'Lifetime spent', value: lifetimeSpent },
    {
      label: 'Hours invested',
      value: hoursLabel,
      meta:
        totalHours > 0
          ? 'Accumulated from logged hustle + study time.'
          : 'Log time to start your track record.'
    },
    {
      label: 'Top earning asset',
      value: topAsset ? topAsset.name : 'No flagship asset yet',
      meta: topAsset
        ? `${formatCurrency(topAsset.lifetime)} lifetime • ${
            topAsset.lastPayout > 0
              ? `${formatCurrency(topAsset.lastPayout)} last payout`
              : 'Awaiting next payout'
          }`
        : 'Launch a venture to spotlight your first headline project.'
    },
    {
      label: 'Daily net flow',
      value: formatSignedCurrency(netToday),
      meta: `${formatCurrency(earningsToday)} earned • ${formatCurrency(spendToday)} spent today`
    }
  ];
}

export function renderMetricsSection(metrics = []) {
  const { section, body } = createSection('Career Metrics', 'At-a-glance proof of your hustle legacy.');
  const list = document.createElement('dl');
  list.className = 'aboutyou-stats';

  metrics.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'aboutyou-stat';

    const label = document.createElement('dt');
    label.className = 'aboutyou-stat__label';
    label.textContent = entry?.label || '';

    const value = document.createElement('dd');
    value.className = 'aboutyou-stat__value';
    value.textContent = entry?.value || '';

    if (entry?.meta) {
      const meta = document.createElement('span');
      meta.className = 'aboutyou-stat__meta';
      meta.textContent = entry.meta;
      value.appendChild(document.createElement('br'));
      value.appendChild(meta);
    }

    item.append(label, value);
    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}
