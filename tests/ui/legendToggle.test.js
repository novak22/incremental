import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

test('event log panel toggles visibility from dashboard shortcut', async () => {
  ensureTestDom();

  const { initLayoutControls } = await import('../../src/ui/layout/index.js');
  initLayoutControls();

  const trigger = document.getElementById('open-event-log');
  const panel = document.getElementById('event-log-panel');

  assert.ok(trigger, 'expected event log trigger');
  assert.ok(panel, 'expected event log panel');
  assert.equal(panel.hidden, true);

  trigger.click();
  assert.equal(panel.hidden, false);

  const close = document.getElementById('event-log-close');
  close.click();
  assert.equal(panel.hidden, true);
});
