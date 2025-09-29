import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  assetsModule,
  upgradesModule,
  requirementsModule
} = harness;

const {
  getState,
  getAssetState,
  getUpgradeState,
  createAssetInstance
} = stateModule;
const { ASSETS } = assetsModule;
const { UPGRADES } = upgradesModule;
const { getKnowledgeProgress } = requirementsModule;

const blogDefinition = ASSETS.find(asset => asset.id === 'blog');
const ebookDefinition = ASSETS.find(asset => asset.id === 'ebook');
const vlogDefinition = ASSETS.find(asset => asset.id === 'vlog');

const editorialPipeline = UPGRADES.find(upgrade => upgrade.id === 'editorialPipeline');
const syndicationSuite = UPGRADES.find(upgrade => upgrade.id === 'syndicationSuite');
const immersiveStoryWorlds = UPGRADES.find(upgrade => upgrade.id === 'immersiveStoryWorlds');

const resetState = () => harness.resetState();

function upgradeContext() {
  return {
    upgrade: id => getUpgradeState(id),
    recordModifier: () => {}
  };
}

test.beforeEach(() => {
  resetState();
});

test('creative upgrades enforce cascading requirements', () => {
  const state = getState();
  state.money = 10000;

  const editorialAction = editorialPipeline.action;
  assert.equal(editorialAction.disabled(), true, 'Editorial suite locked without prep');

  getUpgradeState('course').purchased = true;
  assert.equal(editorialAction.disabled(), true, 'Needs active blog and Outline Mastery');

  const blogState = getAssetState('blog');
  blogState.instances = [createAssetInstance(blogDefinition, { status: 'active' })];
  assert.equal(editorialAction.disabled(), true, 'Still needs Outline Mastery completion');

  const outline = getKnowledgeProgress('outlineMastery');
  outline.completed = true;
  outline.daysCompleted = outline.totalDays;
  assert.equal(editorialAction.disabled(), false, 'Editorial suite unlocks after Outline Mastery');

  const syndicationAction = syndicationSuite.action;
  assert.equal(syndicationAction.disabled(), true, 'Syndication locked without editorial suite purchased');
  getUpgradeState('editorialPipeline').purchased = true;
  assert.equal(syndicationAction.disabled(), true, 'Needs e-book momentum and Brand Voice Lab');

  const ebookState = getAssetState('ebook');
  ebookState.instances = [createAssetInstance(ebookDefinition, { status: 'active' })];
  const brandVoice = getKnowledgeProgress('brandVoiceLab');
  brandVoice.completed = true;
  brandVoice.daysCompleted = brandVoice.totalDays;
  assert.equal(syndicationAction.disabled(), false, 'Syndication suite now unlocks');

  const immersiveAction = immersiveStoryWorlds.action;
  assert.equal(immersiveAction.disabled(), true, 'Immersive worlds wait on syndication purchase');
  getUpgradeState('syndicationSuite').purchased = true;
  assert.equal(immersiveAction.disabled(), true, 'Needs cross-media momentum');

  const vlogState = getAssetState('vlog');
  vlogState.instances = [createAssetInstance(vlogDefinition, { status: 'active' })];
  assert.equal(immersiveAction.disabled(), false, 'Immersive worlds open after all media online');
});

test('creative upgrades stack blog payouts and progress increments', () => {
  const writePost = blogDefinition.quality.actions.find(action => action.id === 'writePost');
  const blogIncome = blogDefinition.income.modifier;
  const context = upgradeContext();

  assert.equal(writePost.progressAmount(context), 1, 'Base progress is 1 without upgrades');
  assert.equal(blogIncome(100, context), 100, 'Baseline payout unchanged');

  getUpgradeState('course').purchased = true;
  assert.equal(writePost.progressAmount(context), 2, 'Course adds +1 progress');
  assert.equal(blogIncome(100, context), 150, 'Course adds +50%');

  getUpgradeState('editorialPipeline').purchased = true;
  assert.equal(writePost.progressAmount(context), 3, 'Editorial pipeline adds +1 progress');
  assert.equal(blogIncome(100, context), 180, 'Editorial pipeline adds +20% after course');

  getUpgradeState('syndicationSuite').purchased = true;
  assert.equal(writePost.progressAmount(context), 4, 'Syndication suite adds +1 progress');
  assert.equal(blogIncome(100, context), 225, 'Syndication suite stacks after other boosts');
});

