import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import resolvers from '../../src/ui/views/browser/resolvers.js';

test('browserNotifications resolver finds alternate notification markup', () => {
  const dom = new JSDOM(`
    <header>
      <div data-role="notifications" class="notifications">
        <button id="notifications-button" data-role="notifications-button" class="notifications__trigger"></button>
        <span id="notifications-badge" data-role="notifications-badge" class="notifications__badge"></span>
        <div id="notifications-dropdown" data-role="notifications-panel" class="notifications__panel">
          <p id="notifications-empty" data-role="notifications-empty" class="notifications__empty"></p>
          <ul id="notifications-list" data-role="notifications-list" class="notifications__list"></ul>
          <button id="notifications-mark-all" data-role="notifications-mark-all"></button>
        </div>
      </div>
    </header>
  `);

  const root = dom.window.document;
  const refs = resolvers.browserNotifications(root);

  assert.ok(refs, 'expected resolver to return refs');
  assert.equal(refs.container?.getAttribute('data-role'), 'notifications');
  assert.equal(refs.button?.id, 'notifications-button');
  assert.equal(refs.panel?.id, 'notifications-dropdown');
  assert.equal(refs.list?.id, 'notifications-list');
  assert.equal(refs.empty?.id, 'notifications-empty');
  assert.equal(refs.badge?.id, 'notifications-badge');
  assert.equal(refs.markAll?.id, 'notifications-mark-all');
});
