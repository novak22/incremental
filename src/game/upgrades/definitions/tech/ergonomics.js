import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const ergonomicRefitConfig = upgradeConfigs.ergonomicRefit; // Spec: docs/normalized_economy.json → upgrades.ergonomicRefit

const ergonomics = [
  {
    id: 'ergonomicRefit',
    name: 'Ergonomic Refit',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Sit-stand desk, supportive chair, and smart lighting for marathon editing sessions.',
    category: 'tech',
    family: 'ergonomics',
    placements: ['general', 'blogpress'],
    cost: ergonomicRefitConfig.cost, // Spec: docs/normalized_economy.json → upgrades.ergonomicRefit.setup_cost
    effects: { maint_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '🪑 Ergonomic refit', category: 'home' } },
    logMessage: 'Back-saving upgrades keep your output steady without burnout.',
    logType: 'upgrade'
  }
];

export default ergonomics;
