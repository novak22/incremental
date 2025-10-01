import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const { buildTrackViewModel } = await import('../src/game/hustles/knowledgeHustles.js');
const { formatMoney } = await import('../src/core/helpers.js');

const harness = await getGameTestHarness();
const {
  stateModule,
  assetStateModule,
  hustlesModule,
  requirementsModule,
  offlineModule,
  lifecycleModule,
  assetsModule
} = harness;

const { getState, getAssetState, getHustleState } = stateModule;
const { createAssetInstance } = assetStateModule;
const { KNOWLEDGE_TRACKS, getKnowledgeProgress } = requirementsModule;

const {
  HUSTLES,
} = hustlesModule;

const { ASSETS, allocateAssetMaintenance } = assetsModule;
const { rollDailyIncome } = await import('../src/game/assets/helpers.js');

const { handleOfflineProgress } = offlineModule;
const { endDay } = lifecycleModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('knowledge hustle view model summarizes study progress states', () => {
  const track = KNOWLEDGE_TRACKS.outlineMastery;

  const readyState = getState();
  readyState.money = track.tuition;
  const readyModel = buildTrackViewModel(track, readyState);
  assert.equal(readyModel.statusLabel, '🚀 Status: <strong>Ready to enroll</strong>');
  assert.equal(readyModel.ctaLabel, `Enroll for $${formatMoney(track.tuition)}`);
  assert.equal(readyModel.canEnroll, true);
  assert.deepEqual(readyModel.datasetFlags, {
    inProgress: false,
    studiedToday: false,
    enrolled: false
  });

  resetState();
  const enrolledState = getState();
  enrolledState.money = 0;
  const enrolledProgress = getKnowledgeProgress(track.id, enrolledState);
  enrolledProgress.enrolled = true;
  enrolledProgress.daysCompleted = 3;
  enrolledProgress.studiedToday = true;
  const enrolledModel = buildTrackViewModel(track, enrolledState);
  assert.equal(enrolledModel.statusLabel, '📚 Status: <strong>2 days remaining</strong>');
  assert.equal(enrolledModel.ctaLabel, '2 days remaining');
  assert.equal(enrolledModel.canEnroll, false);
  assert.deepEqual(enrolledModel.datasetFlags, {
    inProgress: true,
    studiedToday: true,
    enrolled: true
  });

  resetState();
  const completedState = getState();
  const completedProgress = getKnowledgeProgress(track.id, completedState);
  completedProgress.completed = true;
  completedProgress.enrolled = false;
  const completedModel = buildTrackViewModel(track, completedState);
  assert.equal(completedModel.statusLabel, '✅ Status: <strong>Complete</strong>');
  assert.equal(completedModel.ctaLabel, 'Course Complete');
  assert.equal(completedModel.canEnroll, false);
  assert.deepEqual(completedModel.datasetFlags, {
    inProgress: false,
    studiedToday: false,
    enrolled: false
  });
});

test('study hustles charge tuition and auto-schedule class time', () => {
  const state = getState();
  const studyHustle = HUSTLES.find(hustle => hustle.id.startsWith('study-outlineMastery'));
  const track = getKnowledgeProgress('outlineMastery');
  const tuition = KNOWLEDGE_TRACKS.outlineMastery.tuition;

  state.money = tuition + 500;
  state.timeLeft = track.hoursPerDay + 8;

  const beforeMoney = state.money;

  studyHustle.action.onClick();

  const updated = getKnowledgeProgress('outlineMastery');

  assert.equal(updated.enrolled, true, 'enrollment should activate the course');
  assert.ok(updated.studiedToday, 'study time should be booked immediately');
  assert.equal(state.money, beforeMoney - tuition, 'tuition should be deducted upfront');
  assert.equal(state.timeLeft, 8, 'daily study hours should be consumed automatically');
  assert.match(state.log.at(-1).message, /Study sessions reserved|Class time booked/, 'log should mention scheduled study');
});

