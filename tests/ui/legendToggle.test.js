import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

test('timeline legend toggle hides legend and collapses the header', async () => {
  ensureTestDom();

  const { initLayoutControls } = await import('../../src/ui/layout.js');
  initLayoutControls();

  const toggle = document.getElementById('time-legend-toggle');
  const legend = document.getElementById('time-legend');
  const header = document.querySelector('.dashboard-header');

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(legend.hidden, true);
  assert.ok(header.classList.contains('legend-collapsed'));

  toggle.click();

  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(legend.hidden, false);
  assert.ok(!header.classList.contains('legend-collapsed'));

  toggle.click();

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(legend.hidden, true);
  assert.ok(header.classList.contains('legend-collapsed'));
});
