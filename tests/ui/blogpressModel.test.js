import test from 'node:test';
import assert from 'node:assert/strict';
import formatBlogpressModel, { summarizeBlogpressInstances } from '../../src/ui/blogpress/blogModel.js';
import blogDefinition from '../../src/game/assets/definitions/blog.js';

test('formatBlogpressModel returns enriched blog data', () => {
  const state = {
    day: 5,
    timeLeft: 12,
    money: 240,
    assets: {}
  };

  const assetState = {
    instances: [
      {
        id: 'blog-1',
        status: 'active',
        createdOnDay: 2,
        totalIncome: 180,
        lastIncome: 36,
        pendingIncome: 12,
        maintenanceFundedToday: true,
        quality: { level: 2, progress: { posts: 6, seo: 2 } },
        dailyUsage: { writePost: 0 },
        lastIncomeBreakdown: { entries: [{ id: 'base', label: 'Base', amount: 30 }] },
        nicheId: 'personalFinance'
      },
      {
        id: 'blog-2',
        status: 'setup',
        daysCompleted: 1,
        daysRemaining: 2,
        totalIncome: 0,
        pendingIncome: 0,
        maintenanceFundedToday: false,
        quality: { level: 0, progress: {} }
      }
    ]
  };
  state.assets.blog = assetState;

  const nicheOptions = [
    { id: 'personalFinance', name: 'Personal Finance', label: 'Trending', summary: 'Hot', multiplier: 1.2, score: 82 },
    { id: 'healthWellness', name: 'Health & Wellness', label: 'Steady', summary: 'Chill', multiplier: 1, score: 60 }
  ];

  const result = formatBlogpressModel(blogDefinition, state, {
    selectAssetState: () => assetState,
    mapNiches: () => nicheOptions
  });

  assert.equal(result.summary.total, 2, 'counts total blogs');
  assert.equal(result.summary.active, 1, 'counts active blogs');
  assert.equal(result.summary.needsUpkeep, 0, 'tracks funded upkeep');
  assert.deepEqual(result.nicheOptions, nicheOptions, 'reuses mapped niche options');
  assert.equal(result.instances.length, 2, 'builds instance snapshots');

  const first = result.instances[0];
  assert.ok(first.quickAction, 'selects quick action for active blogs');
  assert.equal(first.quickAction.id, 'writePost', 'prefers available actions');
  assert.equal(first.daysActive, 4, 'derives days active from state');
  assert.equal(result.actionMetadata.length, 2, 'builds action metadata list');
  const actionMeta = result.actionMetadata.find(entry => entry.id === 'blog-1');
  assert.ok(actionMeta, 'includes action metadata for each blog');
  assert.equal(actionMeta.quickAction?.id, 'writePost', 'mirrors quick action in metadata');
});

test('summarizeBlogpressInstances tracks upkeep needs', () => {
  const summary = summarizeBlogpressInstances([
    { id: 'blog-1', status: { id: 'active' }, maintenanceFunded: false },
    { id: 'blog-2', status: { id: 'active' }, maintenanceFunded: true }
  ]);
  assert.equal(summary.total, 2);
  assert.equal(summary.needsUpkeep, 1);
});
