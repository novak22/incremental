import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const audioSuiteConfig = upgradeConfigs.audioSuite; // Spec: docs/normalized_economy.json → upgrades.audioSuite

const audio = [
  {
    id: 'audioSuite',
    name: 'Audio Suite',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Treat the studio with acoustic foam, preamps, and mastering plug-ins.',
    category: 'tech',
    family: 'audio',
    placements: ['general', 'videotube'],
    cost: audioSuiteConfig.cost, // Spec: docs/normalized_economy.json → upgrades.audioSuite.setup_cost
    effects: { quality_progress_mult: 1.4 },
    affects: {
      assets: { tags: [ 'audio', 'video' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🎙️ Audio suite upgrade', category: 'gear' } },
    logMessage: 'Voiceovers, podcasts, and narrations now sound buttery-smooth.',
    logType: 'upgrade'
  }
];

export default audio;
