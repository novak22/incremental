import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const fiberInternetConfig = upgradeConfigs.fiberInternet; // Spec: docs/normalized_economy.json → upgrades.fiberInternet

const network = [
  {
    id: 'fiberInternet',
    name: 'Fiber Internet Plan',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Symmetrical gigabit connection with service-level guarantees for uploads.',
    category: 'tech',
    family: 'internet',
    placements: ['general'],
    cost: fiberInternetConfig.cost, // Spec: docs/normalized_economy.json → upgrades.fiberInternet.setup_cost
    effects: { maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'video', 'software' ] },
      hustles: { tags: [ 'live', 'software' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '🌐 Fiber internet upgrade', category: 'home' } },
    logMessage: 'Uploads and livestreams race through your new fiber connection.',
    logType: 'upgrade'
  }
];

export default network;
