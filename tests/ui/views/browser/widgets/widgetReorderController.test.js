import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initElementRegistry } from '../../../../../src/ui/elements/registry.js';
import { createLayoutManager } from '../../../../../src/ui/views/browser/widgets/layoutManager.js';
import { registerWidget, resetWidgetRegistry } from '../../../../../src/ui/views/browser/widgets/registry.js';
import createWidgetReorderController from '../../../../../src/ui/views/browser/widgets/widgetReorderController.js';

const ORIGINAL_WINDOW = globalThis.window;
const ORIGINAL_DOCUMENT = globalThis.document;

function buildTemplate(id) {
  return `
    <template data-widget-template="${id}">
      <section class="browser-widget" data-widget="${id}" role="listitem">
        <header class="browser-widget__header">
          <button
            class="browser-widget__drag-handle"
            type="button"
            data-widget-handle
            aria-label="Reorder ${id} widget"
            aria-hidden="true"
            tabindex="-1"
          >
            <span class="browser-widget__drag-icon" aria-hidden="true">⋮⋮</span>
            <span class="browser-visually-hidden">${id} handle</span>
          </button>
          <h2 class="browser-widget__title">
            <span class="browser-widget__title-text">${id}</span>
          </h2>
        </header>
        <button type="button" class="test-widget-button" data-widget-action="${id}">Ping ${id}</button>
      </section>
    </template>
  `;
}

function setupDom(widgetIds = ['todo', 'apps', 'bank']) {
  const templates = widgetIds.map(id => buildTemplate(id)).join('\n');
  const dom = new JSDOM(
    `
      <!doctype html>
      <html>
        <body>
          <div class="browser-home__widgets" role="list">
            <div class="browser-home__actions">
              <button
                type="button"
                class="browser-home__reorder-toggle browser-button browser-button--text"
                data-role="widget-reorder-toggle"
                aria-pressed="false"
                title="Shuffle the home widgets to suit your flow"
              >
                Reorder widgets
              </button>
            </div>
            ${templates}
          </div>
        </body>
      </html>
    `,
    { url: 'https://example.test/' }
  );

  const container = dom.window.document.querySelector('.browser-home__widgets');

  const registryState = { record: null };
  const baseRecord = {
    container,
    listTemplates: () => Array.from(container.querySelectorAll('template[data-widget-template]')),
    getTemplate: widgetId => container.querySelector(`template[data-widget-template="${widgetId}"]`)
  };

  registryState.record = { ...baseRecord };
  const manager = createLayoutManager({
    resolveMountRecord: () => registryState.record
  });
  registryState.record = { ...baseRecord, layoutManager: manager };

  initElementRegistry(dom.window.document, {
    homepageWidgets: () => registryState.record
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  return { dom, container, manager };
}

function teardownDom(dom, manager) {
  manager?.__testables?.reset?.();
  resetWidgetRegistry();
  initElementRegistry(null, {});
  dom?.window?.close();
  globalThis.window = ORIGINAL_WINDOW;
  globalThis.document = ORIGINAL_DOCUMENT;
}

function registerTestWidgets(ids = ['todo', 'apps', 'bank']) {
  resetWidgetRegistry();
  ids.forEach(id => {
    registerWidget({
      id,
      title: id,
      featureFlags: [],
      factory: () => ({
        mounted: false,
        mount({ container }) {
          this.mounted = true;
          this.container = container;
        },
        isMounted() {
          return Boolean(this.mounted);
        }
      })
    });
  });
}

test('keyboard reordering updates layout order and persists the new lineup', async () => {
  const { dom, container, manager } = setupDom();
  registerTestWidgets();

  try {
    manager.renderLayout();

    const controller = createWidgetReorderController({
      layoutResolver: () => manager,
      containerResolver: () => container
    });
    assert.equal(controller.init(), true, 'controller should initialize successfully');

    const toggle = container.querySelector('[data-role="widget-reorder-toggle"]');
    toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

    const handle = container.querySelector('[data-widget="todo"] [data-widget-handle]');
    handle.focus();
    handle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    await new Promise(resolve => dom.window.setTimeout(resolve, 0));

    const order = manager.getLayoutOrder();
    assert.deepEqual(order, ['apps', 'todo', 'bank'], 'layout order should update after keyboard move');

    const domOrder = Array.from(container.querySelectorAll(':scope > [data-widget]')).map(node => node.dataset.widget);
    assert.deepEqual(domOrder, ['apps', 'todo', 'bank'], 'DOM order should mirror persisted layout');

    const stored = JSON.parse(dom.window.localStorage.getItem('browser.widgets.layout'));
    assert.deepEqual(stored, ['apps', 'todo', 'bank'], 'layout order should persist to storage');

    const activeWidget = dom.window.document.activeElement?.closest?.('[data-widget]');
    assert.equal(activeWidget?.dataset?.widget, 'todo', 'handle focus should follow the moved widget');

    controller.destroy();
  } finally {
    teardownDom(dom, manager);
  }
});

test('reorder mode leaves other widget interactions untouched', async () => {
  const { dom, container, manager } = setupDom();
  registerTestWidgets();

  try {
    manager.renderLayout();

    const controller = createWidgetReorderController({
      layoutResolver: () => manager,
      containerResolver: () => container
    });
    controller.init();

    const button = container.querySelector('[data-widget="todo"] [data-widget-action="todo"]');
    assert.ok(button, 'test button should exist inside the widget');

    let clickCount = 0;
    button.addEventListener('click', () => {
      clickCount += 1;
    });

    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(clickCount, 1, 'click interactions should work before enabling reorder mode');

    const toggle = container.querySelector('[data-role="widget-reorder-toggle"]');
    toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(clickCount, 2, 'click interactions should still work while reorder mode is active');

    controller.destroy();
  } finally {
    teardownDom(dom, manager);
  }
});
