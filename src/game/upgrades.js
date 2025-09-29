import { COFFEE_LIMIT } from '../core/constants.js';
import { formatMoney } from '../core/helpers.js';
import { getAssetState, getState, getUpgradeState } from '../core/state.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { createUpgrade } from './content/schema.js';
import { gainTime } from './time.js';
import {
  ASSISTANT_CONFIG,
  canFireAssistant,
  canHireAssistant,
  fireAssistant,
  getAssistantCount,
  getAssistantDailyCost,
  hireAssistant
} from './assistant.js';

const assistantUpgrade = createUpgrade({
  id: 'assistant',
  name: 'Hire Virtual Assistant',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Scale your admin squad. Each hire adds hours but expects daily wages.',
  defaultState: {
    count: 0
  },
  repeatable: true,
  details: [
    () => `💵 Hiring Cost: <strong>$${formatMoney(ASSISTANT_CONFIG.hiringCost)}</strong>`,
    () => `👥 Team Size: <strong>${getAssistantCount()} / ${ASSISTANT_CONFIG.maxAssistants}</strong>`,
    () => `⏳ Support: <strong>+${ASSISTANT_CONFIG.hoursPerAssistant}h per assistant</strong>`,
    () =>
      `💰 Payroll: <strong>$${formatMoney(
        ASSISTANT_CONFIG.hourlyRate * ASSISTANT_CONFIG.hoursPerAssistant
      )}</strong> each day per assistant`,
    () => `📅 Current Payroll: <strong>$${formatMoney(getAssistantDailyCost())} / day</strong>`
  ],
  actionClassName: 'secondary',
  actionLabel: () =>
    getAssistantCount() >= ASSISTANT_CONFIG.maxAssistants ? 'Assistant Team Full' : 'Hire Assistant',
  disabled: () => !canHireAssistant(),
  blockedMessage: 'You need more funds or a free slot before hiring another assistant.',
  onPurchase: () => {
    hireAssistant();
  },
  extraContent: card => {
    const row = document.createElement('div');
    row.className = 'inline-actions';
    const fireButton = document.createElement('button');
    fireButton.className = 'secondary';
    fireButton.type = 'button';
    fireButton.textContent = 'Fire Assistant';
    fireButton.addEventListener('click', () => {
      if (fireButton.disabled) return;
      executeAction(() => {
        const removed = fireAssistant();
        if (removed && getState().timeLeft <= 0) {
          checkDayEnd();
        }
      });
    });
    row.appendChild(fireButton);
    card.appendChild(row);
    return { fireButton };
  },
  update: (_state, ui) => {
    if (!ui?.extra?.fireButton) return;
    const count = getAssistantCount();
    ui.extra.fireButton.disabled = !canFireAssistant();
    ui.extra.fireButton.textContent = count > 0 ? 'Fire Assistant' : 'No Assistants Hired';
  }
});

const camera = createUpgrade({
  id: 'camera',
  name: 'Buy Camera',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Unlocks video production gear so you can start vlogs and shoot stock photos.',
  cost: 200,
  unlocks: 'Weekly Vlog Channel & Stock Photo Galleries',
  supports: ['vlog', 'stockPhotos'],
  actionClassName: 'secondary',
  actionLabel: 'Purchase Camera',
  labels: {
    purchased: 'Camera Ready'
  },
  metrics: {
    cost: { label: '🎥 Camera purchase', category: 'upgrade' }
  },
  logMessage: 'You bought a mirrorless camera rig. Vlogs and photo galleries just unlocked!',
  logType: 'upgrade'
});

const studio = createUpgrade({
  id: 'studio',
  name: 'Lighting Kit',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Soft boxes, reflectors, and editing presets for glossier stock photos.',
  cost: 220,
  unlocks: 'Stock Photo Galleries',
  supports: ['stockPhotos'],
  actionClassName: 'secondary',
  actionLabel: 'Build Studio',
  labels: {
    purchased: 'Studio Ready'
  },
  metrics: {
    cost: { label: '💡 Lighting kit upgrade', category: 'upgrade' }
  },
  logMessage: 'Lighting kit assembled! Your stock photo galleries now shine in marketplaces.',
  logType: 'upgrade'
});

const cameraPro = createUpgrade({
  id: 'cameraPro',
  name: 'Cinema Camera Upgrade',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Upgrade your rig with cinema glass and stabilized mounts for prestige productions.',
  cost: 480,
  requires: ['camera'],
  boosts: 'Higher vlog quality payouts',
  supports: ['vlog'],
  actionClassName: 'secondary',
  actionLabel: 'Install Cinema Gear',
  labels: {
    purchased: 'Cinema Ready',
    missing: () => 'Requires Camera'
  },
  metrics: {
    cost: { label: '🎬 Cinema camera upgrade', category: 'upgrade' }
  },
  logMessage: 'Cinema camera calibrated! Your vlogs now look blockbuster-bright.',
  logType: 'upgrade'
});

