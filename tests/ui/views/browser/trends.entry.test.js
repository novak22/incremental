import test from 'node:test';
import assert from 'node:assert/strict';
import { render as renderTrends } from '../../../../src/ui/views/browser/components/trends.js';

test('trends render returns default summary without a mount node', () => {
  const result = renderTrends({}, {});
  assert.deepEqual(result, { meta: 'Trend scan ready' });
});
