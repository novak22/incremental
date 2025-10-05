import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const dropshippingConfig = assetConfigs.dropshipping; // Spec: docs/normalized_economy.json → assets.dropshipping
const dropshippingSetup = dropshippingConfig.setup; // Spec: docs/normalized_economy.json → assets.dropshipping.schedule
const dropshippingMaintenance = dropshippingConfig.maintenance; // Spec: docs/normalized_economy.json → assets.dropshipping.maintenance_time
const dropshippingIncome = dropshippingConfig.income; // Spec: docs/normalized_economy.json → assets.dropshipping.base_income
const [
  dropshippingQualityLevel0,
  dropshippingQualityLevel1,
  dropshippingQualityLevel2,
  dropshippingQualityLevel3,
  dropshippingQualityLevel4,
  dropshippingQualityLevel5
] = dropshippingConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve

const dropshippingDefinition = createAssetDefinition({
  id: 'dropshipping',
  name: 'Dropshipping Product Lab',
  singular: 'Dropshipping Shop',
  tag: { label: 'Commerce', type: 'passive' },
  tags: ['commerce', 'ecommerce', 'fulfillment'],
  description: 'Prototype products, source suppliers, and automate fulfillment funnels.',
  setup: { ...dropshippingSetup },
  maintenance: { ...dropshippingMaintenance },
  skills: {
    setup: [
      'commerce',
      'research',
      { id: 'promotion', weight: 0.5 }
    ]
  },
  income: { ...dropshippingIncome, logType: 'passive' },
  requirements: { ...dropshippingConfig.requirements },
  quality: {
    summary: 'Research products, optimize listings, and scale advertising to grow a dependable e-commerce machine.',
    tracks: {
      research: { label: 'Product research sprints', shortLabel: 'research runs' },
      listing: { label: 'Listing optimizations', shortLabel: 'listing tweaks' },
      ads: { label: 'Ad experiments', shortLabel: 'ad tests' }
    },
    levels: [
      {
        level: dropshippingQualityLevel0.level,
        name: 'Prototype Pile',
        description: 'Inconsistent suppliers mean sporadic payouts.',
        income: { ...dropshippingQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[0]
        requirements: { ...dropshippingQualityLevel0.requirements }
      },
      {
        level: dropshippingQualityLevel1.level,
        name: 'Optimized Listings',
        description: 'Top products have polished listings and reviews.',
        income: { ...dropshippingQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[1]
        requirements: { ...dropshippingQualityLevel1.requirements }
      },
      {
        level: dropshippingQualityLevel2.level,
        name: 'Automation Groove',
        description: 'Fulfillment and ad funnels make sales steady.',
        income: { ...dropshippingQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[2]
        requirements: { ...dropshippingQualityLevel2.requirements }
      },
      {
        level: dropshippingQualityLevel3.level,
        name: 'Scaled Flywheel',
        description: 'Paid campaigns bring consistent high-ticket orders.',
        income: { ...dropshippingQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[3]
        requirements: { ...dropshippingQualityLevel3.requirements }
      },
      {
        level: dropshippingQualityLevel4.level,
        name: 'Omnichannel Engine',
        description: 'Automation spans every marketplace and upsell funnel you run.',
        income: { ...dropshippingQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[4]
        requirements: { ...dropshippingQualityLevel4.requirements }
      },
      {
        level: dropshippingQualityLevel5.level,
        name: 'Global Logistics Titan',
        description: 'Worldwide warehouses and brand loyalty make daily profits thunder.',
        income: { ...dropshippingQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.dropshipping.quality_curve[5]
        requirements: { ...dropshippingQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'researchProduct',
        label: 'Research Product',
        time: 3,
        dailyLimit: 1,
        progressKey: 'research',
        progressAmount: () => 1,
        skills: ['research'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} spotted a trending micro-niche. Suppliers start calling back!`
      },
      {
        id: 'optimizeListing',
        label: 'Optimize Listing',
        time: 1.8,
        cost: 28,
        dailyLimit: 1,
        progressKey: 'listing',
        progressAmount: () => 1,
        skills: ['promotion', { id: 'commerce', weight: 0.6 }],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} revamped copy and photos. Conversion rates begin to pop.`
      },
      {
        id: 'experimentAds',
        label: 'Experiment With Ads',
        time: 2.2,
        cost: 34,
        dailyLimit: 1,
        progressKey: 'ads',
        progressAmount: () => 1,
        skills: ['promotion', { id: 'research', weight: 0.5 }],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
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
