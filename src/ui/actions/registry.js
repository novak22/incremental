import { formatHours } from '../../core/helpers.js';
import { getState } from '../../core/state.js';

const DEFAULT_EMPTY_MESSAGE = 'Queue a hustle or upgrade to add new tasks.';

let providers = [];
let providerSequence = 0;

function coerceNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampToZero(value) {
  return Math.max(0, coerceNumber(value));
}

function formatDuration(hours) {
  const numeric = coerceNumber(hours);
  if (numeric <= 0) {
    return formatHours(0);
  }
  return formatHours(Math.max(0, numeric));
}

export function normalizeActionEntries(source = []) {
  const entries = Array.isArray(source?.entries)
    ? source.entries
    : Array.isArray(source)
      ? source
      : [];

  return entries
    .map((entry, index) => {
      const id = entry?.id ?? `todo-${index}`;
      if (!id) return null;

      const durationHours = coerceNumber(entry?.durationHours ?? entry?.timeCost);
      const normalizedDuration = durationHours > 0 ? durationHours : 0;
      const durationText = entry?.durationText || formatDuration(normalizedDuration);

      const payoutText = entry?.payoutText || entry?.payoutLabel || '';
      const meta = entry?.meta || [payoutText, durationText].filter(Boolean).join(' • ');

      const rawRemaining = entry?.remainingRuns == null
        ? null
        : coerceNumber(entry.remainingRuns, null);
      const hasRemaining = Number.isFinite(rawRemaining);
      const remainingRuns = hasRemaining ? Math.max(0, rawRemaining) : null;
      const repeatable = Boolean(entry?.repeatable) || (hasRemaining && remainingRuns > 1);

      const moneyCost = coerceNumber(entry?.moneyCost);
      const normalizedMoney = moneyCost > 0 ? moneyCost : 0;

      const rawPayout = coerceNumber(entry?.payout);
      const normalizedPayout = rawPayout > 0 ? rawPayout : 0;
      const moneyPerHour = normalizedDuration > 0
        ? normalizedPayout / normalizedDuration
        : normalizedPayout;

      const focusCategory = entry?.focusCategory || entry?.category || entry?.type || null;
      const rawUpgradeRemaining = coerceNumber(
        entry?.upgradeRemaining ?? entry?.remaining ?? entry?.requirementsRemaining,
        null
      );
      const upgradeRemaining = Number.isFinite(rawUpgradeRemaining)
        ? Math.max(0, rawUpgradeRemaining)
        : null;
      const orderIndex = Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index;

      const normalizedEntry = {
        id,
        title: entry?.title || 'Action',
        meta,
        onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
        durationHours: normalizedDuration,
        durationText,
        moneyCost: normalizedMoney,
        repeatable,
        remainingRuns,
        payout: normalizedPayout,
        moneyPerHour: Number.isFinite(moneyPerHour) ? moneyPerHour : 0,
        focusCategory,
        upgradeRemaining,
        orderIndex
      };

      if (entry && typeof entry === 'object') {
        Object.keys(entry).forEach(key => {
          if (typeof key === 'string' && key.toLowerCase().includes('bucket')) {
            normalizedEntry[key] = entry[key];
          }
        });
      }

      if (entry?.subtitle) {
        normalizedEntry.subtitle = entry.subtitle;
      }
      if (entry?.description) {
        normalizedEntry.description = entry.description;
      }
      if (entry?.buttonLabel) {
        normalizedEntry.buttonLabel = entry.buttonLabel;
      }
      if (entry?.primaryLabel && !normalizedEntry.buttonLabel) {
        normalizedEntry.buttonLabel = entry.primaryLabel;
      }
      if (entry?.metaClass) {
        normalizedEntry.metaClass = entry.metaClass;
      }
      if (entry?.defaultLabel) {
        normalizedEntry.defaultLabel = entry.defaultLabel;
      }
      if (entry?.payoutText) {
        normalizedEntry.payoutText = entry.payoutText;
      }
      if (entry?.durationText && entry.durationText !== normalizedEntry.durationText) {
        normalizedEntry.durationText = entry.durationText;
      }

      const rawTime = coerceNumber(entry?.timeCost, null);
      if (Number.isFinite(rawTime)) {
        normalizedEntry.timeCost = Math.max(0, rawTime);
      }

      if (!normalizedEntry.timeCost && normalizedEntry.durationHours > 0) {
        normalizedEntry.timeCost = normalizedEntry.durationHours;
      }

      const rawMoney = coerceNumber(entry?.moneyCost, null);
      if (Number.isFinite(rawMoney) && rawMoney > 0) {
        normalizedEntry.moneyCost = rawMoney;
      }

      if (!normalizedEntry.payoutText && entry?.payoutText) {
        normalizedEntry.payoutText = entry.payoutText;
      }

      normalizedEntry.raw = entry;

      return normalizedEntry;
    })
    .filter(Boolean);
}

