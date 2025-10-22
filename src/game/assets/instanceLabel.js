import { getAssetState } from '../../core/state.js';

export function instanceLabel(definition, index, options = {}) {
  const base = definition?.singular || definition?.name || 'Asset';
  const normalizedIndex = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;

  let targetInstance = options?.instance || null;
  if (!targetInstance && definition?.id) {
    const assetState = getAssetState(definition.id);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    targetInstance = instances[normalizedIndex] || null;
  }

  const customName = typeof targetInstance?.customName === 'string' ? targetInstance.customName.trim() : '';
  if (customName) {
    return customName;
  }

  return `${base} #${normalizedIndex + 1}`;
}
