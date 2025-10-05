import { loadRegistry } from './registryService.js';
import { ASSETS } from './assets/index.js';
import { ACTIONS } from './hustles.js';
import { UPGRADES } from './upgrades.js';

export function loadDefaultRegistry() {
  return loadRegistry({ actions: ACTIONS, assets: ASSETS, upgrades: UPGRADES });
}