function createAutoCompletedEntries(summary = {}) {
  const entries = Array.isArray(summary?.timeBreakdown) ? summary.timeBreakdown : [];
  return entries
    .map((entry, index) => {
      const hours = clampToZero(entry?.hours);
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

export function registerActionProvider(provider, priority = 0) {
  if (typeof provider !== 'function') {
    return () => {};
  }
  const record = {
    handler: provider,
    priority: coerceNumber(priority),
    order: providerSequence++
  };
  providers.push(record);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    providers = providers.filter(item => item !== record);
  };
}

export function clearActionProviders() {
  const previous = providers.slice();
  providers = [];
  return () => {
    providers = previous.slice();
  };
}

export function collectActionProviders({ state = {}, summary = {} } = {}) {
  const snapshots = [];

  const activeProviders = providers
    .slice()
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.order - b.order;
    });

  activeProviders.forEach(provider => {
    const handler = provider?.handler;
    if (typeof handler !== 'function') return;

    let result;
    try {
      result = handler({ state, summary });
    } catch (error) {
      result = null;
    }

    if (!result) return;

    const focusCategory = result.focusCategory || null;
    const normalized = normalizeActionEntries(result.entries).map((entry, index) => ({
      ...entry,
      focusCategory: entry.focusCategory || focusCategory,
      orderIndex: Number.isFinite(entry.orderIndex) ? entry.orderIndex : index
    }));

    snapshots.push({
      id: result.id || null,
      focusCategory,
      entries: normalized,
      metrics: result.metrics || {}
    });
  });

  return snapshots;
}

function applyMetrics(target, metrics = {}) {
  if (!metrics || typeof metrics !== 'object') return;

  const keys = [
    'emptyMessage',
    'buttonClass',
    'defaultLabel',
    'hoursAvailable',
    'hoursAvailableLabel',
    'hoursSpent',
    'hoursSpentLabel',
    'moneyAvailable'
  ];

  keys.forEach(key => {
    if (target[key] == null && metrics[key] != null) {
      target[key] = metrics[key];
    }
  });

  if (!target.scroller && metrics.scroller) {
    target.scroller = metrics.scroller;
  }
}

function ensureResourceLabels(queue, state = {}) {
  if (queue.hoursAvailable == null) {
    queue.hoursAvailable = clampToZero(state.timeLeft);
  }

  if (queue.hoursSpent == null) {
    const baseHours = clampToZero(state.baseTime)
      + clampToZero(state.bonusTime)
      + clampToZero(state.dailyBonusTime);
    const available = clampToZero(queue.hoursAvailable);
    queue.hoursSpent = Math.max(0, baseHours - available);
  }

  if (!queue.hoursAvailableLabel && queue.hoursAvailable != null) {
    queue.hoursAvailableLabel = formatHours(clampToZero(queue.hoursAvailable));
  }

  if (!queue.hoursSpentLabel && queue.hoursSpent != null) {
    queue.hoursSpentLabel = formatHours(clampToZero(queue.hoursSpent));
  }

  if (queue.moneyAvailable == null && state.money != null) {
    queue.moneyAvailable = clampToZero(state.money);
  }
}

export function buildActionQueue({ state, summary = {} } = {}) {
  const resolvedState = state || getState() || {};
  const queue = {
    entries: [],
    autoCompletedEntries: createAutoCompletedEntries(summary)
  };

  const activeDay = coerceNumber(resolvedState?.day, null);
  queue.day = Number.isFinite(activeDay) ? activeDay : null;

  const snapshots = collectActionProviders({ state: resolvedState, summary });

  snapshots.forEach(snapshot => {
    queue.entries.push(...snapshot.entries);
    applyMetrics(queue, snapshot.metrics);
  });

  if (!queue.entries.length && !queue.emptyMessage) {
    queue.emptyMessage = DEFAULT_EMPTY_MESSAGE;
  }

  ensureResourceLabels(queue, resolvedState);

  if (!queue.autoCompletedEntries.length) {
    delete queue.autoCompletedEntries;
  }

  if (!queue.scroller) {
    delete queue.scroller;
  }

  return queue;
}

export default {
  registerActionProvider,
  clearActionProviders,
  collectActionProviders,
  buildActionQueue,
  normalizeActionEntries
};
