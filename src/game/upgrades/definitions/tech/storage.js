import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const scratchDriveArrayConfig = upgradeConfigs.scratchDriveArray; // Spec: docs/normalized_economy.json → upgrades.scratchDriveArray

const storage = [
  {
    id: 'scratchDriveArray',
    name: 'Scratch Drive Array',
    tag: { label: 'Gear', type: 'tech' },
    description: 'High-speed NVMe array that turns renders and transfers into blink-and-done tasks.',
    category: 'tech',
    family: 'storage',
    cost: scratchDriveArrayConfig.cost, // Spec: docs/normalized_economy.json → upgrades.scratchDriveArray.setup_cost
    effects: { maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'video', 'photo', 'software' ] },
      actions: { types: [ 'maintenance' ] }
    },
    metrics: { cost: { label: '💾 Scratch drive array', category: 'gear' } },
    logMessage: 'Media transfers and cache renders scream thanks to your scratch array.',
    logType: 'upgrade'
  }
];

export default storage;
