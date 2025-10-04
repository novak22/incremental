import { getState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getAssetEffectMultiplier } from '../upgrades/effects.js';
import { getInstanceNicheEffect } from './niches.js';
import { applyAssetIncomeEducationBonus } from '../educationEffects.js';
import { applyIncomeEvents, maybeTriggerAssetEvents } from '../events/index.js';
import {
  getInstanceQualityRange,
  getOverallQualityRange
} from './quality.js';

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

  const instanceIndex = Array.isArray(assetState?.instances)
    ? assetState.instances.indexOf(instance)
    : -1;
  maybeTriggerAssetEvents({
    definition,
    assetState,
    instance,
    instanceIndex,
    trigger: 'payout'
  });

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

  const eventResult = applyIncomeEvents({ amount: finalAmount, definition, instance });
  finalAmount = eventResult.amount;
  eventResult.entries.forEach(entry => {
    contributions.push({
      id: entry.id,
      label: entry.label,
      amount: entry.amount,
      type: entry.type,
      percent: entry.percent
    });
  });

  const educationResult = applyAssetIncomeEducationBonus({
    assetId: definition.id,
    baseAmount: finalAmount,
    state: getState()
  });

  if (educationResult?.applied?.length) {
    finalAmount = educationResult.amount;
    educationResult.applied.forEach(entry => {
      if (!entry || !entry.extraAmount) return;
      contributions.push({
        id: `education:${entry.trackId}:${entry.assetId || entry.hustleId || 'bonus'}`,
        label: entry.label || `${entry.trackName} bonus`,
        amount: entry.extraAmount,
        type: 'education',
        percent: entry.type === 'multiplier' ? entry.amount : null
      });
    });
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
    if (educationResult?.applied?.length) {
      instance.lastEducationBonuses = educationResult.applied;
    } else {
      instance.lastEducationBonuses = null;
    }
  }

  return payoutRounded;
}

export function getIncomeRangeForDisplay(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return { min: 0, max: 0 };
  return getDailyIncomeRange(definition);
}

