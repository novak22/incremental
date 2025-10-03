import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

test('browser notifications panel toggles visibility from header shortcut', async () => {
  ensureTestDom();

  const { initLayoutControls } = await import('../../src/ui/layout/index.js');
  initLayoutControls();

  const notificationsPresenter = await import('../../src/ui/views/browser/notificationsPresenter.js');
  notificationsPresenter.default.render({ allEntries: [] });

  const trigger = document.getElementById('browser-notifications-button');
  const panel = document.getElementById('browser-notifications-panel');

  assert.ok(trigger, 'expected notifications trigger');
  assert.ok(panel, 'expected notifications panel');
  assert.equal(panel.hidden, true);

  trigger.click();
  assert.equal(panel.hidden, false);

  document.body.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(panel.hidden, true);
});
