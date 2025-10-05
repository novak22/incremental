import { formatHours, formatMoney } from '../../core/helpers.js';

export function coerceNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function clampToZero(value) {
  return Math.max(0, coerceNumber(value));
}

export function formatDuration(hours) {
  const numeric = coerceNumber(hours);
  if (numeric <= 0) {
    return formatHours(0);
  }
  return formatHours(Math.max(0, numeric));
}

export function coerceDay(value, fallback = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(numeric));
}

export function coercePositiveNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
}

export function firstPositiveNumber(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return null;
}

export function formatPayoutSummary(amount, schedule) {
  if (!Number.isFinite(amount) || amount <= 0) {
    if (schedule && schedule !== 'onCompletion') {
      return schedule;
    }
    return '';
  }
  if (!schedule || schedule === 'onCompletion') {
    return `$${formatMoney(amount)} on completion`;
  }
  if (schedule === 'daily') {
    return `$${formatMoney(amount)} / day`;
  }
  return `$${formatMoney(amount)} (${schedule})`;
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

      if (entry?.progress && typeof entry.progress === 'object') {
        normalizedEntry.progress = { ...entry.progress };
      }
      if (entry?.instanceId) {
        normalizedEntry.instanceId = entry.instanceId;
      }
      if (entry?.definitionId) {
        normalizedEntry.definitionId = entry.definitionId;
      }
      if (entry?.offerId) {
        normalizedEntry.offerId = entry.offerId;
      }

      normalizedEntry.raw = entry;

      return normalizedEntry;
    })
    .filter(Boolean);
}

export default {
  coerceNumber,
  clampToZero,
  formatDuration,
  coerceDay,
  coercePositiveNumber,
  firstPositiveNumber,
  formatPayoutSummary,
  normalizeActionEntries
};