const studioExpansion = createUpgrade({
  id: 'studioExpansion',
  name: 'Studio Expansion',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Add modular sets, color-controlled lighting, and prop storage for faster shoots.',
  cost: 540,
  requires: ['studio'],
  boosts: 'Stock photo session efficiency',
  supports: ['stockPhotos'],
  actionClassName: 'secondary',
  actionLabel: 'Expand Studio',
  labels: {
    purchased: 'Studio Expanded',
    missing: () => 'Requires Lighting Kit'
  },
  metrics: {
    cost: { label: '🏗️ Studio expansion build-out', category: 'upgrade' }
  },
  logMessage: 'Studio expansion complete! You now glide through photo shoots with cinematic flair.',
  logType: 'upgrade'
});

const serverRack = createUpgrade({
  id: 'serverRack',
  name: 'Server Rack - Starter',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Spin up a reliable rack with monitoring so prototypes stay online.',
  cost: 650,
  unlocks: 'Stable environments for advanced products',
  supports: ['saas'],
  actionClassName: 'secondary',
  actionLabel: 'Install Rack',
  labels: {
    purchased: 'Rack Online'
  },
  metrics: {
    cost: { label: '🗄️ Starter server rack install', category: 'infrastructure' }
  },
  logMessage: 'Server rack assembled! Your advanced projects now have a home base.',
  logType: 'upgrade'
});

const serverCluster = createUpgrade({
  id: 'serverCluster',
  name: 'Cloud Cluster',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Deploy auto-scaling containers and CI pipelines so your SaaS survives launch day.',
  cost: 1150,
  requires: ['serverRack'],
  unlocks: 'SaaS deployments',
  supports: ['saas'],
  actionClassName: 'secondary',
  actionLabel: 'Deploy Cluster',
  labels: {
    purchased: 'Cluster Ready',
    missing: () => 'Requires Rack'
  },
  metrics: {
    cost: { label: '☁️ Cloud cluster deployment', category: 'infrastructure' }
  },
  logMessage: 'Cloud cluster humming! SaaS deploy pipelines now run without midnight fire drills.',
  logType: 'upgrade'
});

const serverEdge = createUpgrade({
  id: 'serverEdge',
  name: 'Edge Delivery Network',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Distribute workloads across edge nodes for instant response times and uptime bragging rights.',
  cost: 1450,
  requires: ['serverCluster'],
  boosts: 'SaaS subscriber trust',
  supports: ['saas'],
  actionClassName: 'secondary',
  actionLabel: 'Activate Edge Network',
  labels: {
    purchased: 'Edge Live',
    missing: () => 'Requires Cluster'
  },
  metrics: {
    cost: { label: '🌐 Edge delivery rollout', category: 'infrastructure' }
  },
  logMessage: 'Edge network activated! Your SaaS now feels instant from any continent.',
  logType: 'upgrade'
});

const coffee = createUpgrade({
  id: 'coffee',
  name: 'Turbo Coffee',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Instantly gain +1h of focus for today. Side effects include jittery success.',
  cost: 40,
  repeatable: true,
  defaultState: {
    usedToday: 0
  },
  details: [
    () => `Daily limit: <strong>${COFFEE_LIMIT}</strong>`
  ],
  actionClassName: 'secondary',
  actionLabel: context =>
    context.upgradeState.usedToday >= COFFEE_LIMIT ? 'Too Much Caffeine' : 'Brew Boost',
  disabled: context => {
    const { state, upgradeState } = context;
    if (!state) return true;
    if (upgradeState.usedToday >= COFFEE_LIMIT) return true;
    if (state.timeLeft <= 0) return true;
    return false;
  },
  blockedMessage: 'You hit the caffeine limit, ran out of cash, or need more hours before brewing another cup.',
  metrics: {
    cost: { label: '☕ Turbo coffee boost', category: 'consumable' }
  },
  onPurchase: context => {
    const { state, upgradeState } = context;
    upgradeState.usedToday += 1;
    state.dailyBonusTime += 1;
    gainTime(1);
  },
  logMessage: 'Turbo coffee acquired! You feel invincible for another hour (ish).',
  logType: 'boost'
});

const course = createUpgrade({
  id: 'course',
  name: 'Automation Course',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Unlocks smarter blogging tools, boosting blog income by +50%.',
  cost: 260,
  requires: [
    {
      type: 'custom',
      met: () => getAssetState('blog').instances.length > 0,
      detail: 'Requires: <strong>At least one active blog</strong>'
    }
  ],
  supports: ['blog'],
  actionClassName: 'secondary',
  actionLabel: 'Study Up',
  labels: {
    purchased: 'Automation Ready',
    missing: () => 'Requires Active Blog'
  },
  metrics: {
    cost: { label: '📚 Automation course tuition', category: 'upgrade' }
  },
  logMessage: 'Automation course complete! Your blog network now earns +50% more each day.',
  logType: 'upgrade',
  cardState: (_state, card) => {
    if (!card) return;
    const upgrade = getUpgradeState('course');
    const blogActive = getAssetState('blog').instances.length > 0;
    card.classList.toggle('locked', !blogActive && !upgrade.purchased);
  }
});

export const UPGRADES = [
  assistantUpgrade,
  camera,
  studio,
  cameraPro,
  studioExpansion,
  serverRack,
  serverCluster,
  serverEdge,
  coffee,
  course
];

export function listUpgradesSupportingAsset(assetId) {
  if (!assetId) return [];
  return UPGRADES.filter(
    upgrade => Array.isArray(upgrade.supportsAssets) && upgrade.supportsAssets.includes(assetId)
  );
}
