import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initElementRegistry } from '../../../../../src/ui/elements/registry.js';
import { createLayoutManager } from '../../../../../src/ui/views/browser/widgets/layoutManager.js';
import {
  registerWidget,
  resetWidgetRegistry
} from '../../../../../src/ui/views/browser/widgets/registry.js';

const ORIGINAL_WINDOW = globalThis.window;
const ORIGINAL_DOCUMENT = globalThis.document;

function setupDom(widgetIds = ['todo', 'apps', 'bank'], managerOptions = {}) {
  const templateHtml = widgetIds
    .map(
      id => `
        <template data-widget-template="${id}">
          <section class="browser-widget" data-widget="${id}">
            <header class="browser-widget__header">${id}</header>
          </section>
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
  `, { url: 'https://example.test/' });

  const container = dom.window.document.querySelector('.browser-home__widgets');

  const registryState = { record: null };

  const baseRecord = {
    container,
    listTemplates: () => Array.from(container.querySelectorAll('template[data-widget-template]')),
    getTemplate: widgetId => container.querySelector(`template[data-widget-template="${widgetId}"]`)
  };

  registryState.record = { ...baseRecord };

  const manager = createLayoutManager({
    resolveMountRecord: () => registryState.record,
    ...managerOptions
  });

  registryState.record = { ...baseRecord, layoutManager: manager };

  initElementRegistry(dom.window.document, {
    homepageWidgets: () => registryState.record
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  return { dom, container, manager };
}

function getRenderedOrder(container) {
  return Array.from(
    container.querySelectorAll(':scope > [data-widget]')
  ).map(node => node.dataset.widget);
}

function teardownDom(dom, manager) {
  manager?.__testables?.reset?.();
  resetWidgetRegistry();
  initElementRegistry(null, {});
  dom?.window?.close();
  globalThis.window = ORIGINAL_WINDOW;
  globalThis.document = ORIGINAL_DOCUMENT;
}

test('renderLayout mounts controllers for registry definitions', async () => {
  const { dom, container, manager } = setupDom();

  const mountLog = [];
  const factoryCalls = new Map();

  const registerStub = id => {
    registerWidget({
      id,
      title: id,
      factory: () => {
        const count = (factoryCalls.get(id) || 0) + 1;
        factoryCalls.set(id, count);
        const controller = {
          mounted: false,
          mount: ({ container: mountContainer }) => {
            controller.mounted = true;
            mountLog.push({ id, container: mountContainer });
          },
          isMounted: () => controller.mounted
        };
        return controller;
      },
      featureFlags: []
    });
  };

  resetWidgetRegistry();
  ['todo', 'apps', 'bank'].forEach(registerStub);

  try {
    const order = manager.renderLayout();
    assert.deepEqual(order, ['todo', 'apps', 'bank']);
    assert.equal(mountLog.length, 3, 'each widget should mount once on first render');
    assert.deepEqual(
      mountLog.map(entry => entry.id),
      ['todo', 'apps', 'bank'],
      'mount order should follow registry order'
    );

    const domOrder = getRenderedOrder(container);
    assert.deepEqual(domOrder, ['todo', 'apps', 'bank']);

    // Second render should reuse existing controllers without remounting.
    manager.renderLayout();
    assert.equal(mountLog.length, 3, 'controllers should not remount when already mounted');
    assert.deepEqual(
      Object.fromEntries(factoryCalls.entries()),
      { todo: 1, apps: 1, bank: 1 },
      'each widget should instantiate only once per host'
    );
  } finally {
    teardownDom(dom, manager);
  }
});

test('setLayoutOrder persists sanitized ordering and rerenders the container', async () => {
  const { dom, container, manager } = setupDom();

  const mountCounts = new Map();
  const factoryCalls = new Map();

  const registerStub = id => {
    registerWidget({
      id,
      title: id,
      factory: () => {
        const count = (factoryCalls.get(id) || 0) + 1;
        factoryCalls.set(id, count);
        const controller = {
          mounted: false,
          mount: ({ container: mountContainer }) => {
            controller.mounted = true;
            mountCounts.set(id, (mountCounts.get(id) || 0) + 1);
            controller.container = mountContainer;
          },
          isMounted: () => controller.mounted
        };
        return controller;
      },
      featureFlags: []
    });
  };

  resetWidgetRegistry();
  ['todo', 'apps', 'bank'].forEach(registerStub);

  try {
    // Seed storage with an extra id to confirm sanitization.
    dom.window.localStorage.setItem('browser.widgets.layout', JSON.stringify(['bank', 'unknown', 'apps']));

    const initialOrder = manager.renderLayout();
    assert.deepEqual(initialOrder, ['bank', 'apps', 'todo'], 'render should drop unknown ids and append missing widgets');

    const initialDomOrder = getRenderedOrder(container);
    assert.deepEqual(initialDomOrder, ['bank', 'apps', 'todo']);

    const nextOrder = manager.setLayoutOrder(['apps', 'todo']);
    assert.deepEqual(nextOrder, ['apps', 'todo', 'bank'], 'setLayoutOrder should append missing ids after sanitizing input');

    const stored = JSON.parse(dom.window.localStorage.getItem('browser.widgets.layout'));
    assert.deepEqual(stored, ['apps', 'todo', 'bank'], 'layout order should persist sanitized ids to storage');

    const rerenderedOrder = getRenderedOrder(container);
    assert.deepEqual(rerenderedOrder, ['apps', 'todo', 'bank'], 'container children should match the persisted order');

    const countsById = Object.fromEntries(mountCounts.entries());
    assert.deepEqual(
      countsById,
      {
        todo: 1,
        apps: 1,
        bank: 1
      },
      'controllers should mount only once even after reordering'
    );
    assert.deepEqual(
      Object.fromEntries(factoryCalls.entries()),
      {
        todo: 1,
        apps: 1,
        bank: 1
      },
      'factories should only run once for each widget controller instance'
    );
  } finally {
    teardownDom(dom, manager);
  }
});

test('layout manager namespaces storage by layout identifier', async () => {
  const layoutId = 'evening';
  const storageKey = `browser.widgets.layout.${layoutId}`;
  const { dom, container, manager } = setupDom(['todo', 'apps', 'bank'], {
    storageKey: 'browser.widgets.layout',
    layoutId
  });

  const registerStub = id => {
    registerWidget({
      id,
      title: id,
      factory: () => ({
        mount: () => {},
        isMounted: () => true
      }),
      featureFlags: []
    });
  };

  resetWidgetRegistry();
  ['todo', 'apps', 'bank'].forEach(registerStub);

  try {
    dom.window.localStorage.setItem(storageKey, JSON.stringify(['apps', 'bank', 'todo']));

    const order = manager.renderLayout();
    assert.deepEqual(order, ['apps', 'bank', 'todo']);
    assert.deepEqual(getRenderedOrder(container), ['apps', 'bank', 'todo']);

    manager.setLayoutOrder(['todo']);
    const stored = JSON.parse(dom.window.localStorage.getItem(storageKey));
    assert.deepEqual(stored, ['todo', 'apps', 'bank']);

    assert.equal(
      dom.window.localStorage.getItem('browser.widgets.layout'),
      null,
      'default layout key should remain untouched when using namespaced identifiers'
    );
  } finally {
    teardownDom(dom, manager);
  }
});
