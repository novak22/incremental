import { ensureArray } from '../../core/helpers.js';
import {
  getAssetDefinition,
  getHustleDefinition,
  getState,
  getUpgradeDefinition,
  getUpgradeState
} from '../../core/state.js';

const MULTIPLIER_LIMITS = {
  payout_mult: { min: 0.1, max: 10 },
  setup_time_mult: { min: 0.5, max: 2 },
  maint_time_mult: { min: 0.5, max: 2 },
  quality_progress_mult: { min: 0.25, max: 5 }
};

function clampMultiplier(effect, value) {
  const limits = MULTIPLIER_LIMITS[effect] || { min: 0.1, max: 10 };
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(limits.max, Math.max(limits.min, numeric));
}

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
  if (!resolvedSubject) {
    return { multiplier: 1, sources: [] };
  }

  const upgrades = collectActiveUpgrades(state);
  if (!upgrades.length) {
    return { multiplier: 1, sources: [] };
  }

  const sources = [];
  let multiplier = 1;

  for (const { definition, quantity } of upgrades) {
    const effects = definition.effects || {};
    if (!effects || typeof effects !== 'object') continue;
    let value = effects[effect];
    if (!Number.isFinite(Number(value))) continue;

    const affects = definition.affects || {};
    const scope = subjectType === 'asset' ? affects.assets : affects.hustles;
    if (!subjectMatches(scope, resolvedSubject)) continue;
    if (!actionMatches(affects.actions, actionType)) continue;

    const clamped = clampMultiplier(effect, value);

    for (let index = 0; index < quantity; index += 1) {
      multiplier *= clamped;
      sources.push({
        id: definition.id,
        label: definition.name || definition.id,
        multiplier: clamped
      });
    }
  }

  const clampedTotal = clampMultiplier(effect, multiplier);
  return { multiplier: clampedTotal, sources };
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

