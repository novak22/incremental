import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const monitorHubConfig = upgradeConfigs.monitorHub; // Spec: docs/normalized_economy.json → upgrades.monitorHub
const dualMonitorArrayConfig = upgradeConfigs.dualMonitorArray; // Spec: docs/normalized_economy.json → upgrades.dualMonitorArray
const colorGradingDisplayConfig = upgradeConfigs.colorGradingDisplay; // Spec: docs/normalized_economy.json → upgrades.colorGradingDisplay

const monitors = [
  {
    id: 'monitorHub',
    name: 'Monitor Dock',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Dock station that powers two 4K monitors with one cable and instant switching.',
    category: 'tech',
    family: 'monitor_hub',
    placements: ['general', 'blogpress'],
    cost: monitorHubConfig.cost, // Spec: docs/normalized_economy.json → upgrades.monitorHub.setup_cost
    provides: { monitor: 2 },
    effects: { setup_time_mult: 0.95 },
    affects: {
      assets: { tags: [ 'desktop_work' ] },
      actions: { types: [ 'setup' ] }
    },
    metrics: { cost: { label: '🖥️ Monitor dock setup', category: 'gear' } },
    logMessage: 'Your command center now has spare ports and screen real estate for days.',
    logType: 'upgrade'
  },
  {
    id: 'dualMonitorArray',
    name: 'Dual Monitor Array',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Mount two ultra-thin displays for editing, dashboards, and reference boards.',
    category: 'tech',
    family: 'monitor',
    placements: ['general', 'blogpress', 'videotube'],
    cost: dualMonitorArrayConfig.cost, // Spec: docs/normalized_economy.json → upgrades.dualMonitorArray.setup_cost
    requires: dualMonitorArrayConfig.requires, // Spec: docs/normalized_economy.json → upgrades.dualMonitorArray.requirements
    consumes: { monitor: 1 },
    effects: { quality_progress_mult: 1.2 },
    affects: {
      assets: { tags: [ 'desktop_work', 'video' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🖥️ Dual monitor expansion', category: 'gear' } },
    logMessage: 'Two displays keep editing, research, and dashboards aligned in view.',
    logType: 'upgrade'
  },
  {
    id: 'colorGradingDisplay',
    name: 'Color Grading Display',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Reference-grade display for colorists and photo editors who need true-to-life hues.',
    category: 'tech',
    family: 'monitor',
    placements: ['general', 'digishelf', 'videotube'],
    cost: colorGradingDisplayConfig.cost, // Spec: docs/normalized_economy.json → upgrades.colorGradingDisplay.setup_cost
    requires: colorGradingDisplayConfig.requires, // Spec: docs/normalized_economy.json → upgrades.colorGradingDisplay.requirements
    consumes: { monitor: 1 },
    effects: { quality_progress_mult: 1.3 },
    affects: {
      assets: { tags: [ 'video', 'photo' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🖥️ Color grading display', category: 'gear' } },
    logMessage: 'Visual work pops with accurate hues and clients notice the upgrade.',
    logType: 'upgrade'
  }
];

export default monitors;
