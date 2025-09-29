import { COFFEE_LIMIT } from '../core/constants.js';
import { formatMoney } from '../core/helpers.js';
import { getAssetState, getState, getUpgradeState } from '../core/state.js';
import { getKnowledgeProgress } from './requirements.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { createUpgrade } from './content/schema.js';
import { gainTime } from './time.js';
import { getKnowledgeProgress } from './requirements.js';
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
  name: 'Camera',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Unlocks video production gear so you can start vlogs and shoot stock photos.',
  cost: 200,
  unlocks: 'Weekly Vlog Channel & Stock Photo Galleries',
  skills: ['visual'],
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
  skills: ['visual'],
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
  boosts: 'Boosts vlog payouts and doubles quality progress',
  details: [
    () => '🎞️ Vlog quality actions count double progress once the cinema rig is live.',
    () => '💰 Daily vlog income jumps by roughly +25% and viral bursts spike harder.'
  ],
  skills: ['visual'],
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
  boosts: 'Stock photo payouts + faster shoot progress',
  details: [
    () => '📸 Stock photo quality actions earn double progress with the expanded studio.',
    () => '💵 Galleries pick up roughly +20% daily income thanks to premium staging.'
  ],
  skills: ['visual'],
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

function countActive(assetId) {
  const state = getAssetState(assetId);
  const instances = state?.instances || [];
  return instances.filter(instance => instance.status === 'active').length;
}

function formatKnowledgeProgress(id) {
  const progress = getKnowledgeProgress(id);
  const totalDays = progress?.totalDays || 0;
  const completed = Boolean(progress?.completed);
  const daysCompleted = progress?.daysCompleted || 0;
  if (completed) {
    return 'Completed';
  }
  if (totalDays > 0) {
    const percent = Math.min(100, Math.round((daysCompleted / totalDays) * 100));
    return `${percent}% complete (${daysCompleted}/${totalDays} days)`;
  }
  return 'Not started';
}

const editorialPipeline = createUpgrade({
  id: 'editorialPipeline',
  name: 'Editorial Pipeline Suite',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Stand up pro-grade editorial calendars so every blog post ships polished and on schedule.',
  cost: 360,
  requires: [
    'course',
    { type: 'asset', id: 'blog', active: true, count: 1 },
    {
      type: 'custom',
      met: () => getKnowledgeProgress('outlineMastery').completed,
      detail: 'Requires: <strong>Outline Mastery Workshop completed</strong>'
    }
  ],
  boosts: 'Stacks new blog and e-book bonuses across every publishing push',
  skills: ['writing', { id: 'promotion', weight: 0.5 }],
  actionClassName: 'secondary',
  actionLabel: 'Build Editorial Suite',
  labels: {
    purchased: 'Editorial Suite Ready',
    missing: () => 'Requires Publishing Momentum'
  },
  metrics: {
    cost: { label: '🧠 Editorial pipeline build-out', category: 'upgrade' }
  },
  details: [
    () => `🧾 Active blogs ready: <strong>${countActive('blog')}</strong>`,
    () => `📚 Outline Mastery progress: <strong>${formatKnowledgeProgress('outlineMastery')}</strong>`
  ],
  logMessage: 'Editorial pipeline humming! Your posts now glide from outline to publish without bottlenecks.',
  logType: 'upgrade'
});

