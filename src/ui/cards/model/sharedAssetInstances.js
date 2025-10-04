import { ensureArray } from '../../../core/helpers.js';
import { getAssignableNicheSummaries } from '../../../game/assets/niches.js';
import { clampNumber } from './sharedQuality.js';

export function calculateAveragePayout(instance, state) {
  if (!instance || instance.status !== 'active') {
    return 0;
  }
  const totalIncome = Math.max(0, clampNumber(instance.totalIncome));
  const createdOnDay = Math.max(1, clampNumber(instance.createdOnDay) || 1);
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const daysActive = Math.max(1, currentDay - createdOnDay + 1);
  if (totalIncome <= 0) {
    return 0;
  }
  return totalIncome / daysActive;
}

export function describeInstanceStatus(instance, definition, options = {}) {
  const { activeLabel = 'Active', setupLabel } = options;
  const status = instance?.status === 'active' ? 'active' : 'setup';
  if (status === 'active') {
    return { id: 'active', label: typeof activeLabel === 'function' ? activeLabel({ instance, definition }) : activeLabel };
  }

  const totalDays = Math.max(0, clampNumber(definition?.setup?.days));
  const completed = Math.max(0, clampNumber(instance?.daysCompleted));
  const remaining = Math.max(0, clampNumber(instance?.daysRemaining));
  const progress = totalDays > 0 ? Math.min(1, completed / totalDays) : 0;

  const buildSetupLabel = () => {
    if (typeof setupLabel === 'function') {
      return setupLabel({ completed, totalDays, remaining, instance, definition });
    }
    if (typeof setupLabel === 'string' && setupLabel.trim()) {
      return setupLabel;
    }
    return `Setup ${completed}/${totalDays} days`;
  };

  return {
    id: 'setup',
    label: buildSetupLabel(),
    remaining,
    progress
  };
}

export function estimateLifetimeSpend(definition, instance, state) {
  const setupCost = Math.max(0, clampNumber(definition?.setup?.cost));
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));
  if (upkeepCost <= 0) {
    return setupCost;
  }
  const createdOnDay = Math.max(1, clampNumber(instance?.createdOnDay) || 1);
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const elapsedDays = Math.max(0, currentDay - createdOnDay + 1);
  return setupCost + upkeepCost * elapsedDays;
}

export function buildPayoutBreakdown(instance, options = {}) {
  const { fallbackId = 'modifier', fallbackLabel = 'Modifier', decorate } = options;
  const breakdown = instance?.lastIncomeBreakdown;
  const entries = ensureArray(breakdown?.entries).map(entry => {
    const baseEntry = {
      id: entry?.id || entry?.label || fallbackId,
      label: entry?.label || fallbackLabel,
      amount: Math.max(0, clampNumber(entry?.amount)),
      percent: Number.isFinite(Number(entry?.percent)) ? Number(entry.percent) : null,
      type: entry?.type || fallbackId
    };
    if (typeof decorate === 'function') {
      const decorated = decorate(baseEntry, entry, instance);
      return decorated || baseEntry;
    }
    return baseEntry;
  });
  const total = Math.max(0, clampNumber(breakdown?.total || instance?.lastIncome));
  return { entries, total };
}

export function mapNicheOptions(definition, state, options = {}) {
  const { includeDelta = false, decorate } = options;
  return ensureArray(getAssignableNicheSummaries(definition, state))
    .map(entry => {
      const baseOption = {
        id: entry?.definition?.id || '',
        name: entry?.definition?.name || entry?.definition?.id || '',
        summary: entry?.popularity?.summary || '',
        label: entry?.popularity?.label || '',
        multiplier: entry?.popularity?.multiplier || 1,
        score: clampNumber(entry?.popularity?.score)
      };
      if (includeDelta) {
        baseOption.delta = Number.isFinite(Number(entry?.popularity?.delta))
          ? Number(entry.popularity.delta)
          : null;
      }
      if (typeof decorate === 'function') {
        const decorated = decorate(baseOption, entry, definition);
        return decorated || baseOption;
      }
      return baseOption;
    })
    .filter(option => option.id && option.name);
}

export function buildDefaultSummary(instances = [], options = {}) {
  const { fallbackLabel = 'resource', includeNeedsUpkeep = false, activeMeta, setupMeta, emptyMeta } = options;
  const total = instances.length;
  const activeInstances = instances.filter(entry => entry?.status?.id === 'active');
  const active = activeInstances.length;
  const setup = Math.max(0, total - active);
  const needsUpkeep = activeInstances.filter(entry => !entry.maintenanceFunded).length;
  const context = { total, active, setup, fallbackLabel };

  const resolveMeta = (value, fallback) => {
    if (typeof value === 'function') {
      return value(context);
    }
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return fallback;
  };

  let meta;
  if (active > 0) {
    const defaultActive = `${active} ${fallbackLabel}${active === 1 ? '' : 's'} live`;
    meta = resolveMeta(activeMeta, defaultActive);
  } else if (setup > 0) {
    meta = resolveMeta(setupMeta, 'Launch prep underway');
  } else {
    const defaultEmpty = `Launch your first ${fallbackLabel}`;
    meta = resolveMeta(emptyMeta, defaultEmpty);
  }

  const summary = { total, active, setup, meta };
  if (includeNeedsUpkeep) {
    summary.needsUpkeep = needsUpkeep;
  }
  return summary;
}
