import { formatDays, formatHours, formatList, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { createAssetInstance, getAssetDefinition, getAssetState, getState, getUpgradeState } from '../core/state.js';
import { addMoney, spendMoney } from './currency.js';
import { executeAction } from './actions.js';
import { checkDayEnd } from './lifecycle.js';
import { spendTime } from './time.js';
import {
  assetRequirementsMetById,
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock
} from './requirements.js';

const blogDefinition = {
  id: 'blog',
  name: 'Personal Blog Network',
  singular: 'Blog',
  tag: { label: 'Foundation', type: 'passive' },
  description: 'Launch cozy blogs that drip ad revenue once the posts are polished.',
  setup: { days: 1, hoursPerDay: 3, cost: 25 },
  maintenance: { hours: 1, cost: 0 },
  income: {
    base: 70,
    variance: 0.25,
    logType: 'passive',
    modifier: amount => {
      const automation = getUpgradeState('course').purchased ? 1.5 : 1;
      return amount * automation;
    }
  },
  messages: {
    setupStarted: label => `${label} is outlined and queued. Brew some celebratory tea while drafts simmer!`,
    setupProgress: (label, completed, total) => `${label} is ${completed}/${total} day${total === 1 ? '' : 's'} into launch prep.`,
    setupComplete: label => `${label} is live! Readers are already clicking through your witty headlines.`,
    setupMissed: label => `${label} sat untouched today, so launch prep stalled.`,
    income: (amount, label) => `${label} delivered $${formatMoney(amount)} in ad pennies and affiliate sprinkles.`,
    maintenanceSkipped: label => `${label} missed its edits today, so sponsors withheld the payout.`
  },
  defaultState: { instances: [] }
};

const vlogDefinition = {
  id: 'vlog',
  name: 'Weekly Vlog Channel',
  singular: 'Vlog',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Film upbeat vlogs, edit late-night montages, and ride the algorithmic rollercoaster.',
  setup: { days: 3, hoursPerDay: 4, cost: 180 },
  maintenance: { hours: 1.5, cost: 0 },
  income: { base: 140, variance: 0.35, logType: 'passive' },
  requirements: [{ type: 'equipment', id: 'camera' }],
  messages: {
    setupStarted: label => `${label} is in production! Your storyboard is taped across the wall.`,
    setupProgress: (label, completed, total) => `${label} captured more footage (${completed}/${total} shoot days complete).`,
    setupComplete: label => `${label} premiered! Subscribers binged the episode while you slept.`,
    setupMissed: label => `${label} needed camera time today, but the lens cap never came off.`,
    income: (amount, label) => `${label} raked in $${formatMoney(amount)} from sponsors and mid-rolls.`,
    maintenanceSkipped: label => `${label} skipped its edit session, so the algorithm served someone else.`
  },
  defaultState: { instances: [] }
};

const ebookDefinition = {
  id: 'ebook',
  name: 'Digital E-Book Series',
  singular: 'E-Book',
  tag: { label: 'Knowledge', type: 'passive' },
  description: 'Package your expertise into downloadable page-turners that sell while you snooze.',
  setup: { days: 4, hoursPerDay: 3, cost: 60 },
  maintenance: { hours: 0.5, cost: 0 },
  income: { base: 120, variance: 0.3, logType: 'passive' },
  requirements: [{ type: 'knowledge', id: 'outlineMastery' }],
  messages: {
    setupStarted: label => `${label} outline is locked! Next up: polishing chapters and cover art.`,
    setupProgress: (label, completed, total) => `${label} drafting sprint is ${completed}/${total} days complete.`,
    setupComplete: label => `${label} launched! Readers are devouring chapters on every device.`,
    setupMissed: label => `${label} missed its writing block today, so progress stayed flat.`,
    income: (amount, label) => `${label} sold bundles worth $${formatMoney(amount)} today.`,
    maintenanceSkipped: label => `${label} skipped promo pushes, so the sales funnel dried up.`
  },
  defaultState: { instances: [] }
};

const stockPhotosDefinition = {
  id: 'stockPhotos',
  name: 'Stock Photo Gallery',
  singular: 'Gallery',
  tag: { label: 'Creative', type: 'passive' },
  description: 'Curate vibrant photo packs that designers license in surprising numbers.',
  setup: { days: 3, hoursPerDay: 2, cost: 0 },
  maintenance: { hours: 1, cost: 0 },
  income: { base: 95, variance: 0.45, logType: 'passive' },
  requirements: [
    { type: 'equipment', id: 'camera' },
    { type: 'equipment', id: 'studio' },
    { type: 'knowledge', id: 'photoLibrary' }
  ],
  messages: {
    setupStarted: label => `${label} scouting trip kicked off—lens caps off and inspiration flowing.`,
    setupProgress: (label, completed, total) => `${label} catalogued more shots (${completed}/${total} curation days done).`,
    setupComplete: label => `${label} went live! Designers are licensing your crisp shots already.`,
    setupMissed: label => `${label} needed fresh captures today, but the skies stayed figuratively dark.`,
    income: (amount, label) => `${label} licensed imagery worth $${formatMoney(amount)} today.`,
    maintenanceSkipped: label => `${label} skipped tagging and lost marketplace visibility.`
  },
  defaultState: { instances: [] }
};

const dropshippingDefinition = {
  id: 'dropshipping',
  name: 'Dropshipping Storefront',
  singular: 'Storefront',
  tag: { label: 'Commerce', type: 'passive' },
  description: 'Spin up a storefront, source trending products, and let fulfillment partners handle the rest.',
  setup: { days: 3, hoursPerDay: 4, cost: 500 },
  maintenance: { hours: 2, cost: 0 },
  income: { base: 260, variance: 0.5, logType: 'passive' },
  requirements: [
    { type: 'knowledge', id: 'ecomPlaybook' },
    { type: 'experience', assetId: 'blog', count: 2 }
  ],
  messages: {
    setupStarted: label => `${label} is onboarding suppliers. Your product list already looks spicy.`,
    setupProgress: (label, completed, total) => `${label} refined logistics (${completed}/${total} setup days banked).`,
    setupComplete: label => `${label} opened to the public! First orders are already in the queue.`,
    setupMissed: label => `${label} needed operations time today, but the warehouse lights stayed off.`,
    income: (amount, label) => `${label} cleared $${formatMoney(amount)} in daily profit after fees.`,
    maintenanceSkipped: label => `${label} skipped customer support, so refunds ate the day.`
  },
  defaultState: { instances: [] }
};

const saasDefinition = {
  id: 'saas',
  name: 'SaaS Micro-App',
  singular: 'App',
  tag: { label: 'Advanced', type: 'passive' },
  description: 'Ship a tidy micro-SaaS that collects subscriptions from superfans of your niche tools.',
  setup: { days: 7, hoursPerDay: 5, cost: 1500 },
  maintenance: { hours: 3, cost: 0 },
  income: { base: 620, variance: 0.6, logType: 'passive' },
  requirements: [
    { type: 'knowledge', id: 'automationCourse' },
    { type: 'experience', assetId: 'dropshipping', count: 1 },
    { type: 'experience', assetId: 'ebook', count: 1 }
  ],
  messages: {
    setupStarted: label => `${label} sprint kicked off with wireframes and caffeine-fueled commits.`,
    setupProgress: (label, completed, total) => `${label} completed another release sprint (${completed}/${total}).`,
    setupComplete: label => `${label} launched! Subscribers fell in love with your automation magic.`,
    setupMissed: label => `${label} needed coding time today, but the repo stayed untouched.`,
    income: (amount, label) => `${label} banked $${formatMoney(amount)} in recurring revenue today.`,
    maintenanceSkipped: label => `${label} skipped bug triage, so churn nibbled the numbers.`
  },
  defaultState: { instances: [] }
};

blogDefinition.details = [
  () => ownedDetail(blogDefinition),
  () => setupDetail(blogDefinition),
  () => setupCostDetail(blogDefinition),
  () => maintenanceDetail(blogDefinition),
  () => incomeDetail(blogDefinition),
  () => latestYieldDetail(blogDefinition)
];
blogDefinition.action = buildAssetAction(blogDefinition, {
  first: 'Launch Blog',
  repeat: 'Spin Up Another Blog'
});

vlogDefinition.details = [
  () => ownedDetail(vlogDefinition),
  () => setupDetail(vlogDefinition),
  () => setupCostDetail(vlogDefinition),
  () => maintenanceDetail(vlogDefinition),
  () => renderAssetRequirementDetail('vlog'),
  () => incomeDetail(vlogDefinition),
  () => latestYieldDetail(vlogDefinition)
];
vlogDefinition.action = buildAssetAction(vlogDefinition, {
  first: 'Launch Vlog Channel',
  repeat: 'Add Another Channel'
});
vlogDefinition.cardState = (_state, card) => updateAssetCardLock('vlog', card);

ebookDefinition.details = [
  () => ownedDetail(ebookDefinition),
  () => setupDetail(ebookDefinition),
  () => setupCostDetail(ebookDefinition),
  () => maintenanceDetail(ebookDefinition),
  () => renderAssetRequirementDetail('ebook'),
  () => incomeDetail(ebookDefinition),
  () => latestYieldDetail(ebookDefinition)
];
ebookDefinition.action = buildAssetAction(ebookDefinition, {
  first: 'Author First E-Book',
  repeat: 'Write Another Volume'
});
ebookDefinition.cardState = (_state, card) => updateAssetCardLock('ebook', card);

stockPhotosDefinition.details = [
  () => ownedDetail(stockPhotosDefinition),
  () => setupDetail(stockPhotosDefinition),
  () => maintenanceDetail(stockPhotosDefinition),
  () => renderAssetRequirementDetail('stockPhotos'),
  () => incomeDetail(stockPhotosDefinition),
  () => latestYieldDetail(stockPhotosDefinition)
];
stockPhotosDefinition.action = buildAssetAction(stockPhotosDefinition, {
  first: 'Curate Gallery',
  repeat: 'Add New Gallery'
});
stockPhotosDefinition.cardState = (_state, card) => updateAssetCardLock('stockPhotos', card);

dropshippingDefinition.details = [
  () => ownedDetail(dropshippingDefinition),
  () => setupDetail(dropshippingDefinition),
  () => setupCostDetail(dropshippingDefinition),
  () => maintenanceDetail(dropshippingDefinition),
  () => renderAssetRequirementDetail('dropshipping'),
  () => incomeDetail(dropshippingDefinition),
  () => latestYieldDetail(dropshippingDefinition)
];
dropshippingDefinition.action = buildAssetAction(dropshippingDefinition, {
  first: 'Open Dropshipping Store',
  repeat: 'Launch Another Storefront'
});
dropshippingDefinition.cardState = (_state, card) => updateAssetCardLock('dropshipping', card);

saasDefinition.details = [
  () => ownedDetail(saasDefinition),
  () => setupDetail(saasDefinition),
  () => setupCostDetail(saasDefinition),
  () => maintenanceDetail(saasDefinition),
  () => renderAssetRequirementDetail('saas'),
  () => incomeDetail(saasDefinition),
  () => latestYieldDetail(saasDefinition)
];
saasDefinition.action = buildAssetAction(saasDefinition, {
  first: 'Prototype Micro-App',
  repeat: 'Spin Up Another App'
});
saasDefinition.cardState = (_state, card) => updateAssetCardLock('saas', card);

export const ASSETS = [
  blogDefinition,
  vlogDefinition,
  ebookDefinition,
  stockPhotosDefinition,
  dropshippingDefinition,
  saasDefinition
];

export function allocateAssetMaintenance() {
  const state = getState();
  if (!state) return;

  const setupFunded = [];
  const setupMissed = [];
  const maintenanceFunded = [];
  const maintenanceSkipped = [];

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id);
    const setupHours = Number(definition.setup?.hoursPerDay) || 0;
    const maintenanceHours = Number(definition.maintenance?.hours) || 0;

    assetState.instances.forEach((instance, index) => {
      if (instance.status === 'setup') {
        instance.setupFundedToday = false;
        if (setupHours <= 0) {
          instance.setupFundedToday = true;
          return;
        }
        if (state.timeLeft >= setupHours) {
          spendTime(setupHours);
          instance.setupFundedToday = true;
          setupFunded.push(instanceLabel(definition, index));
        } else {
          setupMissed.push(instanceLabel(definition, index));
        }
        return;
      }

      if (instance.status === 'active') {
        instance.maintenanceFundedToday = false;
        if (maintenanceHours <= 0) {
          instance.maintenanceFundedToday = true;
          return;
        }
        if (state.timeLeft >= maintenanceHours) {
          spendTime(maintenanceHours);
          instance.maintenanceFundedToday = true;
          maintenanceFunded.push(instanceLabel(definition, index));
        } else {
          maintenanceSkipped.push(instanceLabel(definition, index));
        }
      }
    });
  }

  if (setupFunded.length) {
    addLog(`You invested setup time into ${formatList(setupFunded)}. Momentum maintained!`, 'info');
  }
  if (setupMissed.length) {
    addLog(`${formatList(setupMissed)} could not advance because you ran out of hours.`, 'warning');
  }
  if (maintenanceFunded.length) {
    addLog(`Daily upkeep handled for ${formatList(maintenanceFunded)}.`, 'info');
  }
  if (maintenanceSkipped.length) {
    addLog(`${formatList(maintenanceSkipped)} missed upkeep and will earn zero today.`, 'warning');
  }
}

