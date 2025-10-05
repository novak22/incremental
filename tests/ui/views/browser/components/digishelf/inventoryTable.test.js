import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import renderInventoryTable from '../../../../../../src/ui/views/browser/components/digishelf/inventoryTable.js';
import {
  registerActionProvider,
  clearActionProviders
} from '../../../../../../src/ui/actions/providers.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousHTMLElement = global.HTMLElement;
  const previousNode = global.Node;

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;

  return () => {
    dom.window.close();
    if (previousWindow) {
      global.window = previousWindow;
    } else {
      delete global.window;
    }
    if (previousDocument) {
      global.document = previousDocument;
    } else {
      delete global.document;
    }
    if (previousHTMLElement) {
      global.HTMLElement = previousHTMLElement;
    } else {
      delete global.HTMLElement;
    }
    if (previousNode) {
      global.Node = previousNode;
    } else {
      delete global.Node;
    }
  };
}

test('inventory table highlights registry quick actions for stock galleries', () => {
  const restoreProviders = clearActionProviders();
  const restoreDom = setupDom();
  try {
    registerActionProvider(() => ({
      id: 'asset-upgrades',
      focusCategory: 'upgrade',
      entries: [
        {
          id: 'asset-upgrade:stockPhotos:stock-1:batchEdit:progress',
          title: 'Gallery A · Upload Batch',
          buttonLabel: 'Upload Batch',
          timeCost: 2,
          onClick: () => {}
        },
        {
          id: 'asset-upgrade:stockPhotos:stock-1:planShoot:shots',
          title: 'Gallery A · Plan Shoot',
          buttonLabel: 'Launch Gallery',
          timeCost: 1,
          onClick: () => {}
        }
      ],
      metrics: {}
    }));

    const table = renderInventoryTable({
      instances: [
        {
          id: 'stock-1',
          label: 'Gallery A',
          status: { id: 'active', label: 'Active' },
          progress: { shoots: 5, editing: 3 },
          latestPayout: 120,
          averagePayout: 110,
          qualityRange: { min: 90, max: 150 },
          maintenance: { parts: [] },
          maintenanceFunded: true,
          actions: [
            { id: 'planShoot', label: 'Plan Shoot', available: true, disabledReason: '' },
            { id: 'batchEdit', label: 'Batch Edit', available: true, disabledReason: '' }
          ]
        }
      ],
      type: 'stockPhotos',
      state: {},
      formatters: {
        formatCurrency: value => `$${value}`,
        formatHours: value => `${value}h`
      },
      quickActions: { stockPhotos: ['planShoot', 'batchEdit'] },
      handlers: {
        onSelectInstance: () => {},
        onRunQuickAction: () => {}
      }
    });

    const buttons = table.querySelectorAll('.digishelf-actions .digishelf-button');
    assert.ok(buttons.length >= 2);
    assert.equal(buttons[0].textContent, 'Upload Batch');
    assert.equal(buttons[1].textContent, 'Launch Gallery');
  } finally {
    restoreProviders();
    restoreDom();
  }
});
