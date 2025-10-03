import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initElementRegistry } from '../../../../src/ui/elements/registry.js';
import { SERVICE_PAGES } from '../../../../src/ui/views/browser/config.js';
import cardsPresenter, {
  APP_RENDERERS,
  getLatestServiceSummaries,
  subscribeToServiceSummaries
} from '../../../../src/ui/views/browser/cardsPresenter.js';

function setupDom() {
  const dom = new JSDOM(`
    <main>
      <div id="browser-workspaces"></div>
      <ul id="browser-site-list"></ul>
      <p id="browser-sites-note"></p>
      <button id="browser-add-site" type="button">Add workspace</button>
    </main>
  `);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  initElementRegistry(dom.window.document, {
    workspaceHost: root => root.getElementById('browser-workspaces'),
    siteList: root => root.getElementById('browser-site-list'),
    siteListNote: root => root.getElementById('browser-sites-note'),
    addSiteButton: root => root.getElementById('browser-add-site')
  });

  return dom;
}

test('cardsPresenter dispatches to app modules and publishes summaries', async t => {
  const dom = setupDom();
  const originalRenderers = [...APP_RENDERERS];
  t.after(() => {
    originalRenderers.forEach((renderer, index) => {
      APP_RENDERERS[index] = renderer;
    });
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  const registrySummary = { registries: { foo: [] }, models: { bar: {} } };
  const stubConfigs = [
    { id: 'aboutyou', meta: 'Profile ready' },
    { id: 'downwork', meta: 'Hustle ready' },
    { id: 'digishelf', meta: 'Shelf ready' },
    { id: 'serverhub', meta: 'Server ready' },
    { id: 'videotube', meta: 'Videos ready' },
    { id: 'shopily', meta: 'Shops ready' },
    { id: 'trends', meta: 'Trends ready' },
    { id: 'blogpress', meta: 'Blog ready' },
    { id: 'shopstack', meta: 'Upgrades ready' },
    { id: 'learnly', meta: 'Education ready' },
    { id: 'bankapp', meta: 'Bank ready' },
    { id: 'timodoro', meta: 'Productivity ready' }
  ];

  const callCounts = new Array(APP_RENDERERS.length).fill(0);
  APP_RENDERERS.forEach((_, index) => {
    APP_RENDERERS[index] = () => {
      callCounts[index] += 1;
      return stubConfigs[index];
    };
  });

  const notifications = [];
  const unsubscribe = subscribeToServiceSummaries(snapshot => {
    notifications.push(snapshot);
  });
  t.after(unsubscribe);

  cardsPresenter.renderAll(registrySummary);

  callCounts.forEach((count, index) => {
    assert.equal(count, 1, `expected renderer ${stubConfigs[index].id} to be invoked once`);
  });

  const renderNotificationCount = notifications.length;

  cardsPresenter.update(registrySummary);

  callCounts.forEach((count, index) => {
    assert.equal(count, 2, `expected renderer ${stubConfigs[index].id} to run during update`);
  });

  assert.ok(
    notifications.length > renderNotificationCount,
    'expected update to publish new service summaries'
  );

  const siteList = dom.window.document.getElementById('browser-site-list');
  const items = [...siteList.querySelectorAll('li')];
  assert.equal(
    items.length,
    SERVICE_PAGES.length + 1,
    'expected list items for each service page plus add button'
  );

  const latest = getLatestServiceSummaries();
  assert.equal(latest.length, stubConfigs.length, 'expected summaries from each renderer');
  const metaById = new Map(latest.map(entry => [entry.id, entry.meta]));
  stubConfigs.forEach(({ id, meta }) => {
    assert.equal(metaById.get(id), meta, `expected summary meta for ${id}`);
  });

  const updateNotificationCount = notifications.length;

  cardsPresenter.updateCard();
  callCounts.forEach((count, index) => {
    assert.equal(count, 3, `expected renderer ${stubConfigs[index].id} to re-run during updateCard`);
  });

  assert.ok(notifications.length > 0, 'expected service summary notifications');
  const lastNotification = notifications.at(-1);
  assert.equal(lastNotification.length, stubConfigs.length, 'notification includes all summaries');
  assert.ok(
    notifications.length > updateNotificationCount,
    'expected updateCard to publish refreshed service summaries'
  );
});