const syndicationSuite = createUpgrade({
  id: 'syndicationSuite',
  name: 'Syndication Suite',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Spin up partner feeds, guest slots, and cross-promotions to syndicate your best work everywhere.',
  cost: 720,
  requires: [
    'editorialPipeline',
    { type: 'asset', id: 'blog', active: true, count: 1 },
    { type: 'asset', id: 'ebook', active: true, count: 1 },
    {
      type: 'custom',
      met: () => getKnowledgeProgress('brandVoiceLab').completed,
      detail: 'Requires: <strong>Brand Voice Lab completed</strong>'
    }
  ],
  boosts: 'Energises blogs, e-books, and vlogs with syndicated promos and bigger payouts',
  skills: ['audience', { id: 'promotion', weight: 0.5 }],
  actionClassName: 'secondary',
  actionLabel: 'Launch Syndication Suite',
  labels: {
    purchased: 'Syndication Live',
    missing: () => 'Requires Cross-Media Presence'
  },
  metrics: {
    cost: { label: '🌐 Syndication suite rollout', category: 'upgrade' }
  },
  details: [
    () => `🧾 Active blogs ready: <strong>${countActive('blog')}</strong>`,
    () => `📚 Outline Mastery progress: <strong>${formatKnowledgeProgress('outlineMastery')}</strong>`,
    () => `🎙️ Brand Voice Lab progress: <strong>${formatKnowledgeProgress('brandVoiceLab')}</strong>`,
    () => `📚 Active e-books in market: <strong>${countActive('ebook')}</strong>`
  ],
  logMessage: 'Syndication suite secured! Partner feeds now echo your stories across the web.',
  logType: 'upgrade'
});

const immersiveStoryWorlds = createUpgrade({
  id: 'immersiveStoryWorlds',
  name: 'Immersive Story Worlds',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Blend blogs, books, and vlogs into one living universe with AR teasers and fan quests.',
  cost: 1080,
  requires: [
    'syndicationSuite',
    { type: 'asset', id: 'blog', active: true, count: 1 },
    { type: 'asset', id: 'ebook', active: true, count: 1 },
    { type: 'asset', id: 'vlog', active: true, count: 1 },
    {
      type: 'custom',
      met: () =>
        getKnowledgeProgress('outlineMastery').completed && getKnowledgeProgress('brandVoiceLab').completed,
      detail: 'Requires: <strong>Outline Mastery & Brand Voice Lab completed</strong>'
    }
  ],
  boosts: 'Adds premium payouts and faster progress for every creative asset',
  skills: ['visual', { id: 'writing', weight: 0.5 }],
  actionClassName: 'secondary',
  actionLabel: 'Launch Story Worlds',
  labels: {
    purchased: 'Story Worlds Live',
    missing: () => 'Requires Immersive Audience'
  },
  metrics: {
    cost: { label: '🌌 Story world immersion build', category: 'upgrade' }
  },
  details: [
    () => `🧾 Active blogs ready: <strong>${countActive('blog')}</strong>`,
    () => `📚 Active e-books in market: <strong>${countActive('ebook')}</strong>`,
    () => `🎬 Active vlogs broadcasting: <strong>${countActive('vlog')}</strong>`,
    () => `📚 Outline Mastery progress: <strong>${formatKnowledgeProgress('outlineMastery')}</strong>`,
    () => `🎙️ Brand Voice Lab progress: <strong>${formatKnowledgeProgress('brandVoiceLab')}</strong>`
  ],
  logMessage: 'Immersive story worlds unlocked! Fans now explore your universe across every channel.',
  logType: 'upgrade'
});

