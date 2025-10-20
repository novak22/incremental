import { getAssetDefinition } from '../../core/state/registry.js';
import resolveIncomeFromBase from './income/engine.js';
import {
  getInstanceQualityRange,
  getOverallQualityRange
} from './quality/levels.js';

export function getDailyIncomeRange(definition) {
  return getOverallQualityRange(definition);
}

export function rollDailyIncome(definition, assetState, instance) {
  const { min, max } = getInstanceQualityRange(definition, instance);
  const roll = min + Math.random() * Math.max(0, max - min);
  const result = resolveIncomeFromBase({
    definition,
    assetState,
    instance,
    baseAmount: roll,
    triggerEvents: true,
    updateInstance: true
  });
  return result.payoutRounded;
}

export function getIncomeRangeForDisplay(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return { min: 0, max: 0 };
  return getDailyIncomeRange(definition);
}

export function projectIncomeFromBase(definition, assetState, instance, baseAmount) {
  return resolveIncomeFromBase({
    definition,
    assetState,
    instance,
    baseAmount,
    triggerEvents: false,
    updateInstance: false
  });
}