export function closeOutDay() {
  const state = getState();
  if (!state) return;

  const startOfDay = state.day;

  for (const definition of ASSETS) {
    const assetState = getAssetState(definition.id);
    const totalSetupDays = Math.max(0, Number(definition.setup?.days) || 0);

    assetState.instances.forEach((instance, index) => {
      if (instance.status === 'setup') {
        if (instance.setupFundedToday) {
          instance.daysRemaining = Math.max(0, (instance.daysRemaining || totalSetupDays) - 1);
          instance.daysCompleted = Math.min(totalSetupDays, (instance.daysCompleted || 0) + 1);
          const label = instanceLabel(definition, index);
          if (instance.daysRemaining <= 0) {
            instance.status = 'active';
            instance.setupFundedToday = false;
            instance.maintenanceFundedToday = false;
            instance.lastIncome = 0;
            instance.totalIncome = instance.totalIncome || 0;
            instance.createdOnDay = startOfDay;
            const message = definition.messages?.setupComplete
              ? definition.messages.setupComplete(label, assetState, instance)
              : `${label} wrapped setup and is ready to earn!`;
            addLog(message, 'passive');
          } else {
            const message = definition.messages?.setupProgress
              ? definition.messages.setupProgress(label, totalSetupDays - instance.daysRemaining, totalSetupDays)
              : `${label} moved closer to launch (${totalSetupDays - instance.daysRemaining}/${totalSetupDays}).`;
            addLog(message, 'info');
          }
        } else {
          const label = instanceLabel(definition, index);
          const message = definition.messages?.setupMissed
            ? definition.messages.setupMissed(label, assetState, instance)
            : `${label} did not receive setup time today, so progress paused.`;
          addLog(message, 'warning');
        }
        instance.setupFundedToday = false;
        return;
      }

      if (instance.status === 'active') {
        if (instance.maintenanceFundedToday) {
          const payout = rollDailyIncome(definition, assetState, instance);
          instance.lastIncome = payout;
          instance.totalIncome = (instance.totalIncome || 0) + payout;
          const label = instanceLabel(definition, index);
          const message = definition.messages?.income
            ? definition.messages.income(payout, label, instance, assetState)
            : `${definition.name} generated $${formatMoney(payout)} today.`;
          addMoney(payout, message, definition.income?.logType || 'passive');
        } else {
          instance.lastIncome = 0;
          const label = instanceLabel(definition, index);
          const message = definition.messages?.maintenanceSkipped
            ? definition.messages.maintenanceSkipped(label, assetState, instance)
            : `${label} skipped maintenance and earned nothing today.`;
          addLog(message, 'warning');
        }
        instance.maintenanceFundedToday = false;
      }
    });
  }
}

