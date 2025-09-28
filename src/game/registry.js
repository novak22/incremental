import { ASSETS } from './assets/index.js';
import { HUSTLES } from './hustles.js';
import { UPGRADES } from './upgrades.js';

export const registry = {
  get hustles() {
    return HUSTLES;
  },
  get assets() {
    return ASSETS;
  },
  get upgrades() {
    return UPGRADES;
  }
};
