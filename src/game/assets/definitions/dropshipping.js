import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  qualityProgressDetail,
  qualitySummaryDetail,
  setupCostDetail,
  setupDetail
} from '../helpers.js';
import { renderAssetRequirementDetail, updateAssetCardLock } from '../../requirements.js';

const dropshippingDefinition = {
  id: 'dropshipping',
  name: 'Dropshipping Storefront',
  singular: 'Storefront',
  tag: { label: 'Commerce', type: 'passive' },
  description: 'Spin up a storefront, source trending products, and let fulfillment partners handle the rest.',
  setup: { days: 3, hoursPerDay: 4, cost: 500 },
  maintenance: { hours: 2, cost: 0 },
  income: {
    base: 210,
    variance: 0.4,
    logType: 'passive'
  },
  requirements: [
    { type: 'knowledge', id: 'ecomPlaybook' },
    { type: 'experience', assetId: 'blog', count: 2 }
  ],
  quality: {
    summary: 'Add listings, tune pages, and fund ad bursts to transform a fragile storefront into a conversion machine.',
    tracks: {
      listings: { label: 'Product listings', shortLabel: 'listings' },
      optimization: { label: 'Page optimizations', shortLabel: 'optimizations' },
      ads: { label: 'Ad bursts', shortLabel: 'ads' }
    },
    levels: [
      {
        level: 0,
        name: 'Bare Shelves',
        description: 'A tiny catalog with wobbly funnels ekes out pocket change.',
        income: { min: 8, max: 15 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Curated Offerings',
        description: 'A handful of optimized listings convert curious scrollers.',
        income: { min: 40, max: 70 },
        requirements: { listings: 4 }
      },
      {
        level: 2,
        name: 'Ad Funnel Maestro',
        description: 'Paid campaigns and optimized pages fuel reliable revenue.',
        income: { min: 90, max: 150 },
        requirements: { listings: 8, ads: 3 }
      },
      {
        level: 3,
        name: 'Fulfillment Powerhouse',
        description: 'Dialed-in logistics handle waves of loyal customers.',
        income: { min: 170, max: 260 },
        requirements: { listings: 12, ads: 6, optimization: 4 }
      }
    ],
    actions: [
      {
        id: 'addListing',
        label: 'Add Listing',
        time: 2,
        cost: 15,
        progressKey: 'listings',
        log: ({ label }) => `${label} launched a trending product listing with glossy mockups.`
      },
      {
        id: 'optimizePage',
        label: 'Optimize Page',
        time: 1,
        progressKey: 'optimization',
        log: ({ label }) => `${label} rewrote copy and tightened funnels. Conversion rate hums!`
      },
      {
        id: 'runAdBurst',
        label: 'Run Ad Burst',
        time: 1.5,
        cost: 30,
        progressKey: 'ads',
        log: ({ label }) => `${label} funded a laser-targeted ad burst. Traffic surges in.`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} leveled to Quality ${level}! ${levelDef?.name || 'New playbook'} keeps carts overflowing.`
    }
  },
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

dropshippingDefinition.details = [
  () => ownedDetail(dropshippingDefinition),
  () => setupDetail(dropshippingDefinition),
  () => setupCostDetail(dropshippingDefinition),
  () => maintenanceDetail(dropshippingDefinition),
  () => renderAssetRequirementDetail('dropshipping'),
  () => qualitySummaryDetail(dropshippingDefinition),
  () => qualityProgressDetail(dropshippingDefinition),
  () => incomeDetail(dropshippingDefinition),
  () => latestYieldDetail(dropshippingDefinition)
];

dropshippingDefinition.action = buildAssetAction(dropshippingDefinition, {
  first: 'Open Dropshipping Store',
  repeat: 'Launch Another Storefront'
});

dropshippingDefinition.cardState = (_state, card) => updateAssetCardLock('dropshipping', card);

export default dropshippingDefinition;