test('education multipliers boost freelance writing payout once mastered', () => {
  resetState();

  const baseState = getState();
  baseState.money = 0;
  baseState.timeLeft = 10;
  const baseFreelance = HUSTLES.find(hustle => hustle.id === 'freelance');
  baseFreelance.action.onClick();
  assert.equal(baseState.money, 18, 'baseline freelance payout should be unchanged without study');

  resetState();

  const boostedState = getState();
  boostedState.money = 0;
  boostedState.timeLeft = 10;
  const mastery = getKnowledgeProgress('outlineMastery', boostedState);
  mastery.completed = true;
  const boostedFreelance = HUSTLES.find(hustle => hustle.id === 'freelance');
  boostedFreelance.action.onClick();

  assert.equal(boostedState.money, 23, 'outline mastery should add a 25% payout boost (rounded)');
  assert.match(
    boostedState.log.at(-1).message,
    /Outline Mastery Workshop/,
    'log should summarize applied education bonus'
  );
});

test('education flat bonuses add to audience call payouts', () => {
  resetState();

  const baseState = getState();
  baseState.money = 0;
  baseState.timeLeft = 10;
  getAssetState('blog', baseState).instances = [{ status: 'active' }];
  HUSTLES.find(hustle => hustle.id === 'audienceCall').action.onClick();
  assert.equal(baseState.money, 12, 'baseline Q&A payout should be $12 without training');

  resetState();

  const boostedState = getState();
  boostedState.money = 0;
  boostedState.timeLeft = 10;
  getAssetState('blog', boostedState).instances = [{ status: 'active' }];
  const brandVoice = getKnowledgeProgress('brandVoiceLab', boostedState);
  brandVoice.completed = true;
  HUSTLES.find(hustle => hustle.id === 'audienceCall').action.onClick();

  assert.equal(boostedState.money, 16, 'brand voice lab should add a $4 tip boost');
  assert.match(
    boostedState.log.at(-1).message,
    /Brand Voice Lab/,
    'log should call out the brand voice bonus'
  );
});

test('curriculum design studio multiplies workshop payouts', () => {
  resetState();

  const baseState = getState();
  baseState.money = 0;
  baseState.timeLeft = 10;
  getAssetState('blog', baseState).instances = [{ status: 'active' }];
  getAssetState('ebook', baseState).instances = [{ status: 'active' }];
  HUSTLES.find(hustle => hustle.id === 'popUpWorkshop').action.onClick();
  assert.equal(baseState.money, 38, 'baseline workshop payout should be $38 without study');

  resetState();

  const boostedState = getState();
  boostedState.money = 0;
  boostedState.timeLeft = 10;
  getAssetState('blog', boostedState).instances = [{ status: 'active' }];
  getAssetState('ebook', boostedState).instances = [{ status: 'active' }];
  const curriculum = getKnowledgeProgress('curriculumDesignStudio', boostedState);
  curriculum.completed = true;
  HUSTLES.find(hustle => hustle.id === 'popUpWorkshop').action.onClick();

  assert.equal(boostedState.money, 49, 'curriculum design studio should add a 30% multiplier (rounded)');
  assert.match(
    boostedState.log.at(-1).message,
    /Curriculum Design Studio/,
    'log should reference the curriculum bonus'
  );
});

