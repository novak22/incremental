import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import browserView from '../../../../src/ui/views/browser/index.js';

test('browser view activation hides developer utilities', () => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div class="browser-shell" hidden aria-hidden="true"></div>
    <div id="developer-root"></div>
  </body></html>`);

  const { document } = dom.window;
  document.body.classList.add('developer-view-active');

  browserView.onActivate({ root: document });

  const developerRoot = document.getElementById('developer-root');
  assert.equal(developerRoot?.hasAttribute('hidden'), true);
  assert.equal(developerRoot?.getAttribute('aria-hidden'), 'true');
  assert.equal(document.body.classList.contains('developer-view-active'), false);

  const shell = document.querySelector('.browser-shell');
  assert.equal(shell?.hasAttribute('hidden'), false);
  assert.equal(shell?.hasAttribute('aria-hidden'), false);
});
