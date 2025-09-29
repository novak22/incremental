import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';

const COMMERCE_UPGRADE_CHAIN = [
  {
    id: 'fulfillmentAutomation',
    label: 'Fulfillment automation boost',
    multiplier: 1.25
  },
  {
    id: 'globalSupplyMesh',
    label: 'Global supply mesh boost',
    multiplier: 1.3
  },
  {
    id: 'whiteLabelAlliance',
    label: 'White-label alliance boost',
    multiplier: 1.35
  }
];

function getCommerceTierBonus(context) {
  if (!context?.upgrade) return 0;
  return COMMERCE_UPGRADE_CHAIN.reduce((bonus, tier) => {
    return context.upgrade(tier.id)?.purchased ? bonus + 1 : bonus;
  }, 0);
}

function applyCommerceMultipliers(amount, context) {
  if (!context?.upgrade) return amount;
  let total = amount;
  COMMERCE_UPGRADE_CHAIN.forEach(tier => {
    if (context.upgrade(tier.id)?.purchased) {
      const before = total;
      total *= tier.multiplier;
      if (typeof context.recordModifier === 'function') {
        context.recordModifier(tier.label, total - before, {
          id: tier.id,
          type: 'upgrade',
          percent: tier.multiplier - 1
        });
      }
    }
  });
  return total;
}

const dropshippingDefinition = createAssetDefinition({
  id: 'dropshipping',
  name: 'Dropshipping Product Lab',
  singular: 'Dropshipping Shop',
  tag: { label: 'Commerce', type: 'passive' },
  description: 'Prototype products, source suppliers, and automate fulfillment funnels.',
  setup: { days: 6, hoursPerDay: 4, cost: 720 },
  maintenance: { hours: 1.5, cost: 12 },
  skills: {
    setup: [
      'commerce',
      'research',
      { id: 'promotion', weight: 0.5 }
    ]
  },
  income: {
    base: 84,
    variance: 0.35,
    logType: 'passive',
    modifier: (amount, context = {}) => applyCommerceMultipliers(amount, context)
  },
  requirements: {
    knowledge: ['ecomPlaybook'],
    experience: [{ assetId: 'blog', count: 2 }]
  },
  quality: {
    summary: 'Research products, optimize listings, and scale advertising to grow a dependable e-commerce machine.',
    tracks: {
      research: { label: 'Product research sprints', shortLabel: 'research runs' },
      listing: { label: 'Listing optimizations', shortLabel: 'listing tweaks' },
      ads: { label: 'Ad experiments', shortLabel: 'ad tests' }
    },
    levels: [
      {
        level: 0,
        name: 'Prototype Pile',
        description: 'Inconsistent suppliers mean sporadic payouts.',
        income: { min: 5, max: 9 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Optimized Listings',
        description: 'Top products have polished listings and reviews.',
        income: { min: 24, max: 38 },
        requirements: { research: 4 }
      },
      {
        level: 2,
        name: 'Automation Groove',
        description: 'Fulfillment and ad funnels make sales steady.',
        income: { min: 44, max: 62 },
        requirements: { research: 11, listing: 5 }
      },
      {
        level: 3,
        name: 'Scaled Flywheel',
        description: 'Paid campaigns bring consistent high-ticket orders.',
        income: { min: 68, max: 92 },
        requirements: { research: 18, listing: 8, ads: 7 }
      },
      {
        level: 4,
        name: 'Omnichannel Engine',
        description: 'Automation spans every marketplace and upsell funnel you run.',
        income: { min: 95, max: 128 },
        requirements: { research: 26, listing: 12, ads: 10 }
      },
      {
        level: 5,
        name: 'Global Logistics Titan',
        description: 'Worldwide warehouses and brand loyalty make daily profits thunder.',
        income: { min: 130, max: 176 },
        requirements: { research: 38, listing: 18, ads: 16 }
      }
    ],
    actions: [
      {
        id: 'researchProduct',
        label: 'Research Product',
        time: 3,
        progressKey: 'research',
        progressAmount: context => 1 + getCommerceTierBonus(context),
        skills: ['research'],
        log: ({ label }) => `${label} spotted a trending micro-niche. Suppliers start calling back!`
      },
      {
        id: 'optimizeListing',
        label: 'Optimize Listing',
        time: 1.8,
        cost: 28,
        progressKey: 'listing',
        progressAmount: context => 1 + getCommerceTierBonus(context),
        skills: ['promotion', { id: 'commerce', weight: 0.6 }],
        log: ({ label }) => `${label} revamped copy and photos. Conversion rates begin to pop.`
      },
      {
        id: 'experimentAds',
        label: 'Experiment With Ads',
        time: 2.2,
        cost: 34,
        progressKey: 'ads',
        progressAmount: context => 1 + getCommerceTierBonus(context),
        skills: ['promotion', { id: 'research', weight: 0.5 }],
        log: ({ label }) => `${label} tested lookalike audiences. Click-through rates jump!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} hit Quality ${level}! ${levelDef?.name || 'New milestone'} unlocks steadier orders.`
    }
  },
  messages: {
    setupStarted: label => `${label} is sourcing samples and setting up fulfillment.`,
    setupProgress: (label, completed, total) => `${label} has ${completed}/${total} supplier calls in the books.`,
    setupComplete: label => `${label} opened for business! Customers are already checking out.`,
    setupMissed: label => `${label} missed fulfillment prep today, so launch paused.`,
    income: (amount, label) => `${label} captured $${formatMoney(amount)} in net profit.`,
    maintenanceSkipped: label => `${label} skipped customer support and refunds ate the profits.`
  },
  detailKeys: [
    'owned',
    'setup',
    'setupCost',
    'maintenance',
    'requirements',
    'qualitySummary',
    'qualityProgress',
    'income',
    'latestYield'
  ],
  actionLabels: {
    first: 'Launch Dropshipping Shop',
    repeat: 'Add Another Shop'
  }
});

export default dropshippingDefinition;
