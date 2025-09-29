import { formatMoney } from '../../../core/helpers.js';
import { getUpgradeState } from '../../../core/state.js';
import { createAssetDefinition } from '../../content/schema.js';

const saasDefinition = createAssetDefinition({
  id: 'saas',
  name: 'Micro SaaS Platform',
  singular: 'Micro SaaS',
  tag: { label: 'Tech', type: 'passive' },
  description: 'Design lean software services, onboard early users, and ship updates that keep churn low.',
  setup: { days: 8, hoursPerDay: 4, cost: 960 },
  maintenance: { hours: 2.2, cost: 24 },
  income: {
    base: 108,
    variance: 0.4,
    logType: 'passive',
    modifier: amount => {
      const edge = getUpgradeState('serverEdge').purchased ? 1.35 : 1;
      return Math.round(amount * edge);
    }
  },
  requirements: {
    knowledge: ['automationCourse'],
    equipment: ['serverCluster'],
    experience: [
      { assetId: 'dropshipping', count: 1 },
      { assetId: 'ebook', count: 1 }
    ]
  },
  quality: {
    summary: 'Build features, squash bugs, and scale infrastructure to transform prototypes into revenue engines.',
    tracks: {
      features: { label: 'Feature launches', shortLabel: 'features' },
      stability: { label: 'Reliability upgrades', shortLabel: 'stability fixes' },
      marketing: { label: 'Marketing pushes', shortLabel: 'marketing runs' }
    },
    levels: [
      {
        level: 0,
        name: 'Beta Sandbox',
        description: 'Tiny user base and messy bugs limit revenue.',
        income: { min: 6, max: 12 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Early Traction',
        description: 'Feature roadmap clicks with early adopters.',
        income: { min: 32, max: 48 },
        requirements: { features: 5 }
      },
      {
        level: 2,
        name: 'Reliable Service',
        description: 'Reliability boosts and updates reduce churn.',
        income: { min: 54, max: 74 },
        requirements: { features: 12, stability: 5 }
      },
      {
        level: 3,
        name: 'Scaling Flywheel',
        description: 'Marketing pushes and infrastructure unlock bigger accounts.',
        income: { min: 82, max: 110 },
        requirements: { features: 20, stability: 9, marketing: 7 }
      }
    ],
    actions: [
      {
        id: 'shipFeature',
        label: 'Ship Feature',
        time: 3.5,
        cost: 32,
        progressKey: 'features',
        progressAmount: context => (context.upgrade('serverEdge')?.purchased ? 2 : 1),
        log: ({ label }) => `${label} shipped a delightful feature. Beta users erupt in emoji reactions!`
      },
      {
        id: 'improveStability',
        label: 'Improve Stability',
        time: 2.5,
        cost: 36,
        progressKey: 'stability',
        progressAmount: context => (context.upgrade('serverEdge')?.purchased ? 2 : 1),
        log: ({ label }) => `${label} patched outages and bolstered uptime. Pager alerts stay quiet.`
      },
      {
        id: 'launchCampaign',
        label: 'Launch Campaign',
        time: 2.5,
        cost: 44,
        progressKey: 'marketing',
        progressAmount: context => (context.upgrade('serverEdge')?.purchased ? 2 : 1),
        log: ({ label }) => `${label} launched a marketing sprint. Sign-ups trickle in all night.`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} advanced to Quality ${level}! ${levelDef?.name || 'New tier'} secures happier subscribers.`
    }
  },
  messages: {
    setupStarted: label => `${label} kicked off architecture diagrams and feature planning.`,
    setupProgress: (label, completed, total) => `${label} is ${completed}/${total} sprints into the build.`,
    setupComplete: label => `${label} launched! Early customers are testing every button.`,
    setupMissed: label => `${label} skipped stand-up today, so backlog cards stayed put.`,
    income: (amount, label) => `${label} billed $${formatMoney(amount)} in monthly subscriptions.`,
    maintenanceSkipped: label => `${label} skipped maintenance, so churn crept upward.`
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
    first: 'Launch Micro SaaS',
    repeat: 'Spin Up Another SaaS'
  }
});

export default saasDefinition;
