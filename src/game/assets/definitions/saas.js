import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';

const saasDefinition = createAssetDefinition({
  id: 'saas',
  name: 'Micro SaaS Platform',
  singular: 'Micro SaaS',
  tag: { label: 'Tech', type: 'passive' },
  description: 'Design lean software services, onboard early users, and ship updates that keep churn low.',
  setup: { days: 8, hoursPerDay: 4, cost: 960 },
  maintenance: { hours: 2.5, cost: 28 },
  income: {
    base: 68,
    variance: 0.35,
    logType: 'passive'
  },
  requirements: [
    { type: 'equipment', id: 'serverCluster' },
    { type: 'knowledge', id: 'automationCourse' }
  ],
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
        income: { min: 4, max: 8 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Early Traction',
        description: 'Feature roadmap clicks with early adopters.',
        income: { min: 22, max: 34 },
        requirements: { features: 6 }
      },
      {
        level: 2,
        name: 'Reliable Service',
        description: 'Reliability boosts and updates reduce churn.',
        income: { min: 36, max: 50 },
        requirements: { features: 14, stability: 4 }
      },
      {
        level: 3,
        name: 'Scaling Flywheel',
        description: 'Marketing pushes and infrastructure unlock bigger accounts.',
        income: { min: 54, max: 74 },
        requirements: { features: 24, stability: 8, marketing: 6 }
      }
    ],
    actions: [
      {
        id: 'shipFeature',
        label: 'Ship Feature',
        time: 4,
        cost: 34,
        progressKey: 'features',
        log: ({ label }) => `${label} shipped a delightful feature. Beta users erupt in emoji reactions!`
      },
      {
        id: 'improveStability',
        label: 'Improve Stability',
        time: 3,
        cost: 40,
        progressKey: 'stability',
        log: ({ label }) => `${label} patched outages and bolstered uptime. Pager alerts stay quiet.`
      },
      {
        id: 'launchCampaign',
        label: 'Launch Campaign',
        time: 2.5,
        cost: 48,
        progressKey: 'marketing',
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
