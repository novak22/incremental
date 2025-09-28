import { formatMoney } from '../../../core/helpers.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
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

export default dropshippingDefinition;
