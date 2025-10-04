import { ensureArray } from '../../../../../../core/helpers.js';
import { getAssetState, getState, getUpgradeState } from '../../../../../../core/state.js';
import { getAssetDefinition, getUpgradeDefinition } from '../../../../../../core/state/registry.js';

const UPGRADE_STATUS_TONES = {
  owned: 'owned',
  ready: 'ready',
  unaffordable: 'unaffordable',
  locked: 'locked'
};

function formatKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

function formatSlotMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

export function describeUpgradeSnapshotTone(snapshot = {}) {
  if (snapshot.purchased) return UPGRADE_STATUS_TONES.owned;
  if (snapshot.ready) return UPGRADE_STATUS_TONES.ready;
  if (!snapshot.affordable) return UPGRADE_STATUS_TONES.unaffordable;
  return UPGRADE_STATUS_TONES.locked;
}

export function describeUpgradeAffordability(upgrade, { formatCurrency = value => String(value ?? '') } = {}) {
  const snapshot = upgrade?.snapshot || {};
  if (snapshot.purchased) return 'Already installed and humming.';
  if (snapshot.ready) return 'You can fund this upgrade right now.';
  if (!snapshot.affordable) {
    const state = getState();
    const balance = Number(state?.money) || 0;
    const deficit = Math.max(0, Number(upgrade?.cost || 0) - balance);
    if (deficit <= 0) {
      return 'Stack a little more cash to cover this upgrade.';
    }
    return `Need ${formatCurrency(deficit)} more to fund this upgrade.`;
  }
  if (snapshot.disabled) return 'Meet the prerequisites to unlock checkout.';
  return 'Progress the requirements to unlock this purchase.';
}

function isRequirementMet(requirement) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const assetState = getAssetState(requirement.id);
      const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
      if (requirement.active) {
        return instances.filter(instance => instance?.status === 'active').length >= Number(requirement.count || 1);
      }
      return instances.length >= Number(requirement.count || 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

function formatRequirementHtml(requirement) {
  if (!requirement) return 'Requires: <strong>Prerequisites</strong>';
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const definition = getUpgradeDefinition(requirement.id);
      const label = definition?.name || formatKeyLabel(requirement.id);
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || formatKeyLabel(requirement.id);
      const count = Number(requirement.count || 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

export function getRequirementEntries(upgrade) {
  const requirements = ensureArray(upgrade?.definition?.requirements);
  return requirements.map(requirement => ({
    html: formatRequirementHtml(requirement),
    met: isRequirementMet(requirement)
  }));
}

export function collectDetailStrings(definition) {
  const details = ensureArray(definition?.details);
  return details
    .map(detail => {
      if (typeof detail === 'function') {
        try {
          return detail(definition);
        } catch (error) {
          return '';
        }
      }
      return detail;
    })
    .filter(Boolean);
}

function describeEffectSummary(effects = {}, affects = {}) {
  const effectParts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality speed`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% upkeep speed`;
        break;
      default:
        label = `${effect}: ${numeric}`;
    }
    effectParts.push(label);
  });
  if (!effectParts.length) return '';
  const scope = [];
  const assetIds = ensureArray(affects.assets?.ids);
  if (assetIds.length) scope.push(`stores (${assetIds.join(', ')})`);
  const assetTags = ensureArray(affects.assets?.tags);
  if (assetTags.length) scope.push(`tags ${assetTags.join(', ')}`);
  return scope.length ? `${effectParts.join(' • ')} → ${scope.join(' & ')}` : effectParts.join(' • ');
}

export function collectUpgradeHighlights(upgrade) {
  const highlights = [];
  const effectSummary = describeEffectSummary(upgrade?.effects || {}, upgrade?.affects || {});
  if (effectSummary) {
    highlights.push(effectSummary);
  }
  if (upgrade?.boosts) {
    highlights.push(upgrade.boosts);
  }
  if (upgrade?.definition?.unlocks) {
    highlights.push(`Unlocks ${upgrade.definition.unlocks}`);
  }
  const provides = formatSlotMap(upgrade?.definition?.provides);
  if (provides) {
    highlights.push(`Provides ${provides}`);
  }
  const consumes = formatSlotMap(upgrade?.definition?.consumes);
  if (consumes) {
    highlights.push(`Consumes ${consumes}`);
  }
  return highlights;
}

