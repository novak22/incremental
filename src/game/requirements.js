import { getAssetDefinition, getUpgradeDefinition, getAssetState, getUpgradeState } from '../core/state.js';

function normalizeAssetRequirement(definition) {
  if (!definition || !definition.requiresUpgrade) return [];
  return Array.isArray(definition.requiresUpgrade) ? definition.requiresUpgrade : [definition.requiresUpgrade];
}

function isUpgradePurchased(id) {
  if (!id) return true;
  return !!getUpgradeState(id).purchased;
}

export function assetRequirementsMet(definition) {
  const requirements = normalizeAssetRequirement(definition);
  return requirements.every(isUpgradePurchased);
}

export function assetRequirementsMetById(id) {
  const definition = getAssetDefinition(id);
  if (!definition) return true;
  return assetRequirementsMet(definition);
}

export function formatAssetRequirementLabel(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return 'Requirement Missing';
  const missing = normalizeAssetRequirement(definition).filter(req => !isUpgradePurchased(req));
  if (!missing.length) return 'Ready to Launch';
  const names = missing.map(id => getUpgradeDefinition(id)?.name || id);
  return `Requires ${names.join(' & ')}`;
}

export function renderAssetRequirementDetail(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return '';
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) {
    return '🔓 Requirements: <strong>None</strong>';
  }

  const parts = requirements.map(id => {
    const upgradeDef = getUpgradeDefinition(id);
    const purchased = isUpgradePurchased(id);
    const icon = purchased ? '✅' : '🔒';
    const label = upgradeDef ? upgradeDef.name : id;
    const status = purchased ? 'Unlocked' : 'Locked';
    return `${icon} <strong>${label}</strong> (${status})`;
  });

  return `Requirements: ${parts.join(' & ')}`;
}

export function updateAssetCardLock(assetId, card) {
  const definition = getAssetDefinition(assetId);
  if (!definition || !card) return;
  const assetState = getAssetState(assetId);
  const locked = !assetRequirementsMet(definition) && !assetState.active;
  card.classList.toggle('locked', locked);
}
