import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

const EDUCATION_TRACK_ID = 'outlineMastery';

function getStudyActionButton() {
  const button = document.querySelector('#panel-education .study-track .hustle-card__actions button:not(.ghost)');
  assert.ok(button, 'expected study action button');
  return button;
}

test('education track button reflects affordability and progress', async () => {
  ensureTestDom();

  const { configureRegistry, initializeState, getState } = await import('../../src/core/state.js');
  const { registry } = await import('../../src/game/registry.js');
  configureRegistry(registry);
  initializeState();

  const { renderCards, updateUI } = await import('../../src/ui/update.js');
  renderCards();
  updateUI();

  const actionButton = getStudyActionButton();
  assert.equal(actionButton.disabled, true);

  const state = getState();
  state.money = 500;
  updateUI();
  assert.equal(actionButton.disabled, false);

  const { enrollInKnowledgeTrack } = await import('../../src/game/requirements.js');
  enrollInKnowledgeTrack(EDUCATION_TRACK_ID);
  updateUI();

  assert.equal(actionButton.disabled, true);
  assert.match(actionButton.textContent, /remaining/i);
});
