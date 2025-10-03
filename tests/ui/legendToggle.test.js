import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

test('notifications panel toggles visibility from browser chrome', async () => {
  ensureTestDom();

  const notificationsPresenter = await import('../../src/ui/views/browser/notificationsPresenter.js');
  const sampleEntry = {
    id: 'test-entry',
    message: 'Sample alert',
    read: false,
    type: 'info',
    timeLabel: 'moments ago'
  };

  notificationsPresenter.default.render({ allEntries: [sampleEntry], emptyMessage: '' });

  const button = document.getElementById('browser-notifications-button');
  const panel = document.getElementById('browser-notifications-panel');

  assert.ok(button, 'expected notifications trigger button');
  assert.ok(panel, 'expected notifications panel');
  assert.equal(panel.hidden, true);

  button.click();
  assert.equal(panel.hidden, false);

  button.click();
  assert.equal(panel.hidden, true);
});
