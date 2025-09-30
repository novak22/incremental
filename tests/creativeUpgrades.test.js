import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';
import { getAssetEffectMultiplier } from '../src/game/upgrades/effects.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  assetStateModule,
  assetsModule,
  upgradesModule,
  requirementsModule
} = harness;

const { getState, getAssetState, getUpgradeState } = stateModule;
const { createAssetInstance } = assetStateModule;
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

test('creative upgrades stack blog payouts and progress multipliers', () => {
  const writePost = blogDefinition.quality.actions.find(action => action.id === 'writePost');
  assert.ok(writePost, 'Blog quality action missing');

  const qualityMultiplier = () =>
    getAssetEffectMultiplier(blogDefinition, 'quality_progress_mult', {
      actionType: 'quality'
    });
  const payoutMultiplier = () =>
    getAssetEffectMultiplier(blogDefinition, 'payout_mult', {
      actionType: 'payout'
    });

  assert.equal(writePost.progressAmount({}), 1, 'Base progress is 1 without upgrades');
  assert.equal(qualityMultiplier().multiplier, 1, 'quality multiplier starts neutral');
  assert.equal(payoutMultiplier().multiplier, 1, 'payout multiplier starts neutral');

  getUpgradeState('course').purchased = true;
  assert.equal(qualityMultiplier().multiplier, 2, 'Course doubles blog quality progress');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.5) < 1e-9, 'Course adds +50% payout');

  getUpgradeState('editorialPipeline').purchased = true;
  assert.ok(Math.abs(qualityMultiplier().multiplier - 3) < 1e-9, 'Editorial pipeline lifts progress to 3×');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.8) < 1e-9, 'Editorial pipeline stacks a 20% multiplier');

  getUpgradeState('syndicationSuite').purchased = true;
  assert.ok(Math.abs(qualityMultiplier().multiplier - 4) < 1e-9, 'Syndication suite pushes total progress to 4×');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 2.25) < 1e-9, 'Syndication suite brings total payouts to 2.25×');
});

test('creative upgrades accelerate e-books and vlogs', () => {
  const chapterAction = ebookDefinition.quality.actions.find(action => action.id === 'writeChapter');
  const shootEpisode = vlogDefinition.quality.actions.find(action => action.id === 'shootEpisode');
  assert.ok(chapterAction, 'E-book quality action missing');
  assert.ok(shootEpisode, 'Vlog quality action missing');

  const ebookQuality = () =>
    getAssetEffectMultiplier(ebookDefinition, 'quality_progress_mult', {
      actionType: 'quality'
    });
  const ebookPayout = () =>
    getAssetEffectMultiplier(ebookDefinition, 'payout_mult', {
      actionType: 'payout'
    });
  const vlogQuality = () =>
    getAssetEffectMultiplier(vlogDefinition, 'quality_progress_mult', {
      actionType: 'quality'
    });
  const vlogPayout = () =>
    getAssetEffectMultiplier(vlogDefinition, 'payout_mult', {
      actionType: 'payout'
    });

  assert.equal(chapterAction.progressAmount({}), 1, 'Base e-book progress is 1');
  assert.equal(shootEpisode.progressAmount({}), 1, 'Base vlog progress is 1');
  assert.equal(ebookQuality().multiplier, 1, 'E-book quality multiplier starts neutral');
  assert.equal(vlogQuality().multiplier, 1, 'Vlog quality multiplier starts neutral');
  assert.equal(ebookPayout().multiplier, 1, 'E-book payout multiplier starts neutral');
  assert.equal(vlogPayout().multiplier, 1, 'Vlog payout multiplier starts neutral');

  getUpgradeState('editorialPipeline').purchased = true;
  assert.ok(Math.abs(ebookQuality().multiplier - 1.5) < 1e-9, 'Editorial pipeline boosts e-book progress by 1.5×');
  assert.ok(Math.abs(vlogQuality().multiplier - 1.5) < 1e-9, 'Editorial pipeline boosts vlog progress by 1.5×');
  assert.ok(Math.abs(ebookPayout().multiplier - 1.2) < 1e-9, 'Editorial pipeline adds 20% e-book payout');
  assert.ok(Math.abs(vlogPayout().multiplier - 1.2) < 1e-9, 'Editorial pipeline adds 20% vlog payout');

  getUpgradeState('syndicationSuite').purchased = true;
  assert.ok(Math.abs(ebookQuality().multiplier - 2) < 1e-9, 'Syndication suite lifts e-book progress to 2× total');
  assert.ok(Math.abs(vlogQuality().multiplier - 2) < 1e-9, 'Syndication suite lifts vlog progress to 2× total');
  assert.ok(Math.abs(ebookPayout().multiplier - 1.5) < 1e-9, 'Syndication suite brings e-book payout to 1.5×');
  assert.ok(Math.abs(vlogPayout().multiplier - 1.5) < 1e-9, 'Syndication suite brings vlog payout to 1.5×');

  getUpgradeState('immersiveStoryWorlds').purchased = true;
  assert.ok(Math.abs(ebookQuality().multiplier - 4) < 1e-9, 'Immersive worlds double e-book progress again');
  assert.ok(Math.abs(vlogQuality().multiplier - 4) < 1e-9, 'Immersive worlds double vlog progress again');
  assert.ok(Math.abs(ebookPayout().multiplier - 1.68) < 1e-9, 'Immersive worlds lift e-book payout to 1.68×');
  assert.ok(Math.abs(vlogPayout().multiplier - 1.68) < 1e-9, 'Immersive worlds lift vlog payout to 1.68×');
});

test('creative upgrade cards surface knowledge progress detail', () => {
  const details = editorialPipeline.details.map(render => render());
  assert.ok(details.some(text => /Outline Mastery progress/.test(text)), 'Editorial card shows Outline Mastery status');

  const synDetails = syndicationSuite.details.map(render => render());
  assert.ok(synDetails.some(text => /Brand Voice Lab progress/.test(text)), 'Syndication card shows Brand Voice Lab status');
});
