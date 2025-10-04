import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  buildRequirementList,
  createDetailCta,
  describeStatus,
  getRequirementEntries
} from '../../../../../../src/ui/views/browser/components/shopstack/detail/index.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.com' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  return dom;
}

function teardownDom(dom) {
  dom.window.close();
  delete global.window;
  delete global.document;
  delete global.HTMLElement;
  delete global.Node;
}

test('describeStatus flags purchased and ready upgrades distinctly', () => {
  const purchased = describeStatus({ purchased: true });
  assert.equal(purchased.tone, 'owned');
  assert.equal(purchased.label, 'Owned');

  const ready = describeStatus({ ready: true, affordable: true });
  assert.equal(ready.tone, 'ready');
  assert.equal(ready.label, 'Ready to buy');
});

test('getRequirementEntries maps definitions to html labels and met flags', () => {
  const dom = setupDom();
  try {
    const definitionMap = new Map([
      ['focusFeature', { name: 'Focus Feature' }]
    ]);

    const entries = getRequirementEntries(
      {
        requirements: [
          { type: 'upgrade', id: 'focusFeature' },
          {
            type: 'custom',
            detail: 'Requires: <strong>2 Workbenches</strong>',
            met: () => true
          }
        ]
      },
      { definitionMap }
    );

    assert.equal(entries.length, 2);
    assert.equal(entries[0].html, 'Requires: <strong>Focus Feature</strong>');
    assert.equal(entries[0].met, false);
    assert.equal(entries[1].html, 'Requires: <strong>2 Workbenches</strong>');
    assert.equal(entries[1].met, true);

    const list = buildRequirementList(entries);
    const items = [...list.querySelectorAll('li')];
    assert.equal(items.length, 2);
    assert.ok(!items[0].classList.contains('is-met'));
    assert.ok(items[1].classList.contains('is-met'));
  } finally {
    teardownDom(dom);
  }
});

test('createDetailCta disables the button when not ready to purchase', () => {
  const dom = setupDom();
  try {
    const owned = createDetailCta({ status: { tone: 'owned' } });
    assert.equal(owned.disabled, true);
    assert.equal(owned.textContent, 'Owned and active');

    const ready = createDetailCta({ status: { tone: 'ready' }, onClick: () => {} });
    assert.equal(ready.disabled, false);
    assert.equal(ready.textContent, 'Buy now');

    const locked = createDetailCta({ status: { tone: 'locked' } });
    assert.equal(locked.disabled, true);
    assert.equal(locked.textContent, 'Locked');
  } finally {
    teardownDom(dom);
  }
});
