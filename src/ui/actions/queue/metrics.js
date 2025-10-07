import { formatHours } from '../../../core/helpers.js';
import { clampToZero } from '../utils.js';

const METRIC_KEYS = [
  'emptyMessage',
  'buttonClass',
  'defaultLabel',
  'hoursAvailable',
  'hoursAvailableLabel',
  'hoursSpent',
  'hoursSpentLabel',
  'moneyAvailable',
  'inProgressEntries'
];

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function buildQueueMetrics(state = {}, overrides = {}) {
  const metrics = {};
  METRIC_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      metrics[key] = overrides[key];
    }
  });

  let hoursAvailable = toFiniteNumber(metrics.hoursAvailable);
  if (hoursAvailable == null) {
    hoursAvailable = toFiniteNumber(state?.timeLeft);
  }
  if (hoursAvailable != null) {
    hoursAvailable = clampToZero(hoursAvailable);
    metrics.hoursAvailable = hoursAvailable;
  } else {
    delete metrics.hoursAvailable;
  }

  let hoursSpent = toFiniteNumber(metrics.hoursSpent);
  if (hoursSpent == null && hoursAvailable != null) {
    const baseHours = clampToZero(state?.baseTime)
      + clampToZero(state?.bonusTime)
      + clampToZero(state?.dailyBonusTime);
    hoursSpent = Math.max(0, baseHours - hoursAvailable);
  }
  if (hoursSpent != null) {
    hoursSpent = clampToZero(hoursSpent);
    metrics.hoursSpent = hoursSpent;
  } else {
    delete metrics.hoursSpent;
  }

  if (!Object.prototype.hasOwnProperty.call(metrics, 'hoursAvailableLabel') && hoursAvailable != null) {
    metrics.hoursAvailableLabel = formatHours(hoursAvailable);
  }
  if (!Object.prototype.hasOwnProperty.call(metrics, 'hoursSpentLabel') && hoursSpent != null) {
    metrics.hoursSpentLabel = formatHours(hoursSpent);
  }

  let moneyAvailable = toFiniteNumber(metrics.moneyAvailable);
  if (moneyAvailable == null) {
    moneyAvailable = toFiniteNumber(state?.money);
  }
  if (moneyAvailable != null) {
    moneyAvailable = clampToZero(moneyAvailable);
    metrics.moneyAvailable = moneyAvailable;
  } else {
    delete metrics.moneyAvailable;
  }

  return metrics;
}

export function mergeQueueMetrics(target = {}, metrics = {}, state = {}) {
  if (!target || typeof target !== 'object' || !metrics || typeof metrics !== 'object') {
    return target;
  }

  const resolved = buildQueueMetrics(state, metrics);
  METRIC_KEYS.forEach(key => {
    if (resolved[key] == null) {
      return;
    }
    if (target[key] == null) {
      target[key] = resolved[key];
    }
  });

  if (!target.scroller && metrics.scroller) {
    target.scroller = metrics.scroller;
  }

  return target;
}

export function mergeQueueSnapshotMetrics(target = {}, snapshots = [], state = {}) {
  if (!target || typeof target !== 'object') {
    return target;
  }
  const list = Array.isArray(snapshots) ? snapshots : [];
  list.forEach(snapshot => {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }
    if (snapshot.metrics) {
      mergeQueueMetrics(target, snapshot.metrics, state);
    }
  });
  return target;
}

export function applyFinalQueueMetrics(target = {}, state = {}) {
  if (!target || typeof target !== 'object') {
    return target;
  }
  Object.assign(target, buildQueueMetrics(state, target));
  return target;
}

export default {
  buildQueueMetrics,
  mergeQueueMetrics,
  mergeQueueSnapshotMetrics,
  applyFinalQueueMetrics
};
