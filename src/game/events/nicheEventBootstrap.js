import { clampChance, buildEventFromBlueprint } from './factoryContext.js';
import { createAssetEvents } from './assetEvents.js';
import { createNicheEvents } from './nicheEvents.js';

const { hasEventWithTone } = createAssetEvents({ clampChance, buildEventFromBlueprint });

const { maybeSpawnNicheEvents } = createNicheEvents({
  clampChance,
  buildEventFromBlueprint,
  hasEventWithTone
});

export { maybeSpawnNicheEvents };
