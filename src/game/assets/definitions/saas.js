import { formatMoney } from '../../../core/helpers.js';
import { createAssetDefinition } from '../../content/schema.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const saasConfig = assetConfigs.saas; // Spec: docs/normalized_economy.json → assets.saas
const saasSetup = saasConfig.setup; // Spec: docs/normalized_economy.json → assets.saas.schedule
const saasMaintenance = saasConfig.maintenance; // Spec: docs/normalized_economy.json → assets.saas.maintenance_time
const saasIncome = saasConfig.income; // Spec: docs/normalized_economy.json → assets.saas.base_income
const [
  saasQualityLevel0,
  saasQualityLevel1,
  saasQualityLevel2,
  saasQualityLevel3,
  saasQualityLevel4,
  saasQualityLevel5
] = saasConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.saas.quality_curve

const saasDefinition = createAssetDefinition({
  id: 'saas',
  name: 'Micro SaaS Platform',
  singular: 'Micro SaaS',
  tag: { label: 'Tech', type: 'passive' },
  tags: ['software', 'tech', 'product'],
  description: 'Design lean software services, onboard early users, and ship updates that keep churn low.',
  setup: { ...saasSetup },
  maintenance: { ...saasMaintenance },
  skills: {
    setup: [
      'software',
      { id: 'infrastructure', weight: 0.75 },
      { id: 'promotion', weight: 0.5 }
    ]
  },
  income: { ...saasIncome, logType: 'passive' },
  requirements: { ...saasConfig.requirements },
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
        level: saasQualityLevel0.level,
        name: 'Beta Sandbox',
        description: 'Tiny user base and messy bugs limit revenue.',
        income: { ...saasQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[0]
        requirements: { ...saasQualityLevel0.requirements }
      },
      {
        level: saasQualityLevel1.level,
        name: 'Early Traction',
        description: 'Feature roadmap clicks with early adopters.',
        income: { ...saasQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[1]
        requirements: { ...saasQualityLevel1.requirements }
      },
      {
        level: saasQualityLevel2.level,
        name: 'Reliable Service',
        description: 'Reliability boosts and updates reduce churn.',
        income: { ...saasQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[2]
        requirements: { ...saasQualityLevel2.requirements }
      },
      {
        level: saasQualityLevel3.level,
        name: 'Scaling Flywheel',
        description: 'Marketing pushes and infrastructure unlock bigger accounts.',
        income: { ...saasQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[3]
        requirements: { ...saasQualityLevel3.requirements }
      },
      {
        level: saasQualityLevel4.level,
        name: 'Global Edge Authority',
        description: 'Edge coverage, uptime bragging rights, and enterprise case studies pour gasoline on growth.',
        income: { ...saasQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[4]
        requirements: { ...saasQualityLevel4.requirements }
      },
      {
        level: saasQualityLevel5.level,
        name: 'Ecosystem Powerhouse',
        description: 'A thriving partner marketplace and integrations make churn basically mythical.',
        income: { ...saasQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.saas.quality_curve[5]
        requirements: { ...saasQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'shipFeature',
        label: 'Ship Feature',
        time: 3.2,
        cost: 28,
        dailyLimit: 1,
        progressKey: 'features',
        progressAmount: () => 1,
        skills: ['software'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} shipped a delightful feature. Beta users erupt in emoji reactions!`
      },
      {
        id: 'improveStability',
        label: 'Improve Stability',
        time: 2.5,
        cost: 36,
        dailyLimit: 1,
        progressKey: 'stability',
        progressAmount: () => 1,
        skills: ['infrastructure'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} patched outages and bolstered uptime. Pager alerts stay quiet.`
      },
      {
        id: 'launchCampaign',
        label: 'Launch Campaign',
        time: 2.5,
        cost: 44,
        dailyLimit: 1,
        progressKey: 'marketing',
        progressAmount: () => 1,
        skills: ['promotion'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} launched a marketing sprint. Sign-ups trickle in all night.`
      },
      {
        id: 'deployEdgeNodes',
        label: 'Deploy Edge Nodes',
        time: 3,
        cost: 64,
        dailyLimit: 1,
        progressKey: 'edge',
        requiresUpgrade: 'serverEdge',
        unavailableMessage: () => 'Activate the Edge Delivery Network upgrade to unlock global deployments.',
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
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
