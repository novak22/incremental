import { formatMoney } from '../../../core/helpers.js';
import { getUpgradeState } from '../../../core/state.js';
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

const blogDefinition = {
  id: 'blog',
  name: 'Personal Blog Network',
  singular: 'Blog',
  tag: { label: 'Foundation', type: 'passive' },
  description: 'Launch cozy blogs that drip ad revenue once the posts are polished.',
  setup: { days: 1, hoursPerDay: 3, cost: 25 },
  maintenance: { hours: 1, cost: 2 },
  income: {
    base: 95,
    variance: 0.25,
    logType: 'passive',
    modifier: amount => {
      const automation = getUpgradeState('course').purchased ? 1.5 : 1;
      return amount * automation;
    }
  },
  quality: {
    summary: 'Draft posts, tune SEO, and rally backlinks to climb from skeleton sites to a thriving blog constellation.',
    tracks: {
      posts: { label: 'Long-form posts', shortLabel: 'posts' },
      seo: { label: 'SEO boosts', shortLabel: 'SEO boosts' },
      outreach: { label: 'Backlink outreach', shortLabel: 'backlink runs' }
    },
    levels: [
      {
        level: 0,
        name: 'Skeleton Drafts',
        description: 'Bare pages with placeholder copy and sleepy earnings.',
        income: { min: 1, max: 3 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Content Sprout',
        description: 'Three polished posts that finally catch organic clicks.',
        income: { min: 10, max: 20 },
        requirements: { posts: 3 }
      },
      {
        level: 2,
        name: 'SEO Groove',
        description: 'Evergreen articles plus SEO sweeps pull in steady readers.',
        income: { min: 30, max: 60 },
        requirements: { posts: 9, seo: 2 }
      },
      {
        level: 3,
        name: 'Authority Hub',
        description: 'Backlinks and authority content turn ad clicks into a gush.',
        income: { min: 70, max: 120 },
        requirements: { posts: 19, seo: 4, outreach: 3 }
      }
    ],
    actions: [
      {
        id: 'writePost',
        label: 'Write Post',
        time: 3,
        progressKey: 'posts',
        progressAmount: context => (context.upgrade('course')?.purchased ? 2 : 1),
        log: ({ label }) => `${label} published a sparkling post. Subscribers sip the fresh ideas!`
      },
      {
        id: 'seoSprint',
        label: 'SEO Sprint',
        time: 2,
        cost: 15,
        progressKey: 'seo',
        log: ({ label }) => `${label} ran an SEO tune-up. Keywords now shimmy to the top.`
      },
      {
        id: 'outreachPush',
        label: 'Backlink Outreach',
        time: 1.5,
        cost: 12,
        progressKey: 'outreach',
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
  defaultState: { instances: [] }
};

blogDefinition.details = [
  () => ownedDetail(blogDefinition),
  () => setupDetail(blogDefinition),
  () => setupCostDetail(blogDefinition),
  () => maintenanceDetail(blogDefinition),
  () => qualitySummaryDetail(blogDefinition),
  () => qualityProgressDetail(blogDefinition),
  () => incomeDetail(blogDefinition),
  () => latestYieldDetail(blogDefinition)
];

blogDefinition.action = buildAssetAction(blogDefinition, {
  first: 'Launch Blog',
  repeat: 'Spin Up Another Blog'
});

export default blogDefinition;