function buildAssetAction(definition, labels = {}) {
  return {
    label: () => assetActionLabel(definition, labels),
    className: 'primary',
    disabled: () => isAssetPurchaseDisabled(definition),
    onClick: () => startAsset(definition)
  };
}

function assetActionLabel(definition, labels) {
  const assetState = getAssetState(definition.id);
  const first = labels.first || `Launch ${definition.singular || definition.name}`;
  const repeat = labels.repeat || `Add Another ${definition.singular || definition.name}`;
  return assetState.instances.length ? repeat : first;
}

function isAssetPurchaseDisabled(definition) {
  if (!assetRequirementsMetById(definition.id)) return true;
  const state = getState();
  const setupHours = Number(definition.setup?.hoursPerDay) || 0;
  const setupCost = Number(definition.setup?.cost) || 0;
  if (setupHours > 0 && state.timeLeft < setupHours) return true;
  if (setupCost > 0 && state.money < setupCost) return true;
  return false;
}

function startAsset(definition) {
  executeAction(() => {
    if (!assetRequirementsMetById(definition.id)) {
      addLog(
        `You still need to meet the requirements before starting ${definition.singular || definition.name}.`,
        'info'
      );
      return;
    }

    const state = getState();
    const setupHours = Number(definition.setup?.hoursPerDay) || 0;
    const setupCost = Number(definition.setup?.cost) || 0;
    if (setupHours > 0 && state.timeLeft < setupHours) {
      addLog('You ran out of hours today. Tackle setup tomorrow after resting.', 'warning');
      return;
    }
    if (setupCost > 0 && state.money < setupCost) {
      addLog('You need more cash before covering that setup cost.', 'warning');
      return;
    }

    if (setupCost > 0) {
      spendMoney(setupCost);
    }
    if (setupHours > 0) {
      spendTime(setupHours);
    }

    const assetState = getAssetState(definition.id);
    const instance = createAssetInstance(definition, {
      setupFundedToday: setupHours > 0
    });
    assetState.instances.push(instance);

    const label = instanceLabel(definition, assetState.instances.length - 1);
    const message = definition.messages?.setupStarted
      ? definition.messages.setupStarted(label, assetState, instance)
      : `You kicked off ${label}. Keep investing time until it launches.`;
    addLog(message, 'passive');
  });
  checkDayEnd();
}

