import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

test('renderCards hydrates registry when service is empty', { concurrency: false }, async t => {
  ensureTestDom();
  const registryService = await import('../../src/game/registryService.js');
  const updateModule = await import('../../src/ui/update.js');
  const storageModule = await import('../../src/core/storage.js');

  registryService.resetRegistry();
  global.localStorage?.clear?.();
  storageModule.loadState();

  updateModule.renderCards();

  const hustleList = document.querySelector('[data-role="browser-hustle-list"]');
  assert.ok(hustleList?.children.length > 0, 'expected hustle cards after fallback registry load');

  t.after(() => {
    registryService.resetRegistry();
  });
});

test('browser view update flow routes through cards presenter and renders workspace', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  harness.resetState();

  const updateModule = await import('../../src/ui/update.js');
  const layoutModule = await import('../../src/ui/layout/index.js');
  const browserModule = await import('../../src/ui/views/browser/index.js');

  layoutModule.initLayoutControls();
  const presenter = browserModule.default.presenters.cards;
  const renderCalls = [];
  const updateCalls = [];
  const originalRenderAll = presenter.renderAll;
  const originalUpdate = presenter.update;

  presenter.renderAll = (payload, options) => {
    renderCalls.push({ payload, options });
    return originalRenderAll(payload, options);
  };
  presenter.update = (payload, options) => {
    updateCalls.push({ payload, options });
    return originalUpdate(payload, options);
  };

  t.after(() => {
    presenter.renderAll = originalRenderAll;
    presenter.update = originalUpdate;
  });

  updateModule.renderCards();
  updateModule.updateUI();

  assert.ok(renderCalls.length > 0, 'expected browser cards presenter to handle initial render');
  assert.ok(updateCalls.length > 0, 'expected browser cards presenter to handle updates');

  const workspaceHost = document.getElementById('browser-workspaces');
  assert.ok(workspaceHost, 'expected workspace host to exist');
  const pages = workspaceHost.querySelectorAll('[data-browser-page]');
  assert.ok(pages.length > 0, 'expected workspace pages to render');
});
