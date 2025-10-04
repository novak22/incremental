import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import mapStoreTable, {
  mapTableRows
} from '../../../../../../../src/ui/views/browser/components/shopily/views/dashboard/tableMappers.js';

test('mapTableRows decorates instances with formatted cells and actions', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  const instances = [
    {
      id: 'store-1',
      label: 'Glow Boutique',
      niche: { name: 'Skincare', delta: 0.12, multiplier: 1.3 },
      latestPayout: 420,
      maintenanceCost: 75,
      roi: 1.8
    }
  ];
  const events = [];
  const formatters = {
    formatCurrency: value => `$${value}`,
    formatPercent: value => `${Math.round(value * 100)}%`
  };
  const handlers = {
    onSelectStore: id => events.push(['select', id]),
    onShowUpgradesForStore: id => events.push(['upgrades', id])
  };
  const rows = mapTableRows(instances, { selectedStoreId: 'store-1' }, { formatters, handlers });

  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.id, 'store-1');
  assert.equal(row.isSelected, true);
  const nameCell = row.cells.find(cell => cell.content?.className === 'shopily-table__link');
  assert.ok(nameCell, 'expected name cell to render a button');

  const nicheCell = row.cells.find(cell => cell.content?.className === 'shopily-niche');
  assert.ok(nicheCell, 'expected niche cell');
  assert.match(nicheCell.content.textContent, /Skincare/);
  assert.match(nicheCell.content.textContent, /⬆️/);

  assert.deepEqual(
    row.actions.map(action => action.id),
    ['upgrade', 'details'],
    'expected upgrade and details actions'
  );

  row.actions.forEach(action => action.onSelect('store-1'));
  assert.deepEqual(events, [
    ['upgrades', 'store-1'],
    ['select', 'store-1']
  ]);

  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
});

test('mapStoreTable wires selection handler and empty state', () => {
  const table = mapStoreTable([], { selectedStoreId: null }, { handlers: { onSelectStore: () => {} } });
  assert.equal(table.emptyState.message.includes('No stores yet'), true);
  assert.equal(typeof table.onSelect, 'function');
});
