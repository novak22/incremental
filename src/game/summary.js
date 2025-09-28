import { getState, getAssetState } from '../core/state.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from './requirements.js';
import { getDailyMetrics } from './metrics.js';
import { ASSETS } from './assets/registry.js';

export function computeDailySummary(state = getState()) {
  if (!state) {
    return {
      totalTime: 0,
      setupHours: 0,
      maintenanceHours: 0,
      otherTimeHours: 0,
      totalEarnings: 0,
      passiveEarnings: 0,
      activeEarnings: 0,
      totalSpend: 0,
      upkeepSpend: 0,
      investmentSpend: 0,
      knowledgeInProgress: 0,
      knowledgePendingToday: 0,
      timeBreakdown: [],
      earningsBreakdown: [],
      passiveBreakdown: [],
      spendBreakdown: [],
      studyBreakdown: []
    };
  }

  const getCategory = entry => entry?.category || 'general';
  const sumEntries = (entries, field, predicate = () => true) =>
    entries.reduce((total, entry) => {
      if (!predicate(entry)) return total;
      const value = Number(entry?.[field]);
      return Number.isFinite(value) ? total + value : total;
    }, 0);

  const metrics = getDailyMetrics(state) || {};
  const timeEntries = Object.values(metrics.time || {});
  const earningsEntries = Object.values(metrics.payouts || {});
  const passiveEntries = earningsEntries.filter(entry =>
    ['passive', 'offline'].includes(getCategory(entry))
  );
  const activeEntries = earningsEntries.filter(entry => !['passive', 'offline'].includes(getCategory(entry)));
  const spendEntries = Object.values(metrics.costs || {});

  const totalTime = sumEntries(timeEntries, 'hours');
  const setupHours = sumEntries(timeEntries, 'hours', entry => getCategory(entry) === 'setup');
  const maintenanceHours = sumEntries(timeEntries, 'hours', entry => getCategory(entry) === 'maintenance');
  const otherTimeHours = Math.max(0, totalTime - setupHours - maintenanceHours);

  const formatTimeBreakdown = timeEntries
    .filter(entry => Number(entry?.hours) > 0)
    .sort((a, b) => Number(b.hours) - Number(a.hours))
    .map(entry => ({
      label: entry.label,
      value: `${formatHours(Number(entry.hours))} today`
    }));

  const totalEarnings = sumEntries(earningsEntries, 'amount');
  const passiveEarnings = sumEntries(passiveEntries, 'amount');
  const activeEarnings = sumEntries(activeEntries, 'amount');

  const formatIncomeBreakdown = entries =>
    entries
      .filter(entry => Number(entry?.amount) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .map(entry => ({
        key: entry.key,
        label: entry.label,
        value: `$${formatMoney(Number(entry.amount))} today`
      }));

  const passiveAssetSummaries = new Map();

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const earningInstances = instances.filter(
      instance => instance.status === 'active' && Number(instance.lastIncome) > 0
    );
    if (!earningInstances.length) continue;
    passiveAssetSummaries.set(`asset:${definition.id}:payout`, {
      count: earningInstances.length,
      label: definition.singular || definition.name
    });
  }

  let passiveBreakdown = formatIncomeBreakdown(passiveEntries).map(entry => {
    if (!entry?.key) return entry;
    const summary = passiveAssetSummaries.get(entry.key);
    if (!summary) return entry;
    const iconMatch = entry.label.match(/^([^\w]*)/);
    const prefix = iconMatch ? iconMatch[1] : '';
    const decoratedLabel = summary.count > 1
      ? `${summary.label} (${summary.count})`
      : summary.label;
    const parts = [prefix ? prefix.trim() : '', decoratedLabel].filter(Boolean);
    return {
      ...entry,
      label: parts.join(' ')
    };
  });
  const earningsBreakdown = formatIncomeBreakdown(activeEntries);

  const totalSpend = sumEntries(spendEntries, 'amount');
  const upkeepSpend = sumEntries(spendEntries, 'amount', entry =>
    ['maintenance', 'payroll'].includes(getCategory(entry))
  );
  const investmentSpend = sumEntries(spendEntries, 'amount', entry =>
    ['setup', 'investment', 'upgrade', 'consumable'].includes(getCategory(entry))
  );

  const spendBreakdown = spendEntries
    .filter(entry => Number(entry?.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .map(entry => ({
      label: entry.label,
      value: `$${formatMoney(Number(entry.amount))} today`
    }));

  let knowledgeInProgress = 0;
  let knowledgePendingToday = 0;
  const studyBreakdown = [];

  for (const track of Object.values(KNOWLEDGE_TRACKS)) {
    const progress = getKnowledgeProgress(track.id, state);
    if (progress.completed) continue;
    const inProgress = progress.daysCompleted > 0 || progress.studiedToday;
    if (inProgress) {
      knowledgeInProgress += 1;
    }
    if (!progress.studiedToday) {
      knowledgePendingToday += 1;
    }

    if (inProgress) {
      const remainingDays = Math.max(0, track.days - progress.daysCompleted);
      const status = progress.studiedToday ? 'studied' : 'waiting';
      studyBreakdown.push({
        label: `📘 ${track.name}`,
        value: `${formatHours(track.hoursPerDay)} / day • ${remainingDays} day${remainingDays === 1 ? '' : 's'} left (${status})`
      });
    }
  }

  return {
    totalTime,
    setupHours,
    maintenanceHours,
    otherTimeHours,
    totalEarnings,
    passiveEarnings,
    activeEarnings,
    totalSpend,
    upkeepSpend,
    investmentSpend,
    knowledgeInProgress,
    knowledgePendingToday,
    timeBreakdown: formatTimeBreakdown,
    earningsBreakdown,
    spendBreakdown,
    passiveBreakdown,
    studyBreakdown
  };
}

export function formatTimePair(hours) {
  return formatHours(Math.max(0, hours));
}
