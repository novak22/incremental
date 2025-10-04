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

test('notifications badge ignores auto-read log types', async () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><body>
      <div data-role="browser-notifications">
        <button id="browser-notifications-button" aria-expanded="false"></button>
        <div id="browser-notifications-panel" hidden></div>
        <ol id="browser-notifications-list"></ol>
        <p id="browser-notifications-empty"></p>
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

  const stateModule = await import('../../src/core/state.js');
  const logModule = await import('../../src/core/log.js');
  const { buildEventLogModel } = await import('../../src/ui/dashboard/model.js');
  const presenterModule = await import('../../src/ui/views/browser/notificationsPresenter.js');
  const presenter = presenterModule.default;

  stateModule.initializeState();

  logModule.addLog('Queued a routine hustle.', 'hustle');
  logModule.addLog('Asset polishing complete.', 'quality');
  logModule.addLog('Funds dipped under upkeep budget.', 'warning');

  const model = buildEventLogModel(stateModule.getState());
  presenter.render(model);

  const badge = window.document.getElementById('browser-notifications-badge');
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '1');

  const listItems = window.document.querySelectorAll('#browser-notifications-list li');
  assert.equal(listItems.length, 1);
  assert.match(listItems[0].textContent, /Funds dipped under upkeep budget./);

  const unreadEntries = stateModule.getState().log.filter(entry => entry.read !== true);
  assert.equal(unreadEntries.length, 1);
  assert.equal(unreadEntries[0].type, 'warning');
});