test('fulfillment ops masterclass boosts dropshipping asset payouts and logs the bonus', () => {
  const dropshippingDef = ASSETS.find(asset => asset.id === 'dropshipping');
  const originalRandom = Math.random;

  try {
    Math.random = () => 0;

    resetState();
    const baseState = getState();
    const baseAssetState = getAssetState('dropshipping', baseState);
    const baseInstance = createAssetInstance(dropshippingDef, { status: 'active' });
    baseAssetState.instances = [baseInstance];
    const basePayout = rollDailyIncome(dropshippingDef, baseAssetState, baseInstance);

    resetState();
    const boostedState = getState();
    const boostedAssetState = getAssetState('dropshipping', boostedState);
    const boostedInstance = createAssetInstance(dropshippingDef, { status: 'active' });
    boostedAssetState.instances = [boostedInstance];
    const mastery = getKnowledgeProgress('fulfillmentOpsMasterclass', boostedState);
    mastery.completed = true;
    const boostedPayout = rollDailyIncome(dropshippingDef, boostedAssetState, boostedInstance);
    assert.ok(boostedPayout > basePayout, 'education should increase dropshipping payouts');

    const beforeLogLength = boostedState.log.length;
    boostedState.money = 50;
    boostedState.timeLeft = 24;
    boostedInstance.pendingIncome = boostedPayout;
    boostedInstance.maintenanceFundedToday = false;
    allocateAssetMaintenance();
    const payoutLog = boostedState.log
      .slice(beforeLogLength)
      .find(entry => entry.message.includes('Study boost'));
    assert.ok(payoutLog, 'payout log should celebrate the study boost');
    assert.match(payoutLog.message, /Fulfillment Ops Masterclass/, 'log should name the fulfilled course');
  } finally {
    Math.random = originalRandom;
  }
});

test('offline progress adds a friendly reminder when nothing resolves', () => {
  const state = getState();
  const beforeLogLength = state.log.length;

  handleOfflineProgress(Date.now() - 60000);

  assert.equal(state.log.length, beforeLogLength + 1);
  assert.match(state.log.at(-1).message, /While you were away, the clock paused/);
});

test('audience call can only run once per day', () => {
  resetState();

  const state = getState();
  state.money = 0;
  state.timeLeft = 10;
  getAssetState('blog', state).instances = [{ status: 'active' }];

  const audience = HUSTLES.find(hustle => hustle.id === 'audienceCall');
  audience.action.onClick();

  assert.equal(state.money, 12, 'first run should pay out');
  assert.equal(getHustleState('audienceCall').runsToday, 1, 'daily counter should increment after the first run');

  const beforeLogLength = state.log.length;
  audience.action.onClick();

  assert.equal(state.money, 12, 'second run should be blocked by the daily limit');
  assert.equal(getHustleState('audienceCall').runsToday, 1, 'daily counter should not increase after hitting the cap');
  assert.equal(state.log.length, beforeLogLength + 1, 'player should receive a log warning when capped');
  assert.match(state.log.at(-1).message, /Daily limit/, 'log should mention the daily limit reason');

  state.timeLeft = 0;
  endDay(false);

  assert.equal(getHustleState('audienceCall').runsToday, 0, 'usage should reset after a new day begins');

  const beforeMoney = state.money;
  audience.action.onClick();
  assert.equal(state.money, beforeMoney + 12, 'limit should reset the following day');
  assert.equal(getHustleState('audienceCall').runsToday, 1, 'counter should start over on the new day');
});

test('survey sprint caps at four runs per day', () => {
  resetState();

  const state = getState();
  state.money = 0;
  state.timeLeft = 10;

  const survey = HUSTLES.find(hustle => hustle.id === 'surveySprint');

  for (let index = 0; index < 4; index += 1) {
    survey.action.onClick();
  }

  assert.equal(state.money, 4, 'four successful runs should pay out $4 total');
  assert.equal(getHustleState('surveySprint').runsToday, 4, 'counter should reflect four completed runs');

  const beforeMoney = state.money;
  const beforeLog = state.log.length;
  survey.action.onClick();

  assert.equal(state.money, beforeMoney, 'fifth attempt should not pay out');
  assert.equal(getHustleState('surveySprint').runsToday, 4, 'counter should remain at the cap');
  assert.equal(state.log.length, beforeLog + 1, 'players should see a log entry explaining the limit');
  assert.match(state.log.at(-1).message, /Daily limit/, 'limit warning should mention the daily cap');

  state.timeLeft = 0;
  endDay(false);

  assert.equal(getHustleState('surveySprint').runsToday, 0, 'counter should clear at the start of a new day');

  const afterResetMoney = state.money;
  survey.action.onClick();
  assert.equal(state.money, afterResetMoney + 1, 'new day should allow survey sprint again');
  assert.equal(getHustleState('surveySprint').runsToday, 1, 'counter should restart after reset');
});
