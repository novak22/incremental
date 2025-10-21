import { upgrades as upgradeConfigs } from '../../data/economyConfig.js';

const studioConfig = upgradeConfigs.studio; // Spec: docs/normalized_economy.json → upgrades.studio
const studioExpansionConfig = upgradeConfigs.studioExpansion; // Spec: docs/normalized_economy.json → upgrades.studioExpansion

const house = [
  {
    id: 'studio',
    name: 'Lighting Kit',
    tag: { label: 'Unlock', type: 'unlock' },
    description: 'Soft boxes, reflectors, and editing presets for glossier stock photos.',
    category: 'house',
    family: 'lighting',
    exclusivityGroup: 'house:lighting',
    placements: ['general', 'digishelf', 'videotube'],
    cost: studioConfig.cost, // Spec: docs/normalized_economy.json → upgrades.studio.setup_cost
    unlocks: 'Stock Photo Galleries',
    skills: [ 'visual' ],
    effects: { maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'photo', 'video' ] },
      actions: { types: [ 'maintenance' ] }
    },
    actionClassName: 'secondary',
    actionLabel: 'Build Studio',
    labels: { purchased: 'Studio Ready' },
    metrics: { cost: { label: '💡 Lighting kit upgrade', category: 'upgrade' } },
    logMessage: 'Lighting kit assembled! Your stock photo galleries now shine in marketplaces.',
    logType: 'upgrade'
  },
  {
    id: 'studioExpansion',
    name: 'Studio Expansion',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Add modular sets, color-controlled lighting, and prop storage for faster shoots.',
    category: 'house',
    family: 'studio',
    exclusivityGroup: 'house:studio',
    placements: ['general', 'digishelf', 'videotube'],
    cost: studioExpansionConfig.cost, // Spec: docs/normalized_economy.json → upgrades.studioExpansion.setup_cost
    requires: studioExpansionConfig.requires, // Spec: docs/normalized_economy.json → upgrades.studioExpansion.requirements
    boosts: 'Stock photo payouts + faster shoot progress',
    effects: {
      setup_time_mult: 0.85,
      payout_mult: 1.15,
      quality_progress_mult: 2
    },
    affects: {
      assets: { tags: [ 'photo', 'video' ] },
      hustles: { tags: [ 'photo' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    details: [
      '📸 Stock photo quality actions earn double progress with the expanded studio.',
      '💵 Galleries pick up roughly +20% daily income thanks to premium staging.'
    ],
    skills: [ 'visual' ],
    actionClassName: 'secondary',
    actionLabel: 'Expand Studio',
    labels: { purchased: 'Studio Expanded', missing: 'Requires Lighting Kit' },
    metrics: {
      cost: { label: '🏗️ Studio expansion build-out', category: 'upgrade' }
    },
    logMessage: 'Studio expansion complete! You now glide through photo shoots with cinematic flair.',
    logType: 'upgrade'
  }
];

export default house;
