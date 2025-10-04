import { getState, getAssetState } from '../../core/state.js';
import { getMetricDefinition } from '../../core/state/registry.js';
import { getDailyMetrics } from '../metrics.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../requirements.js';
import { ASSETS } from '../assets/registry.js';

function resolveMetricDefinition(metricId) {
  if (!metricId) return undefined;
  const definition = getMetricDefinition(metricId);
  if (!definition) return undefined;
  const { id, name, category, type, label } = definition;
  return { id, name, category, type, label };
}

function normalizeCategory(entryCategory, fallbackCategory) {
  const source = entryCategory ?? fallbackCategory;
  if (typeof source === 'string' && source.trim()) {
    return source.trim();
  }
  return 'general';
}

function selectPassiveAssetSources(state = getState()) {
  if (!state) return new Map();
  const summaries = new Map();

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const earningInstances = instances.filter(
      instance => instance?.status === 'active' && Number(instance?.lastIncome) > 0
    );
    if (!earningInstances.length) continue;

    summaries.set(`asset:${definition.id}:payout`, {
      type: 'asset',
      assetId: definition.id,
      name: definition.singular || definition.name,
      count: earningInstances.length
    });
  }

  return summaries;
}

export function selectDailyTimeEntries(state = getState()) {
  if (!state) return [];
  const metrics = getDailyMetrics(state) || {};
  const timeEntries = Object.values(metrics.time || {});

  return timeEntries
    .map(entry => {
      const hours = Number(entry?.hours);
      const numericHours = Number.isFinite(hours) ? hours : 0;
      const definition = resolveMetricDefinition(entry?.key);
      const category = normalizeCategory(entry?.category, definition?.category);
      return {
        key: entry?.key,
        label: entry?.label,
        hours: numericHours,
        category,
        definition
      };
    })
    .filter(entry => entry.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

function classifyPayoutCategory(category) {
  if (category === 'offline') return 'offline';
  if (category === 'passive') return 'passive';
  return 'active';
}

export function selectDailyPayoutEntries(state = getState()) {
  if (!state) return [];
  const metrics = getDailyMetrics(state) || {};
  const payoutEntries = Object.values(metrics.payouts || {});
  const assetSources = selectPassiveAssetSources(state);

  return payoutEntries
    .map(entry => {
      const amount = Number(entry?.amount);
      const numericAmount = Number.isFinite(amount) ? amount : 0;
      const definition = resolveMetricDefinition(entry?.key);
      const rawCategory = normalizeCategory(entry?.category, definition?.category);
      const stream = classifyPayoutCategory(rawCategory);
      const source = assetSources.get(entry?.key);
      return {
        key: entry?.key,
        label: entry?.label,
        amount: numericAmount,
        category: rawCategory,
        stream,
        definition,
        ...(source ? { source } : {})
      };
    })
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function selectDailyCostEntries(state = getState()) {
  if (!state) return [];
  const metrics = getDailyMetrics(state) || {};
  const costEntries = Object.values(metrics.costs || {});

  return costEntries
    .map(entry => {
      const amount = Number(entry?.amount);
      const numericAmount = Number.isFinite(amount) ? amount : 0;
      const definition = resolveMetricDefinition(entry?.key);
      const category = normalizeCategory(entry?.category, definition?.category);
      return {
        key: entry?.key,
        label: entry?.label,
        amount: numericAmount,
        category,
        definition
      };
    })
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function selectStudyProgressEntries(state = getState()) {
  if (!state) return [];
  const entries = [];

  for (const track of Object.values(KNOWLEDGE_TRACKS)) {
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress?.enrolled || progress?.completed) continue;

    const remainingDays = Math.max(0, Number(track.days) - Number(progress.daysCompleted || 0));
    entries.push({
      trackId: track.id,
      name: track.name,
      hoursPerDay: Number(track.hoursPerDay) || 0,
      remainingDays,
      studiedToday: Boolean(progress.studiedToday),
      status: progress.studiedToday ? 'scheduled' : 'waiting'
    });
  }

  return entries;
}
