import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const studioLaptopConfig = upgradeConfigs.studioLaptop; // Spec: docs/normalized_economy.json → upgrades.studioLaptop
const editingWorkstationConfig = upgradeConfigs.editingWorkstation; // Spec: docs/normalized_economy.json → upgrades.editingWorkstation
const quantumRigConfig = upgradeConfigs.quantumRig; // Spec: docs/normalized_economy.json → upgrades.quantumRig

const pcs = [
  {
    id: 'studioLaptop',
    name: 'Studio Laptop',
    tag: { label: 'Gear', type: 'tech' },
    description: 'High-refresh laptop tuned for editing, streaming, and multitasking.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    placements: ['general'],
    cost: studioLaptopConfig.cost, // Spec: docs/normalized_economy.json → upgrades.studioLaptop.setup_cost
    effects: { setup_time_mult: 0.92 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      hustles: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'setup' ] }
    },
    metrics: { cost: { label: '💻 Studio laptop purchase', category: 'gear' } },
    logMessage: 'Editing suites and dashboards glide on your new studio laptop.',
    logType: 'upgrade'
  },
  {
    id: 'editingWorkstation',
    name: 'Editing Workstation',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Desktop workstation with GPU acceleration and silent cooling for marathon edits.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    placements: ['general'],
    cost: editingWorkstationConfig.cost, // Spec: docs/normalized_economy.json → upgrades.editingWorkstation.setup_cost
    requires: editingWorkstationConfig.requires, // Spec: docs/normalized_economy.json → upgrades.editingWorkstation.requirements
    effects: { setup_time_mult: 0.85, maint_time_mult: 0.9 },
    affects: {
      assets: { tags: [ 'desktop_work', 'video' ] },
      actions: { types: [ 'setup', 'maintenance' ] }
    },
    metrics: {
      cost: { label: '🖥️ Editing workstation build', category: 'gear' }
    },
    logMessage: 'Your workstation devours timelines and exports while you plan the next drop.',
    logType: 'upgrade'
  },
  {
    id: 'quantumRig',
    name: 'Quantum Creator Rig',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Cutting-edge rig with neural encoders and instant renders for ambitious builds.',
    category: 'tech',
    family: 'pc',
    exclusivityGroup: 'tech:pc',
    placements: ['general'],
    cost: quantumRigConfig.cost, // Spec: docs/normalized_economy.json → upgrades.quantumRig.setup_cost
    requires: quantumRigConfig.requires, // Spec: docs/normalized_economy.json → upgrades.quantumRig.requirements
    effects: { payout_mult: 1.12, maint_time_mult: 0.85 },
    affects: {
      assets: { tags: [ 'desktop_work', 'software', 'video' ] },
      actions: { types: [ 'maintenance', 'payout' ] }
    },
    metrics: { cost: { label: '🧠 Quantum rig investment', category: 'gear' } },
    logMessage: 'Rendering, compiling, and editing now feel instant—your rig hums with headroom.',
    logType: 'upgrade'
  }
];

export default pcs;
