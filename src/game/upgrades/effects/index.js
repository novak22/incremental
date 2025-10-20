import { getState, getUpgradeState } from '../../../core/state.js';
import { getUpgradeDefinition } from '../../../core/state/registry.js';
import { getUpgradeQuantity } from './apply.js';

export { collectEffectSources, getAssetEffectMultiplier, getHustleEffectMultiplier } from './apply.js';

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
