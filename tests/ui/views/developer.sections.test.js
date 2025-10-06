import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { renderOverview } from '../../../src/ui/views/developer/overview.js';
import { renderEvents } from '../../../src/ui/views/developer/events.js';
import { renderTimeBuffs } from '../../../src/ui/views/developer/time.js';
import { renderStateDump } from '../../../src/ui/views/developer/stateDump.js';
import { renderUpgradeBuffs, REGISTRY_FALLBACK_MESSAGE } from '../../../src/ui/views/developer/upgrades.js';
import { initializeState } from '../../../src/core/state.js';
import { resetRegistry } from '../../../src/game/registryService.js';

function createContainer(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const { document } = dom.window;
  return { dom, document, container: document.getElementById('developer-root') };
}

test('renderOverview fills key summary fields', t => {
  const { dom, document, container } = createContainer(`
    <div id="developer-root">
      <dl>
        <dd data-dev-field="day"></dd>
        <dd data-dev-field="money"></dd>
        <dd data-dev-field="time"></dd>
        <dd data-dev-field="assets"></dd>
        <dd data-dev-field="events"></dd>
        <dd data-dev-field="updated"></dd>
      </dl>
    </div>
  `);

  const state = {
    day: 3,
    money: 15250,
    timeLeft: 13,
    assets: {
      blog: { instances: [{ status: 'active' }, { status: 'pending' }] },
      vlog: { instances: [{ status: 'active' }] }
    },
    events: { active: [{}, {}] }
  };

  renderOverview(container, state);

  assert.equal(document.querySelector('[data-dev-field="day"]').textContent, 'Day 3');
  assert.equal(document.querySelector('[data-dev-field="money"]').textContent, '$15,250');
  assert.equal(document.querySelector('[data-dev-field="time"]').textContent, '13h');
  assert.equal(document.querySelector('[data-dev-field="assets"]').textContent, '2');
  assert.equal(document.querySelector('[data-dev-field="events"]').textContent, '2');
  assert.ok(document.querySelector('[data-dev-field="updated"]').textContent.length > 0);

  t.after(() => dom.window.close());
});

test('renderEvents sorts by impact and toggles empty message', t => {
  const { dom, document, container } = createContainer(`
    <div id="developer-root">
      <p id="developer-events-empty" hidden>No live events.</p>
      <table><tbody id="developer-events-body"></tbody></table>
    </div>
  `);

  const state = {
    events: {
      active: [
        { label: 'Minor buzz', currentPercent: 0.1, remainingDays: 1, totalDays: 3, tone: 'positive' },
        { label: 'Major slump', currentPercent: -0.45, remainingDays: 2, totalDays: 5, tone: 'negative' }
      ]
    }
  };

  renderEvents(container, state);

  const rows = [...document.querySelectorAll('#developer-events-body tr')];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children[0].textContent, 'Major slump');
  assert.equal(document.getElementById('developer-events-empty').hidden, true);

  t.after(() => dom.window.close());
});

test('renderTimeBuffs formats hour values cleanly', t => {
  const { dom, document, container } = createContainer(`
    <div id="developer-root">
      <span data-dev-field="baseTime"></span>
      <span data-dev-field="bonusTime"></span>
      <span data-dev-field="dailyBonus"></span>
    </div>
  `);

  renderTimeBuffs(container, { baseTime: 10, bonusTime: 1.5, dailyBonusTime: 0 });

  assert.equal(document.querySelector('[data-dev-field="baseTime"]').textContent, '10h');
  assert.equal(document.querySelector('[data-dev-field="bonusTime"]').textContent, '1.5h');
  assert.equal(document.querySelector('[data-dev-field="dailyBonus"]').textContent, '0h');

  t.after(() => dom.window.close());
});

test('renderStateDump prints a readable snapshot', t => {
  const { dom, document, container } = createContainer(`
    <div id="developer-root">
      <pre id="developer-state-json"></pre>
    </div>
  `);

  const state = { foo: 'bar', nested: { value: 3 } };
  renderStateDump(container, state);

  assert.equal(document.getElementById('developer-state-json').textContent.trim(), JSON.stringify(state, null, 2));

  t.after(() => dom.window.close());
});

test('renderUpgradeBuffs falls back while registry warms up', t => {
  resetRegistry();
  initializeState();

  const { dom, document, container } = createContainer(`
    <div id="developer-root">
      <p id="developer-upgrades-empty" hidden>No upgrade boosts purchased.</p>
      <ul id="developer-upgrade-list"></ul>
    </div>
  `);

  renderUpgradeBuffs(container, {});

  const emptyNote = document.getElementById('developer-upgrades-empty');
  assert.equal(emptyNote.hidden, false);
  assert.equal(emptyNote.textContent, REGISTRY_FALLBACK_MESSAGE);
  assert.equal(document.getElementById('developer-upgrade-list').children.length, 0);

  t.after(() => {
    dom.window.close();
    resetRegistry();
  });
});
