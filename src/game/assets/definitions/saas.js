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

export default saasDefinition;
