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
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock,
  getKnowledgeProgress,
  markKnowledgeStudied,
  advanceKnowledgeTracks
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

test('requirement detail renders dynamic knowledge progress', () => {
  const detailBefore = renderAssetRequirementDetail('ebook');
  assert.ok(detailBefore.includes('Outline Mastery Workshop'));
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.completed, false);

  for (let day = 0; day < 3; day += 1) {
    markKnowledgeStudied('outlineMastery');
    advanceKnowledgeTracks();
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
  const progress = getKnowledgeProgress('photoLibrary');

  markKnowledgeStudied('photoLibrary');
  advanceKnowledgeTracks();
  assert.equal(progress.daysCompleted, 1);
  assert.equal(progress.studiedToday, false);
  assert.equal(state.log.length, 0, 'no completion yet');

  markKnowledgeStudied('photoLibrary');
  advanceKnowledgeTracks();
  assert.ok(progress.completed);
  assert.match(state.log.at(-1).message, /Finished .*Photo Catalog Curation/i);
});
