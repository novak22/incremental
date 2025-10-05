import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

ensureTestDom();

const harness = await getGameTestHarness();
const qualityActions = await import('../../src/game/assets/quality/actions.js');

const { getAssetDefinition } = harness.registryModule;
const { createAssetInstance } = harness.assetStateModule;
const { getAssetState, getState } = harness.stateModule;

const resetAndPrepareState = () => {
  const state = harness.resetState();
  state.log.length = 0;
  return state;
};

test('quality action surfaces upgrade availability messaging', { concurrency: false }, () => {
  const state = resetAndPrepareState();
  const saasDefinition = getAssetDefinition('saas');
  const saasState = getAssetState('saas');
  saasState.instances = [createAssetInstance(saasDefinition, { status: 'active', dailyUsage: {} })];
  const instance = saasState.instances[0];

  state.timeLeft = 12;
  state.money = 500;

  const result = qualityActions.runQualityAction(saasDefinition, instance.id, 'deployEdgeNodes');
  assert.deepEqual(result, { qualityUpdated: false }, 'action should not run without required upgrade');

  const latest = state.log.at(-1)?.message || '';
  assert.match(latest, /Activate the Edge Delivery Network upgrade/, 'expected availability message to mention missing upgrade');
});

test('quality action deducts costs and time while recording metrics', { concurrency: false }, () => {
  const state = resetAndPrepareState();
  const blogDefinition = getAssetDefinition('blog');
  const blogState = getAssetState('blog');
  blogState.instances = [createAssetInstance(blogDefinition, { status: 'active', dailyUsage: {} })];
  const instance = blogState.instances[0];

  state.timeLeft = 10;
  state.money = 200;

  const beforeMoney = state.money;
  const beforeTime = state.timeLeft;

  const result = qualityActions.runQualityAction(blogDefinition, instance.id, 'seoSprint');
  assert.equal(result.qualityUpdated, true, 'quality action should complete');

  assert.equal(state.money, beforeMoney - 16, 'money should be deducted for quality cost');
  assert.equal(state.timeLeft, beforeTime - 2, 'time should be deducted for quality action');

  const costKey = `asset:${blogDefinition.id}:quality:seoSprint:cost`;
  const timeKey = `asset:${blogDefinition.id}:quality:seoSprint:time`;
  const dailyMetrics = state.metrics?.daily;
  assert.ok(dailyMetrics?.costs?.[costKey], 'cost contribution should be recorded');
  assert.equal(dailyMetrics.costs[costKey].amount, 16, 'cost metric should match spend');
  assert.ok(dailyMetrics?.time?.[timeKey], 'time contribution should be recorded');
  assert.equal(dailyMetrics.time[timeKey].hours, 2, 'time metric should match hours spent');
});

test('quality action grants skill progress and raises asset quality levels', { concurrency: false }, () => {
  const state = resetAndPrepareState();
  const blogDefinition = getAssetDefinition('blog');
  const blogState = getAssetState('blog');
  blogState.instances = [
    createAssetInstance(blogDefinition, {
      status: 'active',
      dailyUsage: {},
      quality: { level: 0, progress: { posts: 2 } }
    })
  ];
  const instance = blogState.instances[0];

  state.timeLeft = 10;
  state.money = 0;

  const beforeXp = state.skills?.writing?.xp || 0;

  const result = qualityActions.runQualityAction(blogDefinition, instance.id, 'writePost');
  assert.equal(result.qualityUpdated, true, 'quality action should advance progress');

  const writingSkill = getState().skills.writing;
  assert.ok(writingSkill.xp > beforeXp, 'writing skill XP should increase after action');

  const updatedInstance = getAssetState('blog').instances[0];
  assert.equal(updatedInstance.quality.progress.posts, 3, 'progress should increment by one');
  assert.equal(updatedInstance.quality.level, 1, 'quality level should advance when requirements met');

  const levelLog = state.log.find(entry => entry.message.includes('reached Quality 1'));
  assert.ok(levelLog, 'level-up log message should be recorded');
});
