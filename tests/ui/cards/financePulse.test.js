import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPulseSummary, computeTopEarner } from '../../../src/ui/cards/model/finance/pulse.js';

test('buildPulseSummary highlights major cash movements', () => {
  const summary = {
    activeEarnings: 42.235,
    passiveEarnings: 85.755,
    passiveBreakdown: [
      { stream: 'offline', amount: 25.2 },
      { stream: 'passive', amount: 60.555 }
    ],
    upkeepSpend: 11.4,
    totalSpend: 55,
    spendBreakdown: [
      { key: 'study:tuition', amount: 18.2 },
      { category: 'investment', amount: 20 }
    ]
  };

  const entries = buildPulseSummary(summary);
  const labels = entries.map(entry => entry.id);
  assert.deepEqual(labels, ['active', 'passive', 'offline', 'upkeep', 'tuition', 'investments']);

  const passive = entries.find(entry => entry.id === 'passive');
  assert.equal(passive.amount, 60.56);

  const tuition = entries.find(entry => entry.id === 'tuition');
  assert.equal(tuition.amount, 18.2);
});

test('computeTopEarner returns the strongest performer', () => {
  const summary = {
    earningsBreakdown: [
      { label: 'Workshops', amount: 90 },
      { label: 'Tips', amount: 15 }
    ],
    passiveBreakdown: [
      { label: 'Channel', amount: 125, stream: 'passive' }
    ]
  };

  const top = computeTopEarner(summary);
  assert.equal(top.label, 'Channel');
  assert.equal(top.amount, 125);
  assert.equal(top.stream, 'passive');
});
