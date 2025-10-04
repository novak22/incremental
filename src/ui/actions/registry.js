import { formatHours } from '../../core/helpers.js';
import { normalizeEntries as normalizeTodoEntries } from '../views/browser/widgets/todoWidget.js';

const providerRegistry = new Map();

function setMetric(target, key, value) {
  if (value === undefined) return;
  if (key === 'entries' || key === 'autoCompletedEntries') {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    target[key] = value;
    return;
  }
  const current = target[key];
  const isUnset = current === undefined || current === null || (typeof current === 'string' && current.length === 0);
  if (isUnset) {
    target[key] = value;
  }
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeActionEntries(entries = [], { focusCategory } = {}) {
  const normalized = normalizeTodoEntries({ entries });
  if (!focusCategory) {
    return normalized;
  }
  return normalized.map(entry => {
    if (entry?.focusCategory === focusCategory) {
      return entry;
    }
    if (entry?.focusCategory) {
      return entry;
    }
    return { ...entry, focusCategory };
  });
}

export function registerActionProvider(id, provider) {
  if (typeof id !== 'string' || !id) {
    return () => {};
  }
  if (typeof provider !== 'function') {
    return () => {};
  }
  providerRegistry.set(id, provider);
  return () => {
    const existing = providerRegistry.get(id);
    if (existing === provider) {
      providerRegistry.delete(id);
    }
  };
}

export function clearActionProviders() {
  providerRegistry.clear();
}

export function createAutoCompletedEntries(summary = {}) {
  const entries = Array.isArray(summary?.timeBreakdown) ? summary.timeBreakdown : [];
  return entries
    .map((entry, index) => {
      const hours = Math.max(0, toNumber(entry?.hours));
      if (hours <= 0) return null;
      const category = typeof entry?.category === 'string' ? entry.category.toLowerCase() : '';
      const tracksMaintenance = category.startsWith('maintenance');
      const tracksStudy = category.startsWith('study') || category.startsWith('education');
      if (!tracksMaintenance && !tracksStudy) {
        return null;
      }

      const title = entry?.label
        || entry?.definition?.label
        || entry?.definition?.name
        || 'Scheduled work';
      const key = entry?.key || `${category || 'auto'}-${index}`;
      return {
        id: `auto:${key}`,
        title,
        durationHours: hours,
        durationText: formatHours(hours),
        category
      };
    })
    .filter(Boolean);
}

export function buildActionQueue({ state, summary } = {}) {
  const aggregatedMetrics = {};
  const combinedEntries = [];

  for (const provider of providerRegistry.values()) {
    if (typeof provider !== 'function') continue;
    const result = provider({ state: state || {}, summary: summary || {} });
    if (!result) continue;

    const fallbackFocus = result.focusCategory || null;
    const entries = Array.isArray(result.entries) ? result.entries : [];
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      if (!entry.id) return;
      const needsClone = (fallbackFocus && !entry.focusCategory) || !Number.isFinite(entry.orderIndex);
      const normalized = needsClone ? { ...entry } : entry;
      if (fallbackFocus && !normalized.focusCategory) {
        normalized.focusCategory = fallbackFocus;
      }
      if (!Number.isFinite(normalized.orderIndex)) {
        normalized.orderIndex = index;
      }
      combinedEntries.push(normalized);
    });

    if (result.metrics && typeof result.metrics === 'object') {
      Object.entries(result.metrics).forEach(([key, value]) => {
        setMetric(aggregatedMetrics, key, value);
      });
    }
  }

  const queue = { entries: combinedEntries };
  Object.assign(queue, aggregatedMetrics);

  const autoCompletedEntries = createAutoCompletedEntries(summary);
  if (autoCompletedEntries.length) {
    queue.autoCompletedEntries = autoCompletedEntries;
  }

  if (queue.hoursAvailable != null && (queue.hoursAvailableLabel == null || queue.hoursAvailableLabel === '')) {
    const available = Math.max(0, toNumber(queue.hoursAvailable));
    queue.hoursAvailable = available;
    queue.hoursAvailableLabel = formatHours(available);
  }

  if (queue.hoursSpent != null && (queue.hoursSpentLabel == null || queue.hoursSpentLabel === '')) {
    const spent = Math.max(0, toNumber(queue.hoursSpent));
    queue.hoursSpent = spent;
    queue.hoursSpentLabel = formatHours(spent);
  }

  if (queue.emptyMessage == null || queue.emptyMessage === '') {
    queue.emptyMessage = 'Queue a hustle or upgrade to add new tasks.';
  }

  return queue;
}

export default {
  registerActionProvider,
  clearActionProviders,
  buildActionQueue,
  normalizeActionEntries,
  createAutoCompletedEntries
};
