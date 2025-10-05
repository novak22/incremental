import { loadRegistry } from './registryService.js';
import { ASSETS } from './assets/index.js';
import { HUSTLE_TEMPLATES } from './hustles.js';
import { UPGRADES } from './upgrades.js';

export function loadDefaultRegistry() {
  return loadRegistry({ assets: ASSETS, hustles: HUSTLE_TEMPLATES, upgrades: UPGRADES });
}

