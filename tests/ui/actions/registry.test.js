import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHours } from '../../../src/core/helpers.js';
import {
  buildActionQueue,
  registerActionProvider,
  clearActionProviders,
  normalizeActionEntries
} from '../../../src/ui/actions/registry.js';

test('registerActionProvider supplies normalized entries to the queue', () => {
  const restore = clearActionProviders();
  try {
    registerActionProvider(() => ({
      id: 'test-provider',
      focusCategory: 'hustle',
      entries: [
        {
          id: 'custom-entry',
          title: 'Custom Quest',
          timeCost: 2,
          payout: 40
        }
      ],
      metrics: {
        emptyMessage: 'custom empty',
        hoursAvailable: 2
      }
    }));

    const queue = buildActionQueue({ state: {} });
    assert.equal(queue.entries.length, 1);
    const entry = queue.entries[0];
    assert.equal(entry.durationHours, 2);
    assert.equal(entry.durationText, formatHours(2));
    assert.equal(entry.focusCategory, 'hustle');
    assert.equal(queue.emptyMessage, 'custom empty');
    assert.equal(queue.hoursAvailable, 2);
    assert.equal(queue.hoursAvailableLabel, formatHours(2));
  } finally {
    restore();
  }
});

test('clearActionProviders restore removes temporary providers', () => {
  const restore = clearActionProviders();
  try {
    registerActionProvider(() => ({
      id: 'temporary-provider',
      entries: [
        {
          id: 'temp-entry',
          title: 'Temporary Action',
          timeCost: 1
        }
      ],
      metrics: {}
    }));

    const queue = buildActionQueue({ state: {} });
    assert.ok(queue.entries.some(entry => entry.id === 'temp-entry'));
  } finally {
    restore();
  }

  const queueAfterRestore = buildActionQueue({ state: {} });
  assert.ok(!queueAfterRestore.entries.some(entry => entry.id === 'temp-entry'));
});

test('buildActionQueue merges auto-completed entries from the summary', () => {
  const restore = clearActionProviders();
  try {
    registerActionProvider(() => ({
      id: 'minimal-provider',
      entries: [],
      metrics: {}
    }));

    const summary = {
      timeBreakdown: [
        { category: 'Maintenance', hours: 1, label: 'Shop upkeep' },
        { category: 'Crafting', hours: 2 }
      ]
    };

    const queue = buildActionQueue({ state: { timeLeft: 3 }, summary });
    assert.equal(queue.entries.length, 0);
    assert.ok(Array.isArray(queue.autoCompletedEntries));
    assert.equal(queue.autoCompletedEntries.length, 1);
    const autoEntry = queue.autoCompletedEntries[0];
    assert.equal(autoEntry.durationHours, 1);
    assert.equal(autoEntry.durationText, formatHours(1));
    assert.equal(autoEntry.title, 'Shop upkeep');
  } finally {
    restore();
  }
});

test('normalizeActionEntries mirrors todo normalization rules', () => {
  const entries = normalizeActionEntries([
    { id: 'direct', timeCost: 3, payout: 90 }
  ]);
  assert.equal(entries.length, 1);
  const [entry] = entries;
  assert.equal(entry.durationText, formatHours(3));
  assert.equal(entry.moneyPerHour, 30);
});
