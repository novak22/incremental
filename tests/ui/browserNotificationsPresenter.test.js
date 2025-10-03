import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initElementRegistry } from '../../src/ui/elements/registry.js';

const resolvers = {
  browserNotifications: root => {
    const container = root.querySelector('[data-role="browser-notifications"]');
    if (!container) return null;
    return {
      container,
      button: container.querySelector('#browser-notifications-button'),
      panel: container.querySelector('#browser-notifications-panel'),
      list: container.querySelector('#browser-notifications-list'),
      empty: container.querySelector('#browser-notifications-empty'),
      badge: container.querySelector('#browser-notifications-badge'),
      markAll: container.querySelector('#browser-notifications-mark-all')
    };
  }
};

test('notifications presenter hides panel once markup becomes available', async () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><body>
      <div data-role="browser-notifications">
        <button id="browser-notifications-button" aria-expanded="true"></button>
      </div>
    </body>`,
    { url: 'https://example.com' }
  );

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.HTMLElement = window.HTMLElement;
  global.requestAnimationFrame = window.requestAnimationFrame ?? (cb => setTimeout(cb, 16));
  global.cancelAnimationFrame = window.cancelAnimationFrame ?? clearTimeout;

  initElementRegistry(window.document, resolvers);

  const presenterModule = await import('../../src/ui/views/browser/notificationsPresenter.js');
  const presenter = presenterModule.default;

  presenter.render({ allEntries: [] });

  const container = window.document.querySelector('[data-role="browser-notifications"]');
  container.insertAdjacentHTML(
    'beforeend',
    `
      <div id="browser-notifications-panel" hidden></div>
      <ol id="browser-notifications-list"></ol>
      <p id="browser-notifications-empty"></p>
      <span id="browser-notifications-badge"></span>
      <button id="browser-notifications-mark-all"></button>
    `
  );

  const panel = window.document.getElementById('browser-notifications-panel');
  const trigger = window.document.getElementById('browser-notifications-button');
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');

  initElementRegistry(window.document, resolvers);

  presenter.render({ allEntries: [] });

  assert.equal(panel.hidden, true);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('hustle log entries are treated as read notifications', async () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><body>
      <div data-role="browser-notifications">
        <button id="browser-notifications-button" aria-expanded="false"></button>
        <div id="browser-notifications-panel" hidden></div>
        <ol id="browser-notifications-list"></ol>
        <p id="browser-notifications-empty" hidden></p>
        <span id="browser-notifications-badge"></span>
        <button id="browser-notifications-mark-all"></button>
      </div>
    </body>`,
    { url: 'https://example.com' }
  );

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.HTMLElement = window.HTMLElement;
  global.requestAnimationFrame = window.requestAnimationFrame ?? (cb => setTimeout(cb, 16));
  global.cancelAnimationFrame = window.cancelAnimationFrame ?? clearTimeout;

  initElementRegistry(window.document, resolvers);

  const presenterModule = await import('../../src/ui/views/browser/notificationsPresenter.js');
  const presenter = presenterModule.default;

  const entries = [
    {
      id: 'log:hustle',
      message: 'Hustle payout landed.',
      type: 'hustle',
      read: false,
      timeLabel: 'Now'
    }
  ];

  presenter.render({ allEntries: entries, emptyMessage: 'Nothing to see here.' });

  const list = window.document.getElementById('browser-notifications-list');
  const badge = window.document.getElementById('browser-notifications-badge');
  const empty = window.document.getElementById('browser-notifications-empty');

  assert.equal(entries[0].read, true);
  assert.equal(list.hidden, true);
  assert.equal(list.childElementCount, 0);
  assert.equal(badge.hidden, true);
  assert.equal(badge.textContent, '0');
  assert.equal(empty.hidden, false);
  assert.equal(empty.textContent, 'Nothing to see here.');
});
