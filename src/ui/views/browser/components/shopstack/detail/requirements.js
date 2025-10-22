import { ensureArray } from '../../../../../selectors/collections.js';
import {
  selectAssetInstances,
  selectActiveAssetInstances,
  selectUpgradeState
} from '../../../../../selectors/state.js';
import { selectAssetDefinition } from '../../../../../selectors/registry.js';
import { formatKeyLabel } from './formatting.js';

export function isRequirementMet(requirement) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(selectUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const instances = selectAssetInstances(requirement.id);
      if (requirement.active) {
        return selectActiveAssetInstances(requirement.id) >= Number(requirement.count || 1);
      }
      return instances.length >= Number(requirement.count || 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

export function formatRequirementHtml(requirement, definitionMap = new Map()) {
  if (!requirement) return 'Requires: <strong>Prerequisites</strong>';
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const upgrade = definitionMap.get(requirement.id);
      const label = upgrade?.name || formatKeyLabel(requirement.id);
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = selectAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || formatKeyLabel(requirement.id);
      const count = Number(requirement.count || 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

export function getRequirementEntries(definition, { definitionMap = new Map() } = {}) {
  const requirements = ensureArray(definition?.requirements);
  return requirements.map(requirement => ({
    html: formatRequirementHtml(requirement, definitionMap),
    met: isRequirementMet(requirement)
  }));
}

export default {
  isRequirementMet,
  formatRequirementHtml,
  getRequirementEntries
};
