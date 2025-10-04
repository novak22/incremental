import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createActionSection from '../../../../../../../src/ui/views/browser/components/shopily/views/dashboard/actionsPanel.js';

test('createActionSection renders list and triggers handler', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  const runCalls = [];
  const section = createActionSection(
    {
      id: 'store-2',
      actions: [
        { id: 'optimize', label: 'Optimize listing', time: 2, cost: 50, available: true },
        { id: 'bundle', label: 'Bundle offer', time: 0, cost: 0, available: false, disabledReason: 'Requires tier 2' }
      ]
    },
    {
      formatHours: hours => `${hours}h`,
      formatCurrency: value => `$${value}`,
      onRunAction: (storeId, actionId) => runCalls.push([storeId, actionId])
    }
  );

  const items = [...section.querySelectorAll('.shopily-action')];
  assert.equal(items.length, 2, 'expected two rendered actions');
  const [first, second] = items;
  assert.match(first.textContent, /Optimize listing/);
  assert.match(first.textContent, /2h/);
  assert.match(first.textContent, /\$50/);
  assert.equal(second.querySelector('button').disabled, true, 'locked action is disabled');
  assert.equal(second.querySelector('button').title, 'Requires tier 2');

  const runButton = first.querySelector('button');
  runButton.click();
  assert.deepEqual(runCalls, [['store-2', 'optimize']]);

  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

test('createActionSection renders empty state when no actions', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  const fragment = createActionSection({ id: 'store-3', actions: [] });
  const note = fragment.querySelector('.shopily-panel__note');
  assert.ok(note, 'expected empty state note');
  assert.match(note.textContent, /No actions unlocked yet/);

  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
});
