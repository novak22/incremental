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
  skills: {
    setup: [
      'software',
      { id: 'infrastructure', weight: 0.75 },
      { id: 'promotion', weight: 0.5 }
    ]
  },
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
    summary: 'Build features, squash bugs, and fan out edge nodes to transform prototypes into global revenue engines.',
    tracks: {
      features: { label: 'Feature launches', shortLabel: 'features' },
      stability: { label: 'Reliability upgrades', shortLabel: 'stability fixes' },
      marketing: { label: 'Marketing pushes', shortLabel: 'marketing runs' },
      edge: { label: 'Edge deployments', shortLabel: 'edge pushes' }
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
        income: { min: 84, max: 120 },
        requirements: { features: 24, stability: 8, marketing: 6 }
      },
      {
        level: 4,
        name: 'Global Edge Authority',
        description: 'Edge coverage, uptime bragging rights, and enterprise case studies pour gasoline on growth.',
        income: { min: 120, max: 168 },
        requirements: { features: 34, stability: 12, marketing: 10, edge: 4 }
      },
      {
        level: 5,
        name: 'Ecosystem Powerhouse',
        description: 'A thriving partner marketplace and integrations make churn basically mythical.',
        income: { min: 168, max: 220 },
        requirements: { features: 48, stability: 18, marketing: 15, edge: 8 }
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
        skills: ['software'],
        log: ({ label }) => `${label} shipped a delightful feature. Beta users erupt in emoji reactions!`
      },
      {
        id: 'improveStability',
        label: 'Improve Stability',
        time: 2.5,
        cost: 36,
        progressKey: 'stability',
        progressAmount: context => (context.upgrade('serverEdge')?.purchased ? 2 : 1),
        skills: ['infrastructure'],
        log: ({ label }) => `${label} patched outages and bolstered uptime. Pager alerts stay quiet.`
      },
      {
        id: 'launchCampaign',
        label: 'Launch Campaign',
        time: 2.5,
        cost: 44,
        progressKey: 'marketing',
        progressAmount: context => (context.upgrade('serverEdge')?.purchased ? 2 : 1),
        skills: ['promotion'],
        log: ({ label }) => `${label} launched a marketing sprint. Sign-ups trickle in all night.`
      },
      {
        id: 'deployEdgeNodes',
        label: 'Deploy Edge Nodes',
        time: 3,
        cost: 64,
        cooldownDays: 2,
        progressKey: 'edge',
        requiresUpgrade: 'serverEdge',
        unavailableMessage: () => 'Activate the Edge Delivery Network upgrade to unlock global deployments.',
        log: ({ label }) => `${label} pushed code to new edge regions. Enterprise clients cheer the instant load times!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) => {
        if (levelDef?.level >= 5) {
          return `${label} rocketed to Quality ${level}: ${levelDef?.name || 'ecosystem tier'}! Integrations rain down marquee clients.`;
        }
        if (levelDef?.level >= 4) {
          return `${label} achieved Quality ${level}: ${levelDef?.name || 'global tier'}! Worldwide subscribers rave about the instant response times.`;
        }
        return `${label} advanced to Quality ${level}! ${levelDef?.name || 'New tier'} secures happier subscribers.`;
      }
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
