import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { renderDeveloperView } from '../../../src/ui/views/developer/render.js';
import { initializeState } from '../../../src/core/state.js';
import { resetRegistry } from '../../../src/game/registryService.js';

function createDeveloperHtml() {
  return `<!DOCTYPE html>
<html>
  <body>
    <div id="developer-root">
      <section>
        <p id="developer-upgrades-empty" hidden>No upgrade boosts purchased.</p>
        <ul id="developer-upgrade-list"></ul>
      </section>
      <pre id="developer-state-json"></pre>
    </div>
  </body>
</html>`;
}

test('developer upgrade panel shows a friendly fallback while registry loads', t => {
  resetRegistry();
  initializeState();

  const dom = new JSDOM(createDeveloperHtml());
  const { document } = dom.window;

  t.after(() => {
    dom.window.close();
    resetRegistry();
  });

  renderDeveloperView(document);

  const emptyNote = document.getElementById('developer-upgrades-empty');
  assert.ok(emptyNote, 'expected the fallback element to exist');
  assert.equal(emptyNote.hidden, false);
  assert.equal(
    emptyNote.textContent,
    'Upgrade registry is still stretching awake—peek back in a blink!'
  );
  assert.equal(document.getElementById('developer-upgrade-list').children.length, 0);
});
