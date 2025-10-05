import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMaintenanceSummary } from '../../src/game/assets/maintenance.js';

test('formatMaintenanceSummary returns readable text for upkeep values', () => {
  const definition = { maintenance: { hours: 1.5, cost: 12 } };
  const summary = formatMaintenanceSummary(definition);

  assert.equal(summary.hours, 1.5);
  assert.equal(summary.cost, 12);
  assert.deepEqual(summary.parts, ['1.5h/day', '$12/day']);
  assert.equal(summary.text, '1.5h/day • $12/day');
  assert.equal(summary.detailText, '1.5h/day + $12/day');
  assert.equal(summary.hasUpkeep, true);
});

test('formatMaintenanceSummary indicates when upkeep is not required', () => {
  const definition = { maintenance: { hours: 0, cost: null } };
  const summary = formatMaintenanceSummary(definition);

  assert.equal(summary.hours, 0);
  assert.equal(summary.cost, 0);
  assert.deepEqual(summary.parts, []);
  assert.equal(summary.text, '');
  assert.equal(summary.detailText, '');
  assert.equal(summary.hasUpkeep, false);
});
