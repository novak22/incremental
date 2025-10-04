import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHeroMetrics } from '../../../../../../../src/ui/views/browser/components/shopily/views/dashboard/hero.js';

test('mapHeroMetrics formats values and tones', () => {
  const formatters = {
    formatCurrency: value => `$${value.toFixed(2)}`,
    formatSignedCurrency: value => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(0)}`
  };
  const metrics = {
    totalStores: 3,
    dailySales: 1250.5,
    dailyUpkeep: 200,
    netDaily: 1050.5
  };

  const items = mapHeroMetrics(metrics, formatters);

  assert.equal(items.length, 4, 'expected four hero metrics');
  const byId = Object.fromEntries(items.map(item => [item.id, item]));
  assert.deepEqual(byId.totalStores, {
    id: 'totalStores',
    label: 'Total Stores',
    value: 3,
    note: 'Active & in setup',
    tone: 'neutral'
  });
  assert.equal(byId.dailySales.value, '$1250.50');
  assert.equal(byId.dailySales.tone, 'positive');
  assert.equal(byId.dailyUpkeep.tone, 'negative', 'upkeep is reported as a negative tone');
  assert.equal(byId.netDaily.value, '+$1051');
  assert.equal(byId.netDaily.tone, 'positive');
});