function ownedDetail(definition) {
  const assetState = getAssetState(definition.id);
  const total = assetState.instances.length;
  if (!total) {
    return '📦 Owned: <strong>0</strong> (ready for your first build)';
  }
  const active = assetState.instances.filter(instance => instance.status === 'active').length;
  const setup = total - active;
  const parts = [];
  if (active) parts.push(`${active} active`);
  if (setup) parts.push(`${setup} in setup`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : '';
  return `📦 Owned: <strong>${total}</strong>${suffix}`;
}

function setupDetail(definition) {
  const days = Number(definition.setup?.days) || 0;
  const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
  if (days <= 0 && hoursPerDay <= 0) {
    return '⏳ Setup: <strong>Instant</strong>';
  }
  if (days <= 1) {
    return `⏳ Setup: <strong>${formatHours(hoursPerDay)} investment</strong>`;
  }
  return `⏳ Setup: <strong>${formatDays(days)} · ${formatHours(hoursPerDay)}/day</strong>`;
}

function setupCostDetail(definition) {
  const cost = Number(definition.setup?.cost) || 0;
  return `💵 Setup Cost: <strong>$${formatMoney(cost)}</strong>`;
}

function maintenanceDetail(definition) {
  const hours = Number(definition.maintenance?.hours) || 0;
  const cost = Number(definition.maintenance?.cost) || 0;
  const hasHours = hours > 0;
  const hasCost = cost > 0;
  if (!hasHours && !hasCost) {
    return '🛠 Maintenance: <strong>None</strong>';
  }
  const parts = [];
  if (hasHours) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (hasCost) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return `🛠 Maintenance: <strong>${parts.join(' + ')}</strong>`;
}

function incomeDetail(definition) {
  const { min, max } = getDailyIncomeRange(definition);
  return `💸 Income: <strong>$${formatMoney(min)} - $${formatMoney(max)} / day</strong> per ${definition.singular || 'asset'}`;
}

function latestYieldDetail(definition) {
  const assetState = getAssetState(definition.id);
  const active = assetState.instances.filter(instance => instance.status === 'active');
  if (!active.length) {
    return '📊 Latest Yield: <strong>$0</strong> (no active instances)';
  }
  const average = active.reduce((sum, instance) => sum + (Number(instance.lastIncome) || 0), 0) / active.length;
  return `📊 Latest Yield: <strong>$${formatMoney(Math.round(average))}</strong> avg per active instance`;
}

function instanceLabel(definition, index) {
  const base = definition.singular || definition.name;
  return `${base} #${index + 1}`;
}

export function getDailyIncomeRange(definition) {
  const base = Math.max(0, Number(definition.income?.base) || 0);
  const variance = Math.max(0, Number(definition.income?.variance) || 0);
  const min = definition.income?.floor ?? Math.round(base * (1 - variance));
  const max = definition.income?.ceiling ?? Math.round(base * (1 + variance));
  return {
    min: Math.max(0, min),
    max: Math.max(Math.max(0, min), max)
  };
}

function rollDailyIncome(definition, assetState, instance) {
  const { min, max } = getDailyIncomeRange(definition);
  const roll = min + Math.random() * Math.max(0, max - min);
  const rounded = Math.round(roll);
  if (typeof definition.income?.modifier === 'function') {
    return Math.max(0, Math.round(definition.income.modifier(rounded, { definition, assetState, instance })));
  }
  return Math.max(0, rounded);
}

export function getIncomeRangeForDisplay(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return { min: 0, max: 0 };
  return getDailyIncomeRange(definition);
}
