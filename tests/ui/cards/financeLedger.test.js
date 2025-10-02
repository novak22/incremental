import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInflowLedger, buildOutflowLedger } from '../../../src/ui/cards/model/finance/ledger.js';

test('buildInflowLedger groups income streams with totals', () => {
  const summary = {
    earningsBreakdown: [
      { label: 'Workshops', amount: 80, source: { count: 2, name: 'gig' } }
    ],
    passiveBreakdown: [
      { label: 'Shop', amount: 50 },
      { label: 'Offline Sales', amount: 25, stream: 'offline' }
    ]
  };

  const ledger = buildInflowLedger(summary);
  assert.equal(ledger.length, 3, 'expected three groups');

  const active = ledger.find(group => group.id === 'active');
  assert.equal(active.total, 80);
  assert.equal(active.entries[0].note, '2 gigs');

  const offline = ledger.find(group => group.id === 'offline');
  assert.equal(offline.total, 25);
});

test('buildOutflowLedger categorises spend buckets', () => {
  const summary = {
    spendBreakdown: [
      { label: 'Repairs', category: 'maintenance', amount: 15.6 },
      { label: 'Tuition', key: 'study:tuition', amount: 12 },
      { label: 'Snacks', category: 'consumable', amount: 3 }
    ]
  };

  const ledger = buildOutflowLedger(summary);
  const maintenance = ledger.find(group => group.id === 'maintenance');
  assert.equal(maintenance.total, 15.6);

  const tuition = ledger.find(group => group.id === 'tuition');
  assert.equal(tuition.entries.length, 1);
  assert.equal(tuition.entries[0].label, 'Tuition');
});
