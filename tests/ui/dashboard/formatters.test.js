import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeEntries, formatPayoutEntries } from '../../../src/ui/dashboard/formatters.js';

const sampleSummary = {
  timeBreakdown: [
    { key: 'queue-1', label: 'Prototype sprint', hours: 2 }
  ]
};

const samplePayouts = [
  {
    key: 'asset:rig:payout',
    label: '💰 Rig payout',
    amount: 220,
    category: 'passive',
    stream: 'passive',
    source: { type: 'asset', name: 'Analytics Rig', count: 2 }
  }
];

test('formatTimeEntries adds today suffix and hour formatting', () => {
  const entries = formatTimeEntries(sampleSummary);
  assert.equal(entries.length, 1);
  const [entry] = entries;
  assert.equal(entry.key, 'queue-1');
  assert.ok(entry.value.endsWith('today'));
  assert.ok(entry.value.startsWith('2'));
});

test('formatPayoutEntries decorates asset payout labels with counts', () => {
  const entries = formatPayoutEntries(samplePayouts);
  assert.equal(entries.length, 1);
  const [entry] = entries;
  assert.ok(entry.label.includes('Analytics Rig (2)'));
  assert.ok(entry.value.includes('today'));
});
