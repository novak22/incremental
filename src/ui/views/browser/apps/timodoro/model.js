import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { buildSummaryPresentations } from '../../../../dashboard/formatters.js';
import { buildQueueMetrics } from '../../../../actions/queueService.js';
import { buildQueueEntryCollection } from '../../../../actions/models.js';

export function formatCurrency(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 1e-4) {
    return '$0';
  }
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

export function computeTimeCap(state = {}) {
  const base = Number(state?.baseTime) || 0;
  const bonus = Number(state?.bonusTime) || 0;
  const daily = Number(state?.dailyBonusTime) || 0;
  return Math.max(0, base + bonus + daily);
}

export function normalizeCompletedCategory(category) {
  const label = typeof category === 'string' ? category.toLowerCase() : '';
  if (['study', 'education', 'learning', 'knowledge', 'class'].includes(label)) {
    return 'education';
  }
  if (['maintenance', 'upkeep', 'care', 'support'].includes(label)) {
    return 'upkeep';
  }
  if (['setup', 'upgrade', 'investment', 'build', 'construction', 'improvement'].includes(label)) {
    return 'upgrades';
  }
  return 'hustles';
}

export function buildCompletedGroups(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const timeEntries = Array.isArray(presentations.timeEntries) ? presentations.timeEntries : [];
  const groups = {
    hustles: [],
    education: [],
    upkeep: [],
    upgrades: []
  };

  timeEntries.forEach(entry => {
    if (!entry) return;
    const bucket = normalizeCompletedCategory(entry.category);
    const hours = Math.max(0, Number(entry.hours) || 0);
    if (hours <= 0) return;
    const detail = `${formatHours(hours)} logged`;
    groups[bucket].push({
      name: entry.label,
      detail
    });
  });

  return groups;
}

export function buildRecurringEntries(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const timeEntries = Array.isArray(presentations.timeEntries) ? presentations.timeEntries : [];
  const studyEntries = Array.isArray(presentations.studyEntries) ? presentations.studyEntries : [];

  const maintenance = timeEntries
    .filter(entry => entry && entry.category === 'maintenance')
    .map(entry => ({
      name: entry.label,
      detail: `${formatHours(entry.hours)} logged today • Maintenance`
    }));

  const study = studyEntries.map(entry => ({
    name: entry.label,
    detail: entry.value
  }));

  return [...maintenance, ...study];
}

export function buildSummaryEntries(summary = {}, todoModel = {}, state = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const activeEarnings = Math.max(0, Number(summary?.activeEarnings) || 0);
  const passiveEarnings = Math.max(0, Number(summary?.passiveEarnings) || 0);
  const totalEarnings = Math.max(0, Number(summary?.totalEarnings) || 0);
  const timeCap = computeTimeCap(state);
  const queueMetrics = buildQueueMetrics(state, todoModel);
  const hoursAvailable = Number.isFinite(queueMetrics?.hoursAvailable)
    ? Math.max(0, queueMetrics.hoursAvailable)
    : Math.max(0, Number(state?.timeLeft) || 0);
  const hoursSpent = Number.isFinite(queueMetrics?.hoursSpent)
    ? Math.max(0, queueMetrics.hoursSpent)
    : Math.max(0, timeCap - hoursAvailable);
  const percentUsed = timeCap > 0 ? Math.min(100, Math.round((hoursSpent / timeCap) * 100)) : 0;

  return [
    {
      label: 'Hours logged',
      value: formatHours(totalHours),
      note: totalHours > 0 ? 'Across all workstreams today.' : 'No focus hours logged yet.'
    },
    {
      label: 'Earnings today',
      value: formatCurrency(totalEarnings),
      note: totalEarnings > 0
        ? `${formatCurrency(activeEarnings)} active • ${formatCurrency(passiveEarnings)} passive`
        : 'Ship a gig to see cash roll in.'
    },
    {
      label: 'Time used',
      value: `${percentUsed}%`,
      note: timeCap > 0
        ? `${formatHours(hoursSpent)} of ${formatHours(timeCap)} booked.`
        : 'Daily cap not set yet.'
    }
  ];
}

export function buildBreakdown(summary = {}, todoModel = {}, state = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const maintenance = Math.max(0, Number(summary?.maintenanceHours) || 0);
  const active = Math.max(0, totalHours - maintenance);
  const queueMetrics = buildQueueMetrics(state, todoModel);
  const hoursAvailable = Number.isFinite(queueMetrics?.hoursAvailable)
    ? Math.max(0, queueMetrics.hoursAvailable)
    : Math.max(0, Number(state?.timeLeft) || 0);

  return [
    { label: 'Active work', value: formatHours(active) },
    { label: 'Upkeep & care', value: formatHours(maintenance) },
    { label: 'Hours remaining', value: formatHours(hoursAvailable) }
  ];
}

export function buildMeta(summary = {}, completedGroups = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const totalEarnings = Math.max(0, Number(summary?.totalEarnings) || 0);
  const taskCount = Object.values(completedGroups || {}).reduce((total, group) => {
    if (!Array.isArray(group)) return total;
    return total + group.length;
  }, 0);
  const parts = [];
  if (taskCount > 0) {
    parts.push(`${taskCount} task${taskCount === 1 ? '' : 's'} logged`);
  }
  if (totalHours > 0) {
    parts.push(`${formatHours(totalHours)} logged`);
  }
  if (totalEarnings > 0) {
    parts.push(`${formatCurrency(totalEarnings)} earned`);
  }
  return parts.length ? parts.join(' • ') : 'No hustle data yet.';
}

export function buildTimodoroViewModel(state = {}, summary = {}, todoModel = {}) {
  const completedGroups = buildCompletedGroups(summary);
  const recurringEntries = buildRecurringEntries(summary);
  const summaryEntries = buildSummaryEntries(summary, todoModel, state);
  const breakdownEntries = buildBreakdown(summary, todoModel, state);
  const todoEntries = buildQueueEntryCollection(todoModel);
  const todoEmptyMessage = todoModel?.emptyMessage;
  const queueMetrics = buildQueueMetrics(state, todoModel);
  const todoHoursAvailable = Number.isFinite(queueMetrics?.hoursAvailable)
    ? Math.max(0, queueMetrics.hoursAvailable)
    : null;
  const todoMoneyAvailable = Number.isFinite(queueMetrics?.moneyAvailable)
    ? Math.max(0, queueMetrics.moneyAvailable)
    : null;

  const availableLabel = queueMetrics?.hoursAvailableLabel
    || formatHours(Number(queueMetrics?.hoursAvailable) || Number(state?.timeLeft) || 0);
  const timeCap = computeTimeCap(state);
  const hoursSpent = Number.isFinite(queueMetrics?.hoursSpent)
    ? Math.max(0, queueMetrics.hoursSpent)
    : Math.max(0, timeCap - (Number(state?.timeLeft) || 0));
  const spentLabel = queueMetrics?.hoursSpentLabel || formatHours(hoursSpent);

  const meta = buildMeta(summary, completedGroups);

  return {
    completedGroups,
    recurringEntries,
    summaryEntries,
    breakdownEntries,
    todoEntries,
    todoEmptyMessage,
    todoHoursAvailable,
    todoMoneyAvailable,
    hoursAvailableLabel: availableLabel,
    hoursSpentLabel: spentLabel,
    meta
  };
}
