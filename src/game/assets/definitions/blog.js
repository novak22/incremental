import { formatMoney } from '../../../core/helpers.js';
import { getUpgradeState } from '../../../core/state.js';
import { createAssetDefinition } from '../../content/schema.js';

function hasUpgrade(context, id) {
  if (!id) return false;
  if (context && typeof context.upgrade === 'function') {
    const upgrade = context.upgrade(id);
    if (upgrade) return Boolean(upgrade.purchased);
  }
  const state = getUpgradeState(id);
  return Boolean(state?.purchased);
}

const blogDefinition = createAssetDefinition({
  id: 'blog',
  name: 'Personal Blog Network',
  singular: 'Blog',
  tag: { label: 'Foundation', type: 'passive' },
  description: 'Launch cozy blogs that drip ad revenue once the posts are polished.',
  setup: { days: 3, hoursPerDay: 3, cost: 180 },
  maintenance: { hours: 0.75, cost: 3 },
  skills: {
    setup: [
      'writing',
      { id: 'promotion', weight: 0.5 }
    ]
  },
  income: {
    base: 30,
    variance: 0.2,
    logType: 'passive',
    modifier: (amount, context = {}) => {
      const steps = [];
      if (hasUpgrade(context, 'course')) {
        steps.push({ id: 'course', label: 'Automation course boost', percent: 0.5 });
      }
      if (hasUpgrade(context, 'editorialPipeline')) {
        steps.push({ id: 'editorialPipeline', label: 'Editorial pipeline boost', percent: 0.2 });
      }
      if (hasUpgrade(context, 'syndicationSuite')) {
        steps.push({ id: 'syndicationSuite', label: 'Syndication suite boost', percent: 0.25 });
      }
      return steps.reduce((total, step) => {
        const before = total;
        const after = total * (1 + step.percent);
        if (typeof context.recordModifier === 'function') {
          context.recordModifier(step.label, after - before, {
            id: step.id,
            type: 'upgrade',
            percent: step.percent
          });
        }
        return after;
      }, amount);
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
        income: { min: 3, max: 6 },
        requirements: {}
      },
      {
        level: 1,
        name: 'Content Sprout',
        description: 'Three polished posts that finally catch organic clicks.',
        income: { min: 9, max: 15 },
        requirements: { posts: 3 }
      },
      {
        level: 2,
        name: 'SEO Groove',
        description: 'Evergreen articles plus SEO sweeps pull in steady readers.',
        income: { min: 16, max: 24 },
        requirements: { posts: 9, seo: 2 }
      },
      {
        level: 3,
        name: 'Authority Hub',
        description: 'Backlinks and authority content turn ad clicks into a gush.',
        income: { min: 30, max: 42 },
        requirements: { posts: 18, seo: 5, outreach: 3 }
      },
      {
        level: 4,
        name: 'Syndication Dynamo',
        description: 'Guest post swaps and sponsor bundles send payouts soaring.',
        income: { min: 46, max: 62 },
        requirements: { posts: 28, seo: 9, outreach: 6 }
      },
      {
        level: 5,
        name: 'Constellation Network',
        description: 'An interlinked brand empire showers you in evergreen commissions.',
        income: { min: 64, max: 84 },
        requirements: { posts: 40, seo: 14, outreach: 10 }
      }
    ],
    actions: [
      {
        id: 'writePost',
        label: 'Write Post',
        time: 3,
        dailyLimit: 1,
        progressKey: 'posts',
        progressAmount: context => {
          let progress = 1;
          if (hasUpgrade(context, 'course')) progress += 1;
          if (hasUpgrade(context, 'editorialPipeline')) progress += 1;
          if (hasUpgrade(context, 'syndicationSuite')) progress += 1;
          return progress;
        },
        skills: ['writing'],
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
