import { DEFAULT_DAY_HOURS } from '../../core/constants.js';
import { getState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { projectIncomeFromBase } from './payout.js';
import { getInstanceQualityRange } from './quality/levels.js';

const VISITS_PER_DOLLAR = 100;
const SUPPORTED_ASSETS = new Set(['blog']);

function shouldSimulateVisits(definition, instance) {
  if (!definition || !SUPPORTED_ASSETS.has(definition.id)) return false;
  if (!instance || instance.status !== 'active') return false;
  if (!instance.maintenanceFundedToday) return false;
  return true;
}

function computeAverageBaseAmount(definition, instance) {
  const range = getInstanceQualityRange(definition, instance);
  const min = Number(range?.min) || 0;
  const max = Number(range?.max) || 0;
  if (max <= 0 && min <= 0) {
    return 0;
  }
  const average = (min + max) / 2;
  return Math.max(0, Math.round(average));
}

function buildVisitSnapshot({ definition, assetState, instance }) {
  const baseAmount = computeAverageBaseAmount(definition, instance);
  if (baseAmount <= 0) {
    return { visitsPerDay: 0, breakdown: null };
  }
  const income = projectIncomeFromBase(definition, assetState, instance, baseAmount);
  const payout = Number(income?.payoutRounded) || 0;
  if (payout <= 0) {
    return { visitsPerDay: 0, breakdown: null };
  }
  const visitsPerDay = payout * VISITS_PER_DOLLAR;
  const entries = Array.isArray(income?.finalEntries)
    ? income.finalEntries.map(entry => {
        const amount = Math.max(0, Math.round(Number(entry?.amount) || 0)) * VISITS_PER_DOLLAR;
        return {
          id: entry?.id || null,
          label: entry?.label || 'Traffic',
          amount,
          views: amount,
          type: entry?.type || 'segment',
          percent: Number.isFinite(Number(entry?.percent)) ? Number(entry.percent) : null
        };
      })
    : [];

  const totalFromEntries = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const diff = visitsPerDay - totalFromEntries;
  if (diff !== 0 && entries.length) {
    entries[entries.length - 1].amount += diff;
    entries[entries.length - 1].views += diff;
  }

  return {
    visitsPerDay,
    breakdown: {
      total: visitsPerDay,
      entries
    }
  };
}

function ensureVisitMetrics(instance) {
  const metrics = instance.metrics || (instance.metrics = {});
  const progress = Number(metrics.dailyVisitProgress);
  metrics.dailyVisitProgress = Number.isFinite(progress) ? progress : 0;
  const dailyViews = Number(metrics.dailyViews);
  metrics.dailyViews = Number.isFinite(dailyViews) ? Math.max(0, Math.floor(dailyViews)) : 0;
  const target = Number(metrics.currentDailyVisitTarget);
  metrics.currentDailyVisitTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  if (!metrics.currentVisitBreakdown || typeof metrics.currentVisitBreakdown !== 'object') {
    metrics.currentVisitBreakdown = null;
  }
  return metrics;
}

function applyVisitProgress(instance, snapshot, hoursElapsed) {
  const metrics = ensureVisitMetrics(instance);
  const visitsPerDay = Number(snapshot?.visitsPerDay) || 0;
  metrics.currentDailyVisitTarget = visitsPerDay;
  metrics.currentVisitBreakdown = snapshot?.breakdown || null;
  if (visitsPerDay <= 0 || hoursElapsed <= 0) {
    return;
  }
  const fractionOfDay = hoursElapsed / DEFAULT_DAY_HOURS;
  const additional = visitsPerDay * fractionOfDay;
  const current = Number(metrics.dailyVisitProgress) || 0;
  const next = current + additional;
  metrics.dailyVisitProgress = next;
  metrics.dailyViews = Math.max(0, Math.floor(next));
}

export function accumulateAssetVisits(hoursElapsed) {
  if (!Number.isFinite(hoursElapsed) || hoursElapsed <= 0) return;
  const state = getState();
  if (!state) return;

  SUPPORTED_ASSETS.forEach(assetId => {
    const definition = getAssetDefinition(assetId);
    const assetState = state.assets?.[assetId];
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (!shouldSimulateVisits(definition, instance)) return;
      const snapshot = buildVisitSnapshot({ definition, assetState, instance });
      applyVisitProgress(instance, snapshot, hoursElapsed);
    });
  });
}

function scaleBreakdown(breakdown, targetTotal) {
  if (!breakdown || typeof breakdown !== 'object') {
    return targetTotal > 0
      ? {
          total: targetTotal,
          entries: []
        }
      : null;
  }
  const entries = Array.isArray(breakdown.entries) ? breakdown.entries.map(entry => ({ ...entry })) : [];
  const baseTotal = Number(breakdown.total) || entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  if (targetTotal <= 0) {
    return null;
  }
  if (baseTotal <= 0 || entries.length === 0) {
    return {
      total: targetTotal,
      entries: []
    };
  }
  const scale = targetTotal / baseTotal;
  let runningTotal = 0;
  const scaledEntries = entries.map(entry => {
    const scaledAmount = Math.round((Number(entry.amount) || 0) * scale);
    runningTotal += scaledAmount;
    return {
      ...entry,
      amount: scaledAmount,
      views: scaledAmount
    };
  });
  const diff = targetTotal - runningTotal;
  if (diff !== 0 && scaledEntries.length) {
    scaledEntries[scaledEntries.length - 1].amount += diff;
    scaledEntries[scaledEntries.length - 1].views += diff;
    runningTotal += diff;
  }
  return {
    total: Math.max(0, runningTotal),
    entries: scaledEntries
  };
}

export function finalizeDailyVisitProgress(instance) {
  if (!instance || !instance.metrics) return;
  const metrics = ensureVisitMetrics(instance);
  const progress = Number(metrics.dailyVisitProgress) || 0;
  const totalVisits = Math.max(0, Math.round(progress));
  if (totalVisits > 0) {
    const currentLifetime = Number(instance.metrics.lifetimeViews) || 0;
    instance.metrics.lifetimeViews = currentLifetime + totalVisits;
    const scaled = scaleBreakdown(metrics.currentVisitBreakdown, totalVisits);
    instance.metrics.lastViewBreakdown = scaled;
  } else {
    instance.metrics.lastViewBreakdown = null;
  }
  metrics.dailyVisitProgress = 0;
  metrics.dailyViews = 0;
  metrics.currentDailyVisitTarget = 0;
  metrics.currentVisitBreakdown = null;
}

export function resetVisitTracking(instance) {
  if (!instance || !instance.metrics) return;
  const metrics = ensureVisitMetrics(instance);
  metrics.dailyVisitProgress = 0;
  metrics.dailyViews = 0;
  metrics.currentDailyVisitTarget = 0;
  metrics.currentVisitBreakdown = null;
}

export const VISIT_CONSTANTS = {
  VISITS_PER_DOLLAR
};
