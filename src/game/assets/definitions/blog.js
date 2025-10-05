import { formatMoney } from '../../../core/helpers.js';
import { triggerQualityActionEvents } from '../../events/index.js';
import { createAssetDefinition } from '../../content/schema.js';
import { assets as assetConfigs } from '../../data/economyConfig.js';

const blogConfig = assetConfigs.blog; // Spec: docs/normalized_economy.json → assets.blog
const blogSetup = blogConfig.setup; // Spec: docs/normalized_economy.json → assets.blog.schedule
const blogMaintenance = blogConfig.maintenance; // Spec: docs/normalized_economy.json → assets.blog.maintenance_time
const blogIncome = blogConfig.income; // Spec: docs/normalized_economy.json → assets.blog.base_income
const [
  blogQualityLevel0,
  blogQualityLevel1,
  blogQualityLevel2,
  blogQualityLevel3,
  blogQualityLevel4,
  blogQualityLevel5
] = blogConfig.qualityLevels; // Spec: docs/normalized_economy.json → assets.blog.quality_curve

const blogDefinition = createAssetDefinition({
  id: 'blog',
  name: 'Personal Blog Network',
  singular: 'Blog',
  tag: { label: 'Foundation', type: 'passive' },
  tags: ['writing', 'content', 'desktop_work'],
  description: 'Launch cozy blogs that drip ad revenue once the posts are polished.',
  setup: { ...blogSetup },
  maintenance: { ...blogMaintenance },
  skills: {
    setup: [
      'writing',
      { id: 'promotion', weight: 0.5 }
    ]
  },
  income: { ...blogIncome, logType: 'passive' },
  quality: {
    summary: 'Draft posts, tune SEO, and rally backlinks to climb from skeleton sites to a thriving blog constellation.',
    tracks: {
      posts: { label: 'Long-form posts', shortLabel: 'posts' },
      seo: { label: 'SEO boosts', shortLabel: 'SEO boosts' },
      outreach: { label: 'Backlink outreach', shortLabel: 'backlink runs' }
    },
    levels: [
      {
        level: blogQualityLevel0.level,
        name: 'Skeleton Drafts',
        description: 'Bare pages with placeholder copy and sleepy earnings.',
        income: { ...blogQualityLevel0.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[0]
        requirements: { ...blogQualityLevel0.requirements }
      },
      {
        level: blogQualityLevel1.level,
        name: 'Content Sprout',
        description: 'Three polished posts that finally catch organic clicks.',
        income: { ...blogQualityLevel1.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[1]
        requirements: { ...blogQualityLevel1.requirements }
      },
      {
        level: blogQualityLevel2.level,
        name: 'SEO Groove',
        description: 'Evergreen articles plus SEO sweeps pull in steady readers.',
        income: { ...blogQualityLevel2.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[2]
        requirements: { ...blogQualityLevel2.requirements }
      },
      {
        level: blogQualityLevel3.level,
        name: 'Authority Hub',
        description: 'Backlinks and authority content turn ad clicks into a gush.',
        income: { ...blogQualityLevel3.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[3]
        requirements: { ...blogQualityLevel3.requirements }
      },
      {
        level: blogQualityLevel4.level,
        name: 'Syndication Dynamo',
        description: 'Guest post swaps and sponsor bundles send payouts soaring.',
        income: { ...blogQualityLevel4.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[4]
        requirements: { ...blogQualityLevel4.requirements }
      },
      {
        level: blogQualityLevel5.level,
        name: 'Constellation Network',
        description: 'An interlinked brand empire showers you in evergreen commissions.',
        income: { ...blogQualityLevel5.income }, // Spec: docs/normalized_economy.json → assets.blog.quality_curve[5]
        requirements: { ...blogQualityLevel5.requirements }
      }
    ],
    actions: [
      {
        id: 'writePost',
        label: 'Write Post',
        time: 3,
        dailyLimit: 1,
        progressKey: 'posts',
        progressAmount: () => 1,
        skills: ['writing'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} published a sparkling post. Subscribers sip the fresh ideas!`
      },
      {
        id: 'seoSprint',
        label: 'SEO Sprint',
        time: 2,
        cost: 16,
        dailyLimit: 1,
        progressKey: 'seo',
        skills: ['promotion'],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} ran an SEO tune-up. Keywords now shimmy to the top.`
      },
      {
        id: 'outreachPush',
        label: 'Backlink Outreach',
        time: 1.5,
        cost: 16,
        dailyLimit: 1,
        progressKey: 'outreach',
        skills: ['audience', { id: 'promotion', weight: 0.5 }],
        onComplete({ definition, instance, action }) {
          triggerQualityActionEvents({ definition, instance, action: action || this });
        },
        log: ({ label }) => `${label} charmed partners into fresh backlinks. Authority climbs!`
      }
    ],
    messages: {
      levelUp: ({ label, level, levelDef }) =>
        `${label} reached Quality ${level} — ${levelDef?.name || 'new tier'}! Ad pennies upgrade to chunky stacks.`
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
  detailKeys: [
    'owned',
    'setup',
    'setupCost',
    'maintenance',
    'qualitySummary',
    'qualityProgress',
    'income',
    'latestYield'
  ],
  actionLabels: {
    first: 'Launch Blog',
    repeat: 'Spin Up Another Blog'
  }
});

export default blogDefinition;
