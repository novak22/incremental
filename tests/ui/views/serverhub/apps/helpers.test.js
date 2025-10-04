import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import renderActionConsole from '../../../../../src/ui/views/browser/components/serverhub/views/apps/actionConsole.js';
import { renderNicheCell } from '../../../../../src/ui/views/browser/components/serverhub/views/apps/nicheSelector.js';
import { renderDetailPanel } from '../../../../../src/ui/views/browser/components/common/renderDetailPanel.js';

function withDom(callback) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const { document } = dom.window;
  const previousDocument = globalThis.document;
  globalThis.document = document;
  try {
    callback({ dom, document });
  } finally {
    if (previousDocument) {
      globalThis.document = previousDocument;
    } else {
      delete globalThis.document;
    }
    dom.window.close();
  }
}

test('action console disables unavailable actions and shows reason', () => {
  withDom(() => {
    let triggered = false;
    const instance = {
      id: 'app-1',
      actions: [
        { id: 'shipFeature', label: 'Scale Up', available: false, disabledReason: 'Needs upgrades', time: 2, cost: 100 }
      ],
      actionsById: {
        shipFeature: { id: 'shipFeature', label: 'Scale Up', available: false, disabledReason: 'Needs upgrades', time: 2, cost: 100 }
      }
    };
    const helpers = {
      actionConsoleOrder: [{ id: 'shipFeature', label: 'Scale Up' }],
      formatCurrency: value => `$${value}`,
      formatHours: value => `${value}h`,
      onQuickAction() {
        triggered = true;
      }
    };

    const section = renderActionConsole(instance, helpers);
    const button = section.querySelector('button.serverhub-action-console__button');
    assert.ok(button, 'expected button to render');
    assert.equal(button.disabled, true);
    assert.equal(button.title, 'Needs upgrades');

    button.click();
    assert.equal(triggered, false, 'click should be ignored when disabled');
  });
});

test('action console shows hint when no ordered actions are available', () => {
  withDom(() => {
    const instance = {
      id: 'app-1',
      actions: [],
      actionsById: {}
    };
    const helpers = {
      actionConsoleOrder: [{ id: 'missing', label: 'Missing' }],
      formatCurrency: value => `$${value}`,
      formatHours: value => `${value}h`,
      onQuickAction: () => {}
    };

    const section = renderActionConsole(instance, helpers);
    const hint = section.querySelector('.serverhub-panel__hint');
    assert.ok(hint, 'expected hint to render');
    assert.match(hint.textContent, /Quality actions unlock/);
  });
});

test('niche selector change triggers callback with selection', () => {
  withDom(({ dom }) => {
    const picked = [];
    const instance = {
      id: 'app-7',
      label: 'Test App',
      nicheOptions: [
        { id: 'n1', name: 'Creators', label: 'High' },
        { id: 'n2', name: 'Gamers', label: 'Medium' }
      ]
    };

    const fragment = renderNicheCell(instance, {
      onNicheSelect(appId, nicheId) {
        picked.push({ appId, nicheId });
      }
    });

    const container = dom.window.document.createElement('div');
    container.appendChild(fragment);
    const select = container.querySelector('select');
    assert.ok(select, 'expected select to render for unassigned niche');

    select.value = 'n2';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    assert.deepEqual(picked, [{ appId: 'app-7', nicheId: 'n2' }]);
  });
});

test('detail panel renders empty guidance when no app selected', () => {
  withDom(() => {
    const aside = renderDetailPanel({
      theme: {
        container: 'serverhub-sidebar',
        empty: 'serverhub-detail__empty'
      },
      isEmpty: true,
      emptyState: {
        title: 'Select an app',
        message: 'Select an app to inspect uptime, payouts, and quality progress.'
      }
    });

    const empty = aside.querySelector('.serverhub-detail__empty');
    assert.ok(empty, 'expected empty state to render');
    assert.match(empty.textContent, /Select an app/);
  });
});
