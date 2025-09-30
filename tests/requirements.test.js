import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  requirementsModule
} = harness;

const {
  getState,
  getUpgradeState,
  getAssetState
} = stateModule;

const {
  KNOWLEDGE_TRACKS,
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock,
  getKnowledgeProgress,
  advanceKnowledgeTracks,
  allocateDailyStudy,
  enrollInKnowledgeTrack
} = requirementsModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('requirement label reflects missing equipment and updates after unlock', () => {
  const labelBefore = formatAssetRequirementLabel('vlog');
  assert.match(labelBefore, /Requires/i);
  assert.ok(labelBefore.includes('Camera'));

  getUpgradeState('camera').purchased = true;
  const labelAfter = formatAssetRequirementLabel('vlog');
  assert.equal(labelAfter, 'Ready to Launch');
});

test('saas requirement includes server infrastructure gating', () => {
  const labelBefore = formatAssetRequirementLabel('saas');
  assert.match(labelBefore, /Cloud Cluster/);

  const automation = getKnowledgeProgress('automationCourse');
  automation.completed = true;
  getUpgradeState('serverRack').purchased = true;
  getUpgradeState('serverCluster').purchased = true;
  const dropshipping = getAssetState('dropshipping');
  dropshipping.instances = [{ status: 'active' }];
  const ebook = getAssetState('ebook');
  ebook.instances = [{ status: 'active' }];

  const labelAfter = formatAssetRequirementLabel('saas');
  assert.equal(labelAfter, 'Ready to Launch');
});

test('requirement detail renders dynamic knowledge progress', () => {
  const state = getState();
  const trackDef = KNOWLEDGE_TRACKS.outlineMastery;
  const detailBefore = renderAssetRequirementDetail('ebook');
  assert.ok(detailBefore.includes('Outline Mastery Workshop'));
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.completed, false);

  state.money = trackDef.tuition + 500;
  state.timeLeft = trackDef.hoursPerDay + 8;
  enrollInKnowledgeTrack('outlineMastery');

  for (let day = 0; day < trackDef.days; day += 1) {
    advanceKnowledgeTracks();
    state.timeLeft = trackDef.hoursPerDay + 6;
    allocateDailyStudy();
  }

  const detailAfter = renderAssetRequirementDetail('ebook');
  assert.ok(detailAfter.includes('✅'));
  assert.ok(getKnowledgeProgress('outlineMastery').completed);
});

test('updateAssetCardLock toggles class when requirements met', () => {
  const card = document.createElement('article');
  card.classList.add('card');

  updateAssetCardLock('dropshipping', card);
  assert.ok(card.classList.contains('locked'));

  getUpgradeState('camera').purchased = true;
  getUpgradeState('studio').purchased = true;
  const blogState = getAssetState('blog');
  blogState.instances = [{ status: 'active' }, { status: 'active' }];
  const knowledge = getKnowledgeProgress('ecomPlaybook');
  knowledge.completed = true;

  updateAssetCardLock('dropshipping', card);
  assert.ok(!card.classList.contains('locked'));
});

test('advancing knowledge logs completions and clears daily flags', () => {
  const state = getState();
  const trackDef = KNOWLEDGE_TRACKS.photoLibrary;
  const progress = getKnowledgeProgress('photoLibrary');

  state.money = trackDef.tuition + 200;
  state.timeLeft = trackDef.hoursPerDay + 6;
  enrollInKnowledgeTrack('photoLibrary');
  const logBaseline = state.log.length;

  advanceKnowledgeTracks();
  assert.equal(progress.daysCompleted, 1);
  assert.equal(progress.studiedToday, false);
  assert.equal(state.log.length, logBaseline, 'no completion yet');

  for (let day = 1; day < trackDef.days; day += 1) {
    state.timeLeft = trackDef.hoursPerDay + 6;
    allocateDailyStudy();
    advanceKnowledgeTracks();
  }

  assert.ok(progress.completed);
  assert.match(state.log.at(-1).message, /Finished .*Photo Catalog Curation/i);
});
