import { formatMoney } from '../../../core/helpers.js';
import { getUpgradeState } from '../../../core/state.js';
import {
  buildAssetAction,
  incomeDetail,
  latestYieldDetail,
  maintenanceDetail,
  ownedDetail,
  setupCostDetail,
  setupDetail
} from '../helpers.js';

const blogDefinition = {
  id: 'blog',
  name: 'Personal Blog Network',
  singular: 'Blog',
  tag: { label: 'Foundation', type: 'passive' },
  description: 'Launch cozy blogs that drip ad revenue once the posts are polished.',
  setup: { days: 1, hoursPerDay: 3, cost: 25 },
  maintenance: { hours: 1, cost: 2 },
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

export default blogDefinition;
