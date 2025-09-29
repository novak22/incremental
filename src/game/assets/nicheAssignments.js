import { addLog } from '../../core/log.js';
import { getAssetState } from '../../core/state.js';
import { executeAction } from '../actions.js';
import { describePopularity, getNicheById, getNichePopularity, isValidNicheId } from './niches.js';

export function assignAssetNiche(definition, instanceId, nicheId) {
  if (!definition || !instanceId || !isValidNicheId(nicheId)) {
    return false;
  }

  let assigned = false;

  executeAction(() => {
    const assetState = getAssetState(definition.id);
    if (!assetState?.instances) return;
    const instance = assetState.instances.find(item => item.id === instanceId);
    if (!instance || instance.niche) return;
    instance.niche = nicheId;
    assigned = true;
    const option = getNicheById(nicheId);
    const popularity = describePopularity(getNichePopularity(nicheId));
    addLog(
      `${option?.name || 'New niche'} locked for ${definition.singular || definition.name}. ` +
        `Expect payouts to sway with its ${popularity} hype.`,
      'info'
    );
  });

  return assigned;
}
