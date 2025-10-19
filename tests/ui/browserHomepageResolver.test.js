import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import resolvers from '../../src/ui/views/browser/resolvers.js';

const ORIGINAL_WINDOW = globalThis.window;
const ORIGINAL_DOCUMENT = globalThis.document;

function buildHostMarkup({ id, dataAttr }) {
  const attribute = dataAttr ? ` data-widget-host="${dataAttr}"` : '';
  const identifier = id ? ` id="${id}"` : '';
  return `
    <section${id ? ` id="${id}-root"` : ''}>
      <div class="browser-home__widgets"${identifier}${attribute}>
        <template data-widget-template="todo">
          <section data-widget="todo" class="browser-widget"></section>
        </template>
        <template data-widget-template="apps">
          <section data-widget="apps" class="browser-widget"></section>
        </template>
        <template data-widget-template="bank">
          <section data-widget="bank" class="browser-widget"></section>
        </template>
      </div>
    </section>
  `;
}

test('homepageWidgets resolver persists layout order with host-specific storage keys', () => {
  const dom = new JSDOM(
    `
      <!doctype html>
      <html>
        <body>
          ${buildHostMarkup({ id: 'home-widgets' })}
          ${buildHostMarkup({ id: 'dashboard-widgets', dataAttr: 'dashboard' })}
        </body>
      </html>
    `,
    { url: 'https://example.test/' }
  );

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  try {
    const hostA = dom.window.document.getElementById('home-widgets-root');
    const hostB = dom.window.document.getElementById('dashboard-widgets-root');

    const first = resolvers.homepageWidgets(hostA);
    const second = resolvers.homepageWidgets(hostB);

    assert.ok(first?.layoutManager, 'first host should expose a layout manager');
    assert.ok(second?.layoutManager, 'second host should expose a layout manager');

    first.layoutManager.setLayoutOrder(['apps']);
    second.layoutManager.setLayoutOrder(['bank']);

    const storedKeys = [];
    for (let index = 0; index < dom.window.localStorage.length; index += 1) {
      storedKeys.push(dom.window.localStorage.key(index));
    }

    storedKeys.sort();

    assert.deepEqual(
      storedKeys,
      ['browser.widgets.layout.dashboard', 'browser.widgets.layout.home-widgets'],
      'each host should persist to a unique layout storage key'
    );

    const firstOrder = JSON.parse(dom.window.localStorage.getItem('browser.widgets.layout.home-widgets'));
    const secondOrder = JSON.parse(dom.window.localStorage.getItem('browser.widgets.layout.dashboard'));

    assert.deepEqual(
      firstOrder,
      ['apps', 'todo', 'bank'],
      'first host should persist the sanitized apps-first order'
    );
    assert.deepEqual(
      secondOrder,
      ['bank', 'todo', 'apps'],
      'second host should persist the sanitized bank-first order'
    );
  } finally {
    dom.window.localStorage.clear();
    dom.window.close();
    globalThis.window = ORIGINAL_WINDOW;
    globalThis.document = ORIGINAL_DOCUMENT;
  }
});

