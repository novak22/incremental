import { upgrades as upgradeConfigs } from '../../../data/economyConfig.js';

const editorialPipelineConfig = upgradeConfigs.editorialPipeline; // Spec: docs/normalized_economy.json → upgrades.editorialPipeline
const syndicationSuiteConfig = upgradeConfigs.syndicationSuite; // Spec: docs/normalized_economy.json → upgrades.syndicationSuite
const immersiveStoryWorldsConfig = upgradeConfigs.immersiveStoryWorlds; // Spec: docs/normalized_economy.json → upgrades.immersiveStoryWorlds
const courseConfig = upgradeConfigs.course; // Spec: docs/normalized_economy.json → upgrades.course

const workflow = [
  {
    id: 'editorialPipeline',
    name: 'Editorial Pipeline Suite',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Stand up pro-grade editorial calendars so every blog post ships polished and on schedule.',
    category: 'tech',
    family: 'workflow',
    placements: ['general', 'blogpress'],
    cost: editorialPipelineConfig.cost, // Spec: docs/normalized_economy.json → upgrades.editorialPipeline.setup_cost
    requires: [
      'course',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'outlineMastery' ],
        detail: 'Requires: <strong>Outline Mastery Workshop completed</strong>'
      }
    ],
    boosts: 'Stacks new blog and e-book bonuses across every publishing push',
    effects: {
      setup_time_mult: 0.88,
      payout_mult: 1.2,
      quality_progress_mult: 1.5
    },
    affects: {
      assets: { tags: [ 'writing', 'content' ] },
      hustles: { tags: [ 'writing' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    skills: [ 'writing', { id: 'promotion', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Build Editorial Suite',
    labels: {
      purchased: 'Editorial Suite Ready',
      missing: 'Requires Publishing Momentum'
    },
    metrics: {
      cost: { label: '🧠 Editorial pipeline build-out', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      }
    ],
    logMessage: 'Editorial pipeline humming! Your posts now glide from outline to publish without bottlenecks.',
    logType: 'upgrade'
  },
  {
    id: 'syndicationSuite',
    name: 'Syndication Suite',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Spin up partner feeds, guest slots, and cross-promotions to syndicate your best work everywhere.',
    category: 'tech',
    family: 'workflow',
    placements: ['general', 'blogpress', 'digishelf', 'videotube'],
    cost: syndicationSuiteConfig.cost, // Spec: docs/normalized_economy.json → upgrades.syndicationSuite.setup_cost
    requires: [
      'editorialPipeline',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      { type: 'asset', id: 'ebook', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'brandVoiceLab' ],
        detail: 'Requires: <strong>Brand Voice Lab completed</strong>'
      }
    ],
    boosts: 'Energises blogs, e-books, and vlogs with syndicated promos and bigger payouts',
    effects: {
      maint_time_mult: 0.9,
      payout_mult: 1.25,
      quality_progress_mult: 1.3333333333333333
    },
    affects: {
      assets: { tags: [ 'writing', 'content', 'video' ] },
      hustles: { tags: [ 'writing', 'marketing' ] },
      actions: { types: [ 'maintenance', 'payout', 'quality' ] }
    },
    skills: [ 'audience', { id: 'promotion', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Launch Syndication Suite',
    labels: {
      purchased: 'Syndication Live',
      missing: 'Requires Cross-Media Presence'
    },
    metrics: {
      cost: { label: '🌐 Syndication suite rollout', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'brandVoiceLab',
        label: '🎙️ Brand Voice Lab progress'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'ebook',
        label: '📚 Active e-books in market'
      }
    ],
    logMessage: 'Syndication suite secured! Partner feeds now echo your stories across the web.',
    logType: 'upgrade'
  },
  {
    id: 'immersiveStoryWorlds',
    name: 'Immersive Story Worlds',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Blend blogs, books, and vlogs into one living universe with AR teasers and fan quests.',
    category: 'tech',
    family: 'workflow',
    placements: ['general', 'blogpress', 'digishelf', 'videotube'],
    cost: immersiveStoryWorldsConfig.cost, // Spec: docs/normalized_economy.json → upgrades.immersiveStoryWorlds.setup_cost
    requires: [
      'syndicationSuite',
      { type: 'asset', id: 'blog', active: true, count: 1 },
      { type: 'asset', id: 'ebook', active: true, count: 1 },
      { type: 'asset', id: 'vlog', active: true, count: 1 },
      {
        type: 'custom',
        mode: 'knowledge',
        keys: [ 'outlineMastery', 'brandVoiceLab' ],
        detail: 'Requires: <strong>Outline Mastery & Brand Voice Lab completed</strong>'
      }
    ],
    boosts: 'Adds premium payouts and faster progress for every creative asset',
    effects: {
      payout_mult: 1.12,
      setup_time_mult: 0.85,
      quality_progress_mult: 2
    },
    affects: {
      assets: { tags: [ 'writing', 'video', 'photo' ] },
      actions: { types: [ 'setup', 'payout', 'quality' ] }
    },
    skills: [ 'visual', { id: 'writing', weight: 0.5 } ],
    actionClassName: 'secondary',
    actionLabel: 'Launch Story Worlds',
    labels: {
      purchased: 'Story Worlds Live',
      missing: 'Requires Immersive Audience'
    },
    metrics: {
      cost: { label: '🌌 Story world immersion build', category: 'upgrade' }
    },
    details: [
      {
        behavior: 'activeAssetCount',
        assetId: 'blog',
        label: '🧾 Active blogs ready'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'ebook',
        label: '📚 Active e-books in market'
      },
      {
        behavior: 'activeAssetCount',
        assetId: 'vlog',
        label: '🎬 Active vlogs broadcasting'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'outlineMastery',
        label: '📚 Outline Mastery progress'
      },
      {
        behavior: 'knowledgeProgress',
        knowledgeId: 'brandVoiceLab',
        label: '🎙️ Brand Voice Lab progress'
      }
    ],
    logMessage: 'Immersive story worlds unlocked! Fans now explore your universe across every channel.',
    logType: 'upgrade'
  },
  {
    id: 'course',
    name: 'Automation Course',
    tag: { label: 'Boost', type: 'boost' },
    description: 'Unlocks smarter blogging tools, boosting blog income by +50%.',
    category: 'tech',
    family: 'workflow',
    placements: ['general', 'blogpress'],
    cost: courseConfig.cost, // Spec: docs/normalized_economy.json → upgrades.course.setup_cost
    requires: [
      {
        type: 'asset',
        id: 'blog',
        active: true,
        count: 1,
        detail: 'Requires: <strong>At least one active blog</strong>'
      }
    ],
    effects: { payout_mult: 1.5, quality_progress_mult: 2 },
    affects: {
      assets: { ids: [ 'blog' ] },
      actions: { types: [ 'payout', 'quality' ] }
    },
    skills: [ 'software' ],
    actionClassName: 'secondary',
    actionLabel: 'Study Up',
    labels: { purchased: 'Automation Ready', missing: 'Requires Active Blog' },
    metrics: {
      cost: { label: '📚 Automation course tuition', category: 'upgrade' }
    },
    logMessage: 'Automation course complete! Your blog network now earns +50% more each day.',
    logType: 'upgrade'
  }
];

export default workflow;
