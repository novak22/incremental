import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getState,
  initializeState,
  replaceState
} from '../../../../src/core/state.js';
import { ensureRegistryReady } from '../../../../src/game/registryBootstrap.js';
import { initElementRegistry } from '../../../../src/ui/elements/registry.js';
import todoWidget from '../../../../src/ui/views/browser/widgets/todoWidget.js';
import * as dashboardPresenter from '../../../../src/ui/views/browser/dashboardPresenter.js';

await import('../../../../src/ui/dashboard/quickActions.js');

test('renderTodo falls back to the current state when none is provided', async () => {
  const previousState = getState();
  const restoreState = previousState
    ? () => replaceState(previousState)
    : () => initializeState();

  ensureRegistryReady();
  initializeState();

  const originalInit = todoWidget.init;
  const originalRender = todoWidget.render;
  let capturedModel = null;

  todoWidget.init = () => {};
  todoWidget.render = model => {
    capturedModel = model;
  };

  initElementRegistry({}, {
    homepageWidgets: () => ({ todo: {} })
  });

  try {
    dashboardPresenter.renderTodo();

    assert.ok(capturedModel, 'todo widget should receive a model to render');
    assert.ok(Array.isArray(capturedModel.entries), 'model should include queue entries');
    assert.equal(capturedModel.entries.length, 0, 'queue should be empty when no tasks are accepted');
    const guidanceEntry = capturedModel.entries.find(entry => entry?.id === 'hustles:no-offers');
    assert.ok(!guidanceEntry, 'queue should hide hustle offer guidance from the todo list');
    assert.equal(
      capturedModel.emptyMessage,
      'No ready actions. Check upgrades or ventures.',
      'empty message should guide the player toward other actions'
    );
  } finally {
    todoWidget.init = originalInit;
    todoWidget.render = originalRender;
    initElementRegistry(null, {});
    restoreState();
  }
});