const serverRack = createUpgrade({
  id: 'serverRack',
  name: 'Server Rack - Starter',
  tag: { label: 'Unlock', type: 'unlock' },
  description: 'Spin up a reliable rack with monitoring so prototypes stay online.',
  cost: 650,
  unlocks: 'Stable environments for advanced products',
  skills: ['infrastructure'],
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

const fulfillmentAutomation = createUpgrade({
  id: 'fulfillmentAutomation',
  name: 'Fulfillment Automation Suite',
  tag: { label: 'Commerce', type: 'boost' },
  description: 'Tie together your winning storefronts with automated pick, pack, and ship magic.',
  cost: 780,
  requires: [
    {
      type: 'asset',
      id: 'dropshipping',
      count: 2,
      active: true
    },
    {
      type: 'custom',
      met: () => getKnowledgeProgress('ecomPlaybook').completed,
      detail: 'Requires: <strong>Complete the E-Commerce Playbook</strong>'
    }
  ],
  boosts: 'Dropshipping payouts + faster research/listing/ads progress',
  skills: ['commerce', { id: 'research', weight: 0.6 }],
  actionClassName: 'secondary',
  actionLabel: 'Automate Fulfillment',
  labels: {
    purchased: 'Automation Active'
  },
  metrics: {
    cost: { label: '📦 Fulfillment automation rollout', category: 'upgrade' }
  },
  logMessage: 'Robotic pickers, synced CRMs, and instant fulfillment dashboards now power your shops.',
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
  skills: ['infrastructure'],
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

const globalSupplyMesh = createUpgrade({
  id: 'globalSupplyMesh',
  name: 'Global Supply Mesh',
  tag: { label: 'Commerce', type: 'boost' },
  description: 'Forge data-sharing deals with worldwide 3PL partners so inventory never sleeps.',
  cost: 1150,
  requires: [
    'fulfillmentAutomation',
    {
      type: 'asset',
      id: 'dropshipping',
      count: 3,
      active: true
    },
    {
      type: 'custom',
      met: () => getKnowledgeProgress('photoLibrary').completed,
      detail: 'Requires: <strong>Complete the Photo Catalog Curation course</strong>'
    }
  ],
  boosts: 'Dropshipping payouts surge & marketing tests finish faster',
  skills: ['commerce', { id: 'promotion', weight: 0.5 }],
  actionClassName: 'secondary',
  actionLabel: 'Link Global Partners',
  labels: {
    purchased: 'Mesh Live',
    missing: () => 'Requires Automation & Active Shops'
  },
  metrics: {
    cost: { label: '🌍 Global supply mesh integration', category: 'upgrade' }
  },
  logMessage:
    'You inked worldwide fulfillment agreements. Inventory syncs in real-time across every region.',
  logType: 'upgrade'
});

const serverEdge = createUpgrade({
  id: 'serverEdge',
  name: 'Edge Delivery Network',
  tag: { label: 'Boost', type: 'boost' },
  description: 'Distribute workloads across edge nodes for instant response times and uptime bragging rights.',
  cost: 1450,
  requires: ['serverCluster'],
  boosts: 'SaaS payouts + stability progress surges',
  details: [
    () => '⚙️ SaaS feature, stability, and marketing pushes count double progress once edge nodes hum.',
    () => '📈 Subscriptions pay roughly +35% more each day with the global edge footprint.'
  ],
  skills: ['infrastructure'],
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

const whiteLabelAlliance = createUpgrade({
  id: 'whiteLabelAlliance',
  name: 'White-Label Alliance',
  tag: { label: 'Commerce', type: 'boost' },
  description: 'Partner with boutique studios to bundle your galleries with each storefront launch.',
  cost: 1500,
  requires: [
    'globalSupplyMesh',
    {
      type: 'asset',
      id: 'dropshipping',
      count: 4,
      active: true
    },
    {
      type: 'custom',
      met: () =>
        getKnowledgeProgress('ecomPlaybook').completed && getKnowledgeProgress('photoLibrary').completed,
      detail: 'Requires: <strong>Complete both E-Commerce Playbook and Photo Catalog Curation</strong>'
    }
  ],
  boosts: 'Dropshipping & stock photo income climb together with faster ad promos',
  skills: ['commerce', { id: 'visual', weight: 0.4 }],
  actionClassName: 'secondary',
  actionLabel: 'Sign Alliance Charter',
  labels: {
    purchased: 'Alliance Forged',
    missing: () => 'Requires Global Mesh & Active Shops'
  },
  metrics: {
    cost: { label: '🤝 White-label alliance charter', category: 'upgrade' }
  },
  logMessage:
    'Creative partners now preload your galleries into every new storefront bundle. Co-branded kits fly off the shelves.',
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
  skills: ['software'],
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
  editorialPipeline,
  syndicationSuite,
  immersiveStoryWorlds,
  serverRack,
  fulfillmentAutomation,
  serverCluster,
  globalSupplyMesh,
  serverEdge,
  whiteLabelAlliance,
  coffee,
  course
];
