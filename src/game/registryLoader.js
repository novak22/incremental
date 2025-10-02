import { loadRegistry } from './registryService.js';
import { ASSETS } from './assets/index.js';
import { HUSTLES } from './hustles.js';
import { UPGRADES } from './upgrades.js';

export function loadDefaultRegistry() {
  return loadRegistry({ assets: ASSETS, hustles: HUSTLES, upgrades: UPGRADES });
}