test('creative upgrades accelerate e-books and vlogs', () => {
  const chapterAction = ebookDefinition.quality.actions.find(action => action.id === 'writeChapter');
  const ebookIncome = ebookDefinition.income.modifier;
  const shootEpisode = vlogDefinition.quality.actions.find(action => action.id === 'shootEpisode');
  const vlogIncome = vlogDefinition.income.modifier;
  const context = upgradeContext();

  // prevent viral bursts from affecting deterministic checks
  const originalRandom = Math.random;
  Math.random = () => 1;

  try {
    assert.equal(chapterAction.progressAmount(context), 1, 'Base e-book progress is 1');
    assert.equal(shootEpisode.progressAmount(context), 1, 'Base vlog progress is 1');
    assert.equal(ebookIncome(100, context), 100, 'Baseline e-book payout');
    assert.equal(vlogIncome(100, { ...context, instance: { quality: { level: 5 } } }), 100, 'Baseline vlog payout');

    getUpgradeState('editorialPipeline').purchased = true;
    assert.equal(chapterAction.progressAmount(context), 2, 'Editorial pipeline accelerates e-book chapters');
    assert.equal(shootEpisode.progressAmount(context), 2, 'Editorial pipeline accelerates vlog shoots');
    assert.equal(ebookIncome(100, context), 120, 'Editorial pipeline adds 20% to e-books');
    const editorialPayout = vlogIncome(100, { ...context, instance: { quality: { level: 5 } } });
    assert.ok(Math.abs(editorialPayout - 115) < 1e-6, 'Editorial pipeline adds 15% to vlogs');

    getUpgradeState('syndicationSuite').purchased = true;
    assert.equal(chapterAction.progressAmount(context), 3, 'Syndication suite adds another +1 progress');
    assert.equal(shootEpisode.progressAmount(context), 3, 'Syndication suite stacks on vlogs');
    assert.equal(ebookIncome(100, context), 150, 'Syndication suite lifts e-book royalties');
    const syndicationPayout = vlogIncome(100, { ...context, instance: { quality: { level: 5 } } });
    assert.ok(Math.abs(syndicationPayout - 138) < 1e-6, 'Syndication suite adds 20% on top of editorial bonus');

    getUpgradeState('immersiveStoryWorlds').purchased = true;
    assert.equal(chapterAction.progressAmount(context), 4, 'Immersive worlds max out e-book acceleration');
    assert.equal(shootEpisode.progressAmount(context), 4, 'Immersive worlds add another vlog step');
    assert.equal(ebookIncome(100, context), 202.5, 'Immersive worlds push e-book royalties to 202.5');
    const immersivePayout = vlogIncome(100, { ...context, instance: { quality: { level: 5 } } });
    assert.ok(Math.abs(immersivePayout - 179.4) < 1e-6, 'Immersive worlds add 30% hype to vlogs');
  } finally {
    Math.random = originalRandom;
  }
});

test('creative upgrade cards surface knowledge progress detail', () => {
  const details = editorialPipeline.details.map(render => render());
  assert.ok(details.some(text => /Outline Mastery progress/.test(text)), 'Editorial card shows Outline Mastery status');

  const synDetails = syndicationSuite.details.map(render => render());
  assert.ok(synDetails.some(text => /Brand Voice Lab progress/.test(text)), 'Syndication card shows Brand Voice Lab status');
});
