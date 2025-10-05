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
  const { buildEventLogModel } = await import('../../src/ui/dashboard/notificationsModel.js');
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

test('shell-tab notification opens layout panel and closes dropdown', async () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><body>
      <div data-role="browser-notifications">
        <button id="browser-notifications-button" aria-expanded="false"></button>
        <div id="browser-notifications-panel" hidden>
          <ol id="browser-notifications-list"></ol>
          <p id="browser-notifications-empty"></p>
          <span id="browser-notifications-badge"></span>
          <button id="browser-notifications-mark-all"></button>
        </div>
      </div>
      <nav data-role="shell-navigation">
        <button id="tab-upgrades" aria-controls="panel-upgrades"></button>
        <section id="panel-upgrades" hidden></section>
      </nav>
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

  const shellTab = window.document.getElementById('tab-upgrades');
  const shellPanel = window.document.getElementById('panel-upgrades');
  let activated = 0;
  shellTab.addEventListener('click', () => {
    activated += 1;
    shellPanel.hidden = false;
  });

  initElementRegistry(window.document, {
    browserNotifications: resolvers.browserNotifications,
    shellNavigation: root => ({
      shellTabs: [root.getElementById('tab-upgrades')],
      panels: [root.getElementById('panel-upgrades')]
    })
  });

  const presenterModule = await import('../../src/ui/views/browser/notificationsPresenter.js');
  const presenter = presenterModule.default;
  presenter.render({ allEntries: [] });

  const entry = {
    id: 'notification:upgrades',
    message: 'Upgrade available now.',
    type: 'info',
    read: false,
    action: { type: 'shell-tab', tabId: 'tab-upgrades' }
  };

  presenter.render({ allEntries: [entry] });

  const trigger = window.document.getElementById('browser-notifications-button');
  const dropdown = window.document.getElementById('browser-notifications-panel');
  trigger.click();
  assert.equal(dropdown.hidden, false);

  const button = window.document.querySelector('.browser-notifications__item');
  assert.ok(button, 'expected notification entry to render');

  button.click();

  assert.equal(activated, 1, 'expected shell tab to activate once');
  assert.equal(shellPanel.hidden, false, 'expected shell panel to become visible');
  assert.equal(dropdown.hidden, true, 'expected notifications dropdown to close');
});
