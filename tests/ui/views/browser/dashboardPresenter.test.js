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
import {
  registerWidget,
  unregisterWidget,
  resetWidgetRegistry
} from '../../../../src/ui/views/browser/widgets/registry.js';
import dashboardPresenter, {
  renderTodo,
  __testables
} from '../../../../src/ui/views/browser/dashboardPresenter.js';

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
  const originalMount = todoWidget.mount;
  const originalIsMounted = todoWidget.isMounted;
  let capturedModel = null;

  todoWidget.init = () => {};
  todoWidget.render = model => {
    capturedModel = model;
  };
  todoWidget.mount = () => {};
  todoWidget.isMounted = () => true;

  const todoContainer = { dataset: { widget: 'todo' } };

  initElementRegistry({}, {
    homepageWidgets: () => ({
      container: {
        querySelector: selector => (selector === '[data-widget="todo"]' ? todoContainer : null),
        querySelectorAll: () => [todoContainer]
      },
      getWidgetContainer: id => (id === 'todo' ? todoContainer : null)
    })
  });

  __testables.reset();
  resetWidgetRegistry();

  try {
    renderTodo();

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
    todoWidget.mount = originalMount;
    todoWidget.isMounted = originalIsMounted;
    __testables.reset();
    resetWidgetRegistry();
    initElementRegistry(null, {});
    restoreState();
  }
});

test('dashboard presenter responds to widget registry updates', async () => {
  ensureRegistryReady();
  initializeState();

  const mountCalls = [];
  const destroyCalls = [];

  const widgetContainer = { dataset: { widget: 'custom' } };

  initElementRegistry({}, {
    homepageWidgets: () => ({
      container: {
        querySelector: selector => (selector === '[data-widget="custom"]' ? widgetContainer : null),
        querySelectorAll: () => [widgetContainer]
      },
      getWidgetContainer: id => (id === 'custom' ? widgetContainer : null)
    })
  });

  __testables.reset();
  resetWidgetRegistry();

  const stubController = {
    mount: () => {
      mountCalls.push('mount');
    },
    destroy: () => {
      destroyCalls.push('destroyed');
    },
    isMounted: () => true
  };

  registerWidget({
    id: 'custom',
    title: 'Custom',
    factory: () => stubController,
    featureFlags: []
  });

  try {
    dashboardPresenter.renderDashboard({}, {});
    assert.equal(mountCalls.length, 1, 'custom widget should mount once');

    unregisterWidget('custom');
    dashboardPresenter.renderDashboard({}, {});
    assert.equal(destroyCalls.length, 1, 'custom widget should be destroyed when unregistered');
  } finally {
    unregisterWidget('custom');
    __testables.reset();
    resetWidgetRegistry();
    initElementRegistry(null, {});
  }
});

test('dashboard presenter rebuilds controllers when a widget definition changes', async () => {
  ensureRegistryReady();
  initializeState();

  const mountCalls = [];
  const destroyCalls = [];

  const widgetContainer = { dataset: { widget: 'custom' } };

  initElementRegistry({}, {
    homepageWidgets: () => ({
      container: {
        querySelector: selector => (selector === '[data-widget="custom"]' ? widgetContainer : null),
        querySelectorAll: () => [widgetContainer]
      },
      getWidgetContainer: id => (id === 'custom' ? widgetContainer : null)
    })
  });

  __testables.reset();
  resetWidgetRegistry();

  const firstController = {
    mount: () => {
      mountCalls.push('first');
    },
    destroy: () => {
      destroyCalls.push('first');
    },
    isMounted: () => true
  };

  registerWidget({
    id: 'custom',
    title: 'Custom',
    factory: () => firstController,
    featureFlags: []
  });

  try {
    dashboardPresenter.renderDashboard({}, {});
    assert.deepEqual(mountCalls, ['first'], 'first controller should mount once');
    assert.deepEqual(destroyCalls, [], 'first controller should not be destroyed before replacement');

    const secondController = {
      mount: () => {
        mountCalls.push('second');
      },
      destroy: () => {
        destroyCalls.push('second');
      },
      isMounted: () => true
    };

    registerWidget({
      id: 'custom',
      title: 'Custom',
      factory: () => secondController,
      featureFlags: []
    });

    dashboardPresenter.renderDashboard({}, {});

    assert.deepEqual(destroyCalls, ['first'], 'first controller should be destroyed when definition changes');
    assert.deepEqual(mountCalls, ['first', 'second'], 'second controller should mount after re-registering');
  } finally {
    unregisterWidget('custom');
    __testables.reset();
    resetWidgetRegistry();
    initElementRegistry(null, {});
  }
});
