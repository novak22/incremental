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

const saasDefinition = {
  id: 'saas',
  name: 'SaaS Micro-App',
  singular: 'App',
  tag: { label: 'Advanced', type: 'passive' },
  description: 'Ship a tidy micro-SaaS that collects subscriptions from superfans of your niche tools.',
  setup: { days: 7, hoursPerDay: 5, cost: 1600 },
  maintenance: { hours: 2.5, cost: 12 },
  income: {
    base: 36,
    variance: 0.2,
    logType: 'passive'
  },
  requirements: [
    { type: 'knowledge', id: 'automationCourse' },
    { type: 'experience', assetId: 'dropshipping', count: 1 },
    { type: 'experience', assetId: 'ebook', count: 1 }
  ],
  quality: {
    summary: 'Squash bugs, ship features, and host support sprints so your app graduates into a churn-proof subscription machine.',
    tracks: {
      fixes: { label: 'Bug fixes', shortLabel: 'bug fixes' },
      features: { label: 'Feature releases', shortLabel: 'features' },
      support: { label: 'Support sessions', shortLabel: 'support calls' }
    },
    levels: [
      {
        level: 0,
        name: 'Beta Build',
        description: 'Early adopters tolerate quirks for pocket change revenue.',
        income: { min: 8, max: 14 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Reliable Release',
        description: 'Critical bug fixes calm churn and boost sign-ups.',
        income: { min: 16, max: 24 },
        requirements: { fixes: 4 }
      },
      {
        level: 2,
        name: 'Feature Favorite',
        description: 'Steady features keep subscriptions renewing.',
        income: { min: 24, max: 32 },
        requirements: { fixes: 10, features: 4 }
      },
      {
        level: 3,
        name: 'Support Legend',
        description: 'Dedicated support squads crush churn and win raves.',
        income: { min: 34, max: 42 },
        requirements: { fixes: 16, features: 8, support: 8 }
      }
    ],
    actions: [
      {
        id: 'squashBugs',
        label: 'Squash Bugs',
        time: 2.5,
        progressKey: 'fixes',
        log: ({ label }) => `${label} closed a cluster of bugs. Error logs finally exhale.`
      },
      {
        id: 'shipFeature',
        label: 'Ship Feature',
        time: 4,
        cost: 60,
        progressKey: 'features',
        log: ({ label }) => `${label} rolled out a shiny feature. Users spam the applause emoji.`
      },
      {
        id: 'supportSprint',
        label: 'Support Sprint',
        time: 2,
        cost: 20,
        progressKey: 'support',
        log: ({ label }) => `${label} hosted a support sprint. Churn gremlins retreat.`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} advanced to Quality ${level}! ${levelDef?.name || 'New stature'} locks in recurring revenue.`
    }
  },
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
  () => qualitySummaryDetail(saasDefinition),
  () => qualityProgressDetail(saasDefinition),
  () => incomeDetail(saasDefinition),
  () => latestYieldDetail(saasDefinition)
];

saasDefinition.action = buildAssetAction(saasDefinition, {
  first: 'Prototype Micro-App',
  repeat: 'Spin Up Another App'
});

saasDefinition.cardState = (_state, card) => updateAssetCardLock('saas', card);

export default saasDefinition;
