import { formatDays, formatHours, formatList, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import {
  createAssetInstance,
  getAssetDefinition,
  getAssetState,
  getState
} from '../../core/state.js';
import { addMoney, spendMoney } from '../currency.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { spendTime } from '../time.js';
import { assetRequirementsMetById } from '../requirements.js';
import {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution
} from '../metrics.js';
import {
  getInstanceQualityRange,
  getOverallQualityRange,
  getQualityLevelSummary,
  getQualityTracks
} from './quality.js';
import { awardSkillProgress } from '../skills/index.js';
import { getAssetEffectMultiplier } from '../upgrades/effects.js';
import { getInstanceNicheEffect } from './niches.js';

function fallbackAssetMetricId(definitionId, scope, type) {
  if (!definitionId) return null;
  if (scope === 'payout' && type === 'payout') {
    return `asset:${definitionId}:payout`;
  }
  if (scope === 'sale' && type === 'payout') {
    return `asset:${definitionId}:sale`;
  }
  const suffix = type === 'payout' ? 'payout' : type;
  return `asset:${definitionId}:${scope}-${suffix}`;
}

function getEffectiveSetupHours(definition) {
  const base = Number(definition.setup?.hoursPerDay) || 0;
  if (base <= 0) return base;
  const effect = getAssetEffectMultiplier(definition, 'setup_time_mult', { actionType: 'setup' });
  return base * (Number.isFinite(effect.multiplier) ? effect.multiplier : 1);
}

function getAssetMetricId(definition, scope, type) {
  if (!definition) return null;
  const metricIds = definition.metricIds || {};
  const scoped = metricIds[scope];
  if (scoped && typeof scoped === 'object') {
    const value = scoped[type];
    if (value) return value;
  }
  return fallbackAssetMetricId(definition.id, scope, type);
}

export function buildAssetAction(definition, labels = {}) {
  return {
    id: 'launch',
    label: () => assetActionLabel(definition, labels),
    className: 'primary',
    disabled: () => isAssetPurchaseDisabled(definition),
    onClick: () => startAsset(definition)
  };
}

function assetActionLabel(definition, labels) {
  const assetState = getAssetState(definition.id);
  const first = labels.first || `Launch ${definition.singular || definition.name}`;
  const repeat = labels.repeat || `Add Another ${definition.singular || definition.name}`;
  return assetState.instances.length ? repeat : first;
}

function isAssetPurchaseDisabled(definition) {
  if (!assetRequirementsMetById(definition.id)) return true;
  const state = getState();
  const setupHours = getEffectiveSetupHours(definition);
  const setupCost = Number(definition.setup?.cost) || 0;
  if (setupHours > 0 && state.timeLeft < setupHours) return true;
  if (setupCost > 0 && state.money < setupCost) return true;
  return false;
}

function startAsset(definition) {
  executeAction(() => {
    if (!assetRequirementsMetById(definition.id)) {
      addLog(
        `You still need to meet the requirements before starting ${definition.singular || definition.name}.`,
        'info'
      );
      return;
    }

    const state = getState();
    const setupHours = getEffectiveSetupHours(definition);
    const setupCost = Number(definition.setup?.cost) || 0;
    if (setupHours > 0 && state.timeLeft < setupHours) {
      addLog('You ran out of hours today. Tackle setup tomorrow after resting.', 'warning');
      return;
    }
    if (setupCost > 0 && state.money < setupCost) {
      addLog('You need more cash before covering that setup cost.', 'warning');
      return;
    }

    if (setupCost > 0) {
      spendMoney(setupCost);
      recordCostContribution({
        key: getAssetMetricId(definition, 'setup', 'cost'),
        label: `💵 ${definition.singular || definition.name} setup`,
        amount: setupCost,
        category: 'setup'
      });
    }
    if (setupHours > 0) {
      spendTime(setupHours);
      recordTimeContribution({
        key: getAssetMetricId(definition, 'setup', 'time'),
        label: `🚀 ${definition.singular || definition.name} prep`,
        hours: setupHours,
        category: 'setup'
      });
    }

    awardSkillProgress({
      skills: definition.skills?.setup,
      timeSpentHours: setupHours,
      moneySpent: setupCost,
      label: definition.name
    });

    const assetState = getAssetState(definition.id);
    const instance = createAssetInstance(definition, {
      setupFundedToday: setupHours > 0
    });
    assetState.instances.push(instance);

    const label = instanceLabel(definition, assetState.instances.length - 1);
    const message = definition.messages?.setupStarted
      ? definition.messages.setupStarted(label, assetState, instance)
      : `You kicked off ${label}. Keep investing time until it launches.`;
    addLog(message, 'passive');
  });
  checkDayEnd();
}

export function ownedDetail(definition) {
  const assetState = getAssetState(definition.id);
  const total = assetState.instances.length;
  if (!total) {
    return '📦 Owned: <strong>0</strong> (ready for your first build)';
  }
  const active = assetState.instances.filter(instance => instance.status === 'active').length;
  const setup = total - active;
  const parts = [];
  if (active) parts.push(`${active} active`);
  if (setup) parts.push(`${setup} in setup`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : '';
  return `📦 Owned: <strong>${total}</strong>${suffix}`;
}

export function setupDetail(definition) {
  const days = Number(definition.setup?.days) || 0;
  const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
  if (days <= 0 && hoursPerDay <= 0) {
    return '⏳ Setup: <strong>Instant</strong>';
  }
  if (days <= 1) {
    return `⏳ Setup: <strong>${formatHours(hoursPerDay)} investment</strong>`;
  }
  return `⏳ Setup: <strong>${formatDays(days)} · ${formatHours(hoursPerDay)}/day</strong>`;
}

export function setupCostDetail(definition) {
  const cost = Number(definition.setup?.cost) || 0;
  return `💵 Setup Cost: <strong>$${formatMoney(cost)}</strong>`;
}

export function formatMaintenanceSummary(definition) {
  const maintenance = definition?.maintenance || {};
  const hours = Number(maintenance.hours) || 0;
  const cost = Number(maintenance.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return {
    parts,
    hasUpkeep: parts.length > 0
  };
}

export function maintenanceDetail(definition) {
  const summary = formatMaintenanceSummary(definition);
  if (!summary.hasUpkeep) {
    return '🛠 Maintenance: <strong>None</strong>';
  }
  return `🛠 Maintenance: <strong>${summary.parts.join(' + ')}</strong>`;
}

export function incomeDetail(definition) {
  const { min, max } = getDailyIncomeRange(definition);
  return `💸 Income: <strong>$${formatMoney(min)} - $${formatMoney(max)} / day</strong> (quality-scaled)`;
}

export function latestYieldDetail(definition) {
  const assetState = getAssetState(definition.id);
  const active = assetState.instances.filter(instance => instance.status === 'active');
  if (!active.length) {
    return '📊 Latest Yield: <strong>$0</strong> (no active instances)';
  }
  const average = active.reduce((sum, instance) => sum + (Number(instance.lastIncome) || 0), 0) / active.length;
  return `📊 Latest Yield: <strong>$${formatMoney(Math.round(average))}</strong> avg per active instance`;
}

export function instanceLabel(definition, index) {
  const base = definition.singular || definition.name;
  return `${base} #${index + 1}`;
}

export function calculateAssetSalePrice(instance) {
  const lastIncome = Math.max(0, Number(instance?.lastIncome) || 0);
  const basePrice = Math.max(0, Math.round(lastIncome) * 3);
  const qualityLevel = Number(instance?.quality?.level);
  const qualityMultiplier = Number.isFinite(qualityLevel) ? Math.max(1, Math.floor(qualityLevel) + 1) : 1;
  return Math.max(0, Math.round(basePrice * qualityMultiplier));
}

export function sellAssetInstance(definition, instanceId) {
  if (!definition || !instanceId) return false;

  let sold = false;

  executeAction(() => {
    const assetState = getAssetState(definition.id);
    const instances = assetState.instances || [];
    const index = instances.findIndex(instance => instance.id === instanceId);
    if (index === -1) return false;

    const instance = instances[index];
    const price = calculateAssetSalePrice(instance);
    const label = instanceLabel(definition, index);

    if (price > 0) {
      addMoney(price, `${label} sold off for $${formatMoney(price)}. Fresh funds unlocked!`, 'passive');
      recordPayoutContribution({
        key: getAssetMetricId(definition, 'sale', 'payout'),
        label: `🏷️ ${definition.singular || definition.name} sale`,
        amount: price,
        category: 'sale'
      });
    } else {
      addLog(`${label} was scrapped for parts—no earnings yet, so no cash back.`, 'info');
    }

    instances.splice(index, 1);
    sold = true;
  });

  return sold;
}

export function getDailyIncomeRange(definition) {
  return getOverallQualityRange(definition);
}

export function rollDailyIncome(definition, assetState, instance) {
  const { min, max } = getInstanceQualityRange(definition, instance);
  const roll = min + Math.random() * Math.max(0, max - min);
  const baseAmount = Math.max(0, Math.round(roll));

  let finalAmount = baseAmount;
  const contributions = [
    {
      id: 'base',
      label: 'Base quality payout',
      amount: baseAmount,
      type: 'base',
      percent: null
    }
  ];

  const modifier = definition.income?.modifier;
  if (typeof modifier === 'function') {
    const recorded = [];
    const context = {
      definition,
      assetState,
      instance,
      baseAmount,
      recordModifier(label, amount, meta = {}) {
        if (!label) return;
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount === 0) return;
        recorded.push({
          id: meta.id || null,
          label,
          amount: numericAmount,
          type: meta.type || 'modifier',
          percent: Number.isFinite(Number(meta.percent)) ? Number(meta.percent) : null
        });
      }
    };

    const rawResult = modifier(baseAmount, context);
    if (rawResult && typeof rawResult === 'object' && !Number.isFinite(Number(rawResult))) {
      if (Number.isFinite(Number(rawResult.amount))) {
        finalAmount = Number(rawResult.amount);
      }
      if (Array.isArray(rawResult.breakdown)) {
        rawResult.breakdown.forEach(entry => {
          if (!entry) return;
          const numericAmount = Number(entry.amount);
          if (!Number.isFinite(numericAmount) || numericAmount === 0) return;
          recorded.push({
            id: entry.id || null,
            label: entry.label || 'Modifier',
            amount: numericAmount,
            type: entry.type || 'modifier',
            percent: Number.isFinite(Number(entry.percent)) ? Number(entry.percent) : null
          });
        });
      }
    } else if (Number.isFinite(Number(rawResult))) {
      finalAmount = Number(rawResult);
    }

    recorded.forEach(entry => {
      contributions.push({
        id: entry.id,
        label: entry.label,
        amount: entry.amount,
        type: entry.type,
        percent: entry.percent
      });
    });
  }

  const nicheEffect = getInstanceNicheEffect(instance);
  if (nicheEffect) {
    const before = finalAmount;
    const adjusted = before * nicheEffect.multiplier;
    finalAmount = adjusted;
    const delta = adjusted - before;
    if (Math.abs(delta) > 0.01) {
      contributions.push({
        id: `niche:${nicheEffect.id}`,
        label: `${nicheEffect.definition?.name || 'Niche'} pulse`,
        amount: delta,
        type: 'niche',
        percent: nicheEffect.multiplier - 1
      });
    }
  }

  let roundedTotal = 0;
  const baseEntries = contributions.map(entry => {
    const amount = Math.round(Number(entry.amount) || 0);
    roundedTotal += amount;
    return {
      id: entry.id,
      label: entry.label,
      amount,
      type: entry.type,
      percent: entry.percent
    };
  });

  const finalRounded = Math.max(0, Math.round(Number(finalAmount) || 0));
  const diff = finalRounded - roundedTotal;
  if (diff !== 0 && baseEntries.length) {
    const targetIndex = baseEntries.length > 1 ? baseEntries.length - 1 : 0;
    baseEntries[targetIndex].amount += diff;
    roundedTotal += diff;
  }

  let payoutTotal = Math.max(0, roundedTotal);
  const upgradeEffect = getAssetEffectMultiplier(definition, 'payout_mult', {
    actionType: 'payout'
  });
  const upgradeEntries = [];
  if (payoutTotal > 0 && Number.isFinite(upgradeEffect.multiplier) && upgradeEffect.multiplier !== 1) {
    const targetTotal = payoutTotal * upgradeEffect.multiplier;
    let running = payoutTotal;
    upgradeEffect.sources.forEach((source, index) => {
      const before = running;
      const factor = Number.isFinite(source.multiplier) ? source.multiplier : 1;
      running *= factor;
      if (index === upgradeEffect.sources.length - 1) {
        running = targetTotal;
      }
      const delta = running - before;
      if (Math.abs(delta) > 0.01) {
        upgradeEntries.push({
          id: source.id,
          label: `${source.label} boost`,
          amount: delta,
          type: 'upgrade',
          percent: Number.isFinite(factor) ? factor - 1 : null
        });
      }
    });
    payoutTotal = Math.max(0, running);
  }

  const payoutRounded = Math.max(0, Math.round(payoutTotal));
  let combinedRounded = Math.max(0, roundedTotal);
  const roundedUpgradeEntries = upgradeEntries.map(entry => {
    const amount = Math.round(Number(entry.amount) || 0);
    combinedRounded += amount;
    return { ...entry, amount };
  });

  const upgradeDiff = payoutRounded - combinedRounded;
  if (upgradeDiff !== 0) {
    if (roundedUpgradeEntries.length) {
      roundedUpgradeEntries[roundedUpgradeEntries.length - 1].amount += upgradeDiff;
      combinedRounded += upgradeDiff;
    } else if (baseEntries.length) {
      baseEntries[baseEntries.length - 1].amount += upgradeDiff;
      combinedRounded += upgradeDiff;
    }
  }

  const finalEntries = [...baseEntries, ...roundedUpgradeEntries];

  if (instance) {
    instance.lastIncomeBreakdown = {
      total: payoutRounded,
      entries: finalEntries
    };
  }

  return payoutRounded;
}

export function getIncomeRangeForDisplay(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return { min: 0, max: 0 };
  return getDailyIncomeRange(definition);
}

export function qualitySummaryDetail(definition) {
  const tracks = getQualityTracks(definition);
  const summary = getQualityLevelSummary(definition);
  if (!summary.length) return '';
  const highest = summary.at(-1);
  const lowest = summary[0];
  const incomeRange = getDailyIncomeRange(definition);
  const pieces = [`⭐ Quality ${lowest.level} starts at <strong>$${formatMoney(Math.round(incomeRange.min))}/day</strong>`];
  if (highest && highest.level !== lowest.level) {
    pieces.push(
      `Quality ${highest.level} can reach <strong>$${formatMoney(Math.round(highest.income?.max || incomeRange.max))}/day</strong>`
    );
  }
  const trackNames = Object.values(tracks).map(track => track.shortLabel || track.label);
  const trackDetail = trackNames.length ? `Progress via ${formatList(trackNames)}` : '';
  const note = [pieces.join(' · '), trackDetail].filter(Boolean).join(' · ');
  return `✨ Quality: ${note}`;
}

export function qualityProgressDetail(definition) {
  const summary = getQualityLevelSummary(definition);
  if (!summary.length) return '';
  const tracks = getQualityTracks(definition);
  const lines = summary
    .map(level => {
      const requirementEntries = Object.entries(level.requirements || {});
      if (!requirementEntries.length) {
        return `Quality ${level.level}: ${level.name}`;
      }
      const parts = requirementEntries.map(([key, value]) => {
        const label = tracks[key]?.shortLabel || tracks[key]?.label || key;
        return `${value} ${label}`;
      });
      return `Quality ${level.level}: ${level.name} (${parts.join(', ')})`;
    })
    .join(' • ');
  return `📈 Roadmap: ${lines}`;
}

export { assetActionLabel, isAssetPurchaseDisabled, startAsset, getAssetMetricId };
