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
  setup: { days: 5, hoursPerDay: 4, cost: 650 },
  maintenance: { hours: 1.5, cost: 9 },
  income: {
    base: 34,
    variance: 0.2,
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
        income: { min: 6, max: 10 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Curated Offerings',
        description: 'A handful of optimized listings convert curious scrollers.',
        income: { min: 18, max: 28 },
        requirements: { listings: 6 }
      },
      {
        level: 2,
        name: 'Ad Funnel Maestro',
        description: 'Paid campaigns and optimized pages fuel reliable revenue.',
        income: { min: 24, max: 34 },
        requirements: { listings: 12, ads: 4, optimization: 2 }
      },
      {
        level: 3,
        name: 'Fulfillment Powerhouse',
        description: 'Dialed-in logistics handle waves of loyal customers.',
        income: { min: 32, max: 40 },
        requirements: { listings: 20, ads: 8, optimization: 6 }
      }
    ],
    actions: [
      {
        id: 'addListing',
        label: 'Add Listing',
        time: 2.5,
        cost: 22,
        progressKey: 'listings',
        log: ({ label }) => `${label} launched a trending product listing with glossy mockups.`
      },
      {
        id: 'optimizePage',
        label: 'Optimize Page',
        time: 1.5,
        progressKey: 'optimization',
        log: ({ label }) => `${label} rewrote copy and tightened funnels. Conversion rate hums!`
      },
      {
        id: 'runAdBurst',
        label: 'Run Ad Burst',
        time: 2,
        cost: 45,
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
