import { ensureArray } from '../../core/helpers.js';
import { getState, getUpgradeState } from '../../core/state.js';
import {
  getAssetDefinition,
  getHustleDefinition,
  getUpgradeDefinition
} from '../../core/state/registry.js';
import normalizedEconomy from '../../../docs/normalized_economy.json' with { type: 'json' };
import { applyModifiers } from '../data/economyMath.js';

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

function getUpgradeQuantity(definition, upgradeState = {}) {
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

function normalizeTarget(target) {
  if (!target) return {};
  if (typeof target !== 'object') return {};
  return {
    ids: ensureArray(target.ids).filter(Boolean),
    tags: ensureArray(target.tags).filter(Boolean),
    families: ensureArray(target.families).filter(Boolean),
    categories: ensureArray(target.categories).filter(Boolean)
  };
}

function hasIntersection(a = [], b = []) {
  if (!a.length || !b.length) return false;
  const set = new Set(a);
  return b.some(value => set.has(value));
}

function subjectMatches(target, subject) {
  const normalized = normalizeTarget(target);
  if (!normalized.ids.length && !normalized.tags.length && !normalized.families.length && !normalized.categories.length) {
    return true;
  }
  if (normalized.ids.length && normalized.ids.includes(subject.id)) return true;
  if (normalized.families.length && normalized.families.includes(subject.family)) return true;
  if (normalized.categories.length && normalized.categories.includes(subject.category)) return true;
  const subjectTags = ensureArray(subject.tags).filter(Boolean);
  if (normalized.tags.length && hasIntersection(normalized.tags, subjectTags)) {
    return true;
  }
  return false;
}

function actionMatches(affectsActions, actionType) {
  if (!affectsActions) return true;
  const normalized = normalizeTarget({ ids: affectsActions.types });
  if (!normalized.ids.length) return true;
  return normalized.ids.includes(actionType);
}

function parseFilterExpression(expression) {
  const scope = {
    ids: [],
    tags: [],
    families: [],
    categories: []
  };
  if (typeof expression !== 'string' || !expression.trim()) {
    return scope;
  }
  const segments = expression.split(/[;,]/);
  segments.forEach(segment => {
    const trimmed = segment.trim();
    if (!trimmed) return;
    const [rawKey, rawValue] = trimmed.split('=');
    if (!rawValue) return;
    const key = rawKey.trim().toLowerCase();
    const values = rawValue
      .split('|')
      .map(value => value.trim())
      .filter(Boolean);
    if (!values.length) return;
    switch (key) {
      case 'id':
      case 'ids':
        scope.ids.push(...values);
        break;
      case 'tag':
      case 'tags':
        scope.tags.push(...values);
        break;
      case 'family':
      case 'families':
        scope.families.push(...values);
        break;
      case 'category':
      case 'categories':
        scope.categories.push(...values);
        break;
      default:
        break;
    }
  });
  return scope;
}

function parseModifierTarget(target) {
  if (typeof target !== 'string') return null;
  const trimmed = target.trim();
  if (!trimmed) return null;
  const [subjectPart, property] = trimmed.split('.');
  if (!property) return null;

  if (subjectPart.startsWith('asset:')) {
    const id = subjectPart.slice('asset:'.length).trim();
    return {
      subjectType: 'asset',
      property,
      scope: {
        ids: id ? [id] : [],
        tags: [],
        families: [],
        categories: []
      }
    };
  }

  if (subjectPart.startsWith('hustle:')) {
    const id = subjectPart.slice('hustle:'.length).trim();
    return {
      subjectType: 'hustle',
      property,
      scope: {
        ids: id ? [id] : [],
        tags: [],
        families: [],
        categories: []
      }
    };
  }

  if (subjectPart.startsWith('assets[') && subjectPart.endsWith(']')) {
    const expression = subjectPart.slice('assets['.length, -1);
    return {
      subjectType: 'asset',
      property,
      scope: parseFilterExpression(expression)
    };
  }

  if (subjectPart.startsWith('hustles[') && subjectPart.endsWith(']')) {
    const expression = subjectPart.slice('hustles['.length, -1);
    return {
      subjectType: 'hustle',
      property,
      scope: parseFilterExpression(expression)
    };
  }

  return null;
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

function prepareSubject(subjectType, subjectId) {
  if (subjectType === 'asset') {
    const definition = typeof subjectId === 'string' ? getAssetDefinition(subjectId) : subjectId;
    if (!definition) return null;
    return {
      id: definition.id,
      family: definition.family || null,
      category: definition.category || null,
      tags: ensureArray(definition.tags)
    };
  }
  if (subjectType === 'hustle') {
    const definition = typeof subjectId === 'string' ? getHustleDefinition(subjectId) : subjectId;
    if (!definition) return null;
    return {
      id: definition.id,
      family: definition.family || null,
      category: definition.category || null,
      tags: ensureArray(definition.tags)
    };
  }
  return null;
}

function collectEffectSources({ subjectType, subject, effect, actionType, state }) {
  const resolvedSubject = prepareSubject(subjectType, subject);
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

export function getExclusiveConflict(definition, { state = getState() } = {}) {
  if (!definition?.exclusivityGroup) return null;
  if (!state) return null;
  const upgrades = state.upgrades || {};
  const groupId = definition.exclusivityGroup;
  const ignored = new Set(
    Array.isArray(definition.requirements)
      ? definition.requirements
          .filter(requirement => requirement?.type === 'upgrade' && requirement.id)
          .map(requirement => requirement.id)
      : []
  );
  ignored.add(definition.id);
  for (const [id, upgradeState] of Object.entries(upgrades)) {
    if (ignored.has(id)) continue;
    const otherDefinition = getUpgradeDefinition(id);
    if (!otherDefinition) continue;
    if (otherDefinition.exclusivityGroup !== groupId) continue;
    const quantity = getUpgradeQuantity(otherDefinition, upgradeState);
    if (quantity > 0) {
      return otherDefinition;
    }
  }
  return null;
}

function adjustLedgerEntry(target, provides = 0, consumes = 0) {
  target.provided = (target.provided || 0) + provides;
  target.consumed = (target.consumed || 0) + consumes;
  return target;
}

function accumulateLedgerForUpgrade(ledger, definition, quantity = 1) {
  const provides = definition.provides || {};
  const consumes = definition.consumes || {};

  for (const [slot, value] of Object.entries(provides)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) continue;
    const entry = ledger.get(slot) || { provided: 0, consumed: 0 };
    adjustLedgerEntry(entry, numeric * quantity, 0);
    ledger.set(slot, entry);
  }

  for (const [slot, value] of Object.entries(consumes)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) continue;
    const entry = ledger.get(slot) || { provided: 0, consumed: 0 };
    adjustLedgerEntry(entry, 0, numeric * quantity);
    ledger.set(slot, entry);
  }
}

export function buildSlotLedger({ state = getState(), exclude } = {}) {
  const ledger = new Map();
  if (!state) return ledger;
  const upgrades = state.upgrades || {};
  for (const [id, upgradeState] of Object.entries(upgrades)) {
    if (exclude && exclude.includes(id)) continue;
    const definition = getUpgradeDefinition(id);
    if (!definition) continue;
    const quantity = getUpgradeQuantity(definition, upgradeState);
    if (quantity <= 0) continue;
    accumulateLedgerForUpgrade(ledger, definition, quantity);
  }
  return ledger;
}

function mergeLedgerAndUpgrade(ledger, definition) {
  const result = new Map(ledger);
  if (!definition) return result;
  accumulateLedgerForUpgrade(result, definition, 1);
  return result;
}

export function wouldExceedSlotCapacity(definition, { state = getState() } = {}) {
  if (!definition?.consumes && !definition?.provides) return false;
  const upgradeState = getUpgradeState(definition.id, state);
  const quantity = getUpgradeQuantity(definition, upgradeState);
  const exclude = definition.repeatable && quantity > 0 ? [] : [definition.id];
  const baseLedger = buildSlotLedger({ state, exclude: exclude.length ? exclude : undefined });
  const simulated = mergeLedgerAndUpgrade(baseLedger, definition);

  for (const [slot, entry] of simulated.entries()) {
    if ((entry.consumed || 0) > (entry.provided || 0)) {
      return slot;
    }
  }
  return false;
}

export function describeSlotLedger(slot, ledger) {
  const entry = ledger.get(slot);
  if (!entry) return null;
  const available = Math.max(0, (entry.provided || 0) - (entry.consumed || 0));
  return {
    slot,
    provided: entry.provided || 0,
    consumed: entry.consumed || 0,
    available
  };
}

