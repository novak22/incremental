import { createUpgrade } from './content/schema.js';
import { UPGRADE_DEFINITIONS } from './upgrades/definitions/index.js';
import { UPGRADE_BEHAVIORS } from './upgrades/hookRegistry.js';

export const UPGRADES = UPGRADE_DEFINITIONS.map(definition => {
  const hooks = UPGRADE_BEHAVIORS[definition.id] || {};
  return createUpgrade(definition, hooks);
});
