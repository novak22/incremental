import { getState } from '../../../core/state.js';
import {
  getAssetDefinition,
  getHustleDefinition,
  getUpgradeDefinition
} from '../../../core/state/registry.js';
import normalizedEconomy from '../../data/normalizedEconomy.js';
import { applyModifiers } from '../../data/economyMath.js';
import { parseModifierTarget } from './parsers.js';
import { actionMatches, prepareSubject, subjectMatches } from './subjects.js';

const MULTIPLIER_LIMITS = {
  payout_mult: { min: 0.1, max: 10 },
  setup_time_mult: { min: 0.5, max: 2 },
  maint_time_mult: { min: 0.5, max: 2 },
  quality_progress_mult: { min: 0.25, max: 5 }
};

const SPEC_MODIFIERS = Array.isArray(normalizedEconomy.modifiers) ? normalizedEconomy.modifiers : [];

const EFFECT_PROPERTY_MAP = {
  payout_mult: 'income',
  setup_time_mult: 'setup_time',
  maint_time_mult: 'maintenance_time',
  quality_progress_mult: 'quality_progress'
};

export function getUpgradeQuantity(definition, upgradeState = {}) {
  if (!definition) return 0;
  if (definition.repeatable) {
    const count = Number(upgradeState.count);
    if (Number.isFinite(count) && count > 0) {
      return Math.max(0, count);
    }
    return upgradeState.purchased ? 1 : 0;
  }
  return upgradeState.purchased ? 1 : 0;
}

function collectActiveUpgrades(state = getState()) {
  if (!state) return [];
  const entries = [];
  const upgradeStates = state.upgrades || {};
  for (const [id, upgradeState] of Object.entries(upgradeStates)) {
    const definition = getUpgradeDefinition(id);
    if (!definition) continue;
    const quantity = getUpgradeQuantity(definition, upgradeState);
    if (quantity <= 0) continue;
    entries.push({ definition, state: upgradeState, quantity });
  }
  return entries;
}

function findSpecModifiersForUpgrade({ definition, subjectType, property, resolvedSubject }) {
  if (!property) return [];
  const entries = SPEC_MODIFIERS.filter(entry => entry.source === definition.id);
  if (!entries.length) return [];
  const matches = [];
  for (const entry of entries) {
    const parsed = parseModifierTarget(entry.target);
    if (!parsed) continue;
    if (parsed.subjectType !== subjectType) continue;
    if (parsed.property !== property) continue;
    if (!subjectMatches(parsed.scope, resolvedSubject)) continue;
    matches.push(entry);
  }
  return matches;
}

export function collectEffectSources({ subjectType, subject, effect, actionType, state }) {
  const resolvedSubject = prepareSubject(subjectType, subject, {
    getAssetDefinition,
    getHustleDefinition
  });
  const clamp = MULTIPLIER_LIMITS[effect];
  if (!resolvedSubject) {
    return { multiplier: 1, sources: [], modifiers: [], clamp };
  }

  const upgrades = collectActiveUpgrades(state);
  if (!upgrades.length) {
    return { multiplier: 1, sources: [], modifiers: [], clamp };
  }

  const descriptors = [];
  const property = EFFECT_PROPERTY_MAP[effect];

  for (const { definition, quantity } of upgrades) {
    const affects = definition.affects || {};
    const scope = subjectType === 'asset' ? affects.assets : affects.hustles;
    if (!subjectMatches(scope, resolvedSubject)) continue;
    if (!actionMatches(affects.actions, actionType)) continue;

    const specMatches = findSpecModifiersForUpgrade({
      definition,
      subjectType,
      property,
      resolvedSubject
    });

    if (specMatches.length) {
      specMatches.forEach(specEntry => {
        for (let index = 0; index < quantity; index += 1) {
          descriptors.push({
            id: definition.id,
            source: specEntry.source,
            target: specEntry.target,
            type: specEntry.type,
            formula: specEntry.formula,
            notes: specEntry.notes,
            label: definition.name || definition.id,
            stack: quantity > 1 ? index + 1 : null,
            original: specEntry
          });
        }
      });
      continue;
    }

    const rawValue = definition.effects?.[effect];
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) continue;

    for (let index = 0; index < quantity; index += 1) {
      descriptors.push({
        id: definition.id,
        source: definition.id,
        target: property ? `${subjectType}:${resolvedSubject.id || '*'}:${property}` : null,
        type: 'multiplier',
        amount: numericValue,
        label: definition.name || definition.id,
        stack: quantity > 1 ? index + 1 : null,
        notes: null,
        original: {
          source: definition.id,
          target: null,
          type: 'multiplier',
          amount: numericValue
        }
      });
    }
  }

  if (!descriptors.length) {
    return { multiplier: 1, sources: [], modifiers: [], clamp };
  }

  const result = applyModifiers(1, descriptors, { clamp });
  const modifiers = result.applied.map(entry => entry.descriptor);
  const sources = result.applied
    .filter(entry => entry.type === 'multiplier')
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      multiplier: entry.value
    }));

  return {
    multiplier: result.multiplier,
    sources,
    modifiers,
    clamp
  };
}

export function getAssetEffectMultiplier(definition, effect, { actionType = null, state = getState() } = {}) {
  return collectEffectSources({ subjectType: 'asset', subject: definition, effect, actionType, state });
}

export function getHustleEffectMultiplier(definition, effect, { actionType = null, state = getState() } = {}) {
  return collectEffectSources({ subjectType: 'hustle', subject: definition, effect, actionType, state });
}
