import test from 'node:test';
import assert from 'node:assert/strict';

import { JSDOM } from 'jsdom';

import {
  getState,
  initializeState,
  replaceState
} from '../../../../src/core/state.js';
import { ensureRegistryReady } from '../../../../src/game/registryBootstrap.js';
import { initElementRegistry } from '../../../../src/ui/elements/registry.js';
import {
  registerWidget,
  unregisterWidget,
  resetWidgetRegistry
} from '../../../../src/ui/views/browser/widgets/registry.js';
import dashboardPresenter, {
  renderTodo,
  __testables
} from '../../../../src/ui/views/browser/dashboardPresenter.js';

function setupHomeWidgetsDom(widgetIds = []) {
  const templateHtml = widgetIds
    .map(
      id => `
        <template data-widget-template="${id}">
          <section data-widget="${id}" class="browser-widget"></section>
        </template>
      `
    )
    .join('');

  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="browser-home__widgets">
          ${templateHtml}
        </div>
      </body>
    </html>
  `);

  const container = dom.window.document.querySelector('.browser-home__widgets');

  initElementRegistry(dom.window.document, {
    homepageWidgets: () => ({
      container,
      listTemplates: () => Array.from(container.querySelectorAll('template[data-widget-template]')),
      getTemplate: widgetId => container.querySelector(`template[data-widget-template="${widgetId}"]`)
    })
  });

  return dom;
}

await import('../../../../src/ui/dashboard/quickActions.js');

test('renderTodo falls back to the current state when none is provided', async () => {
  const previousState = getState();
  const restoreState = previousState
    ? () => replaceState(previousState)
    : () => initializeState();

  ensureRegistryReady();
  initializeState();

  let capturedModel = null;

  const dom = setupHomeWidgetsDom(['todo']);

  __testables.reset();
  resetWidgetRegistry();

  registerWidget({
    id: 'todo',
    title: 'ToDo',
    factory: () => ({
      mount: () => {},
      render: model => {
        capturedModel = model;
      },
      isMounted: () => true
    }),
    featureFlags: []
  });

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
    __testables.reset();
    resetWidgetRegistry();
    initElementRegistry(null, {});
    dom.window.close();
    restoreState();
  }
});

test('dashboard presenter responds to widget registry updates', async () => {
  ensureRegistryReady();
  initializeState();

  const mountCalls = [];
  const destroyCalls = [];

  const dom = setupHomeWidgetsDom(['custom']);

  __testables.reset();
  resetWidgetRegistry();

  registerWidget({
    id: 'custom',
    title: 'Custom',
    factory: () => ({
      mount: () => {
        mountCalls.push('mount');
      },
      destroy: () => {
        destroyCalls.push('destroyed');
      },
      isMounted: () => true
    }),
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
    dom.window.close();
  }
});

test('dashboard presenter rebuilds controllers when a widget definition changes', async () => {
  ensureRegistryReady();
  initializeState();

  const mountCalls = [];
  const destroyCalls = [];

  const dom = setupHomeWidgetsDom(['custom']);

  __testables.reset();
  resetWidgetRegistry();

  registerWidget({
    id: 'custom',
    title: 'Custom',
    factory: () => ({
      mount: () => {
        mountCalls.push('first');
      },
      destroy: () => {
        destroyCalls.push('first');
      },
      isMounted: () => true
    }),
    featureFlags: []
  });

  try {
    dashboardPresenter.renderDashboard({}, {});
    assert.deepEqual(mountCalls, ['first'], 'first controller should mount once');
    assert.deepEqual(destroyCalls, [], 'first controller should not be destroyed before replacement');

    registerWidget({
      id: 'custom',
      title: 'Custom',
      factory: () => ({
        mount: () => {
          mountCalls.push('second');
        },
        destroy: () => {
          destroyCalls.push('second');
        },
        isMounted: () => true
      }),
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
    dom.window.close();
  }
});

test('dashboard presenter retries controller creation when a factory throws', async () => {
  ensureRegistryReady();
  initializeState();

  const mountCalls = [];

  const dom = setupHomeWidgetsDom(['flaky']);

  __testables.reset();
  resetWidgetRegistry();

  let attempts = 0;
  registerWidget({
    id: 'flaky',
    title: 'Flaky',
    factory: () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('not ready');
      }
      return {
        mount: () => {
          mountCalls.push('mounted');
        },
        isMounted: () => true
      };
    },
    featureFlags: []
  });

  try {
    dashboardPresenter.renderDashboard({}, {});

    dashboardPresenter.renderDashboard({}, {});
    assert.deepEqual(mountCalls, ['mounted'], 'flaky controller should mount after retrying');
    assert.equal(attempts, 2, 'factory should be invoked again on the retry');
    assert.ok(__testables.hasController('flaky'), 'flaky controller should be cached after a successful retry');
  } finally {
    unregisterWidget('flaky');
    __testables.reset();
    resetWidgetRegistry();
    initElementRegistry(null, {});
    dom.window.close();
  }
});
