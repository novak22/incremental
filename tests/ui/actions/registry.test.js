import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildActionQueue,
  registerActionProvider,
  clearActionProviders,
  normalizeActionEntries
} from '../../../src/ui/actions/registry.js';
import {
  registerQuickActionProvider,
  registerAssetUpgradeProvider
} from '../../../src/ui/dashboard/quickActions.js';
import { registerStudyEnrollmentProvider } from '../../../src/ui/dashboard/knowledge.js';
import { resetRegistry } from '../../../src/game/registryService.js';

function restoreDefaultProviders() {
  clearActionProviders();
  registerQuickActionProvider();
  registerAssetUpgradeProvider();
  registerStudyEnrollmentProvider();
}

test('action registry coordinates providers and auto-complete entries', async t => {
  await t.test('aggregates provider entries and metrics', () => {
    clearActionProviders();
    t.after(() => {
      restoreDefaultProviders();
    });

    registerActionProvider('test:hustle', () => ({
      id: 'test:hustle',
      focusCategory: 'hustle',
      entries: normalizeActionEntries([
        {
          id: 'alpha',
          title: 'Alpha Gig',
          durationHours: 2,
          payout: 80,
          payoutText: '$80'
        }
      ], { focusCategory: 'hustle' }),
      metrics: {
        hoursAvailable: 4
      }
    }));

    registerActionProvider('test:upgrade', () => ({
      id: 'test:upgrade',
      focusCategory: 'upgrade',
      entries: normalizeActionEntries([
        {
          id: 'beta',
          title: 'Beta Upgrade',
          durationHours: 1,
          moneyCost: 150
        }
      ], { focusCategory: 'upgrade' }),
      metrics: {
        moneyAvailable: 200,
        emptyMessage: 'Beta queue ready when you are.'
      }
    }));

    const queue = buildActionQueue({ state: {}, summary: {} });

    assert.equal(queue.entries.length, 2);
    const hustle = queue.entries.find(entry => entry.id === 'alpha');
    const upgrade = queue.entries.find(entry => entry.id === 'beta');
    assert.ok(hustle);
    assert.ok(upgrade);
    assert.equal(hustle.focusCategory, 'hustle');
    assert.equal(upgrade.focusCategory, 'upgrade');
    assert.equal(queue.hoursAvailable, 4);
    assert.equal(queue.hoursAvailableLabel, '4h');
    assert.equal(queue.moneyAvailable, 200);
    assert.equal(queue.emptyMessage, 'Beta queue ready when you are.');
  });

  await t.test('normalization helper preserves duration and meta', () => {
    clearActionProviders();
    t.after(() => {
      restoreDefaultProviders();
    });

    registerActionProvider('test:study', () => ({
      id: 'test:study',
      focusCategory: 'study',
      entries: normalizeActionEntries([
        {
          id: 'study-1',
          title: 'Deep Dive',
          timeCost: 1.5,
          moneyCost: 75
        }
      ], { focusCategory: 'study' }),
      metrics: {}
    }));

    const queue = buildActionQueue({ state: {}, summary: {} });
    assert.equal(queue.entries.length, 1);
    const entry = queue.entries[0];
    assert.equal(entry.focusCategory, 'study');
    assert.equal(entry.durationText, '1.5h');
    assert.equal(entry.moneyCost, 75);
    assert.ok(entry.meta.includes('1.5h'));
  });

  await t.test('auto-completed entries merge into queue model', () => {
    clearActionProviders();
    t.after(() => {
      restoreDefaultProviders();
    });

    registerActionProvider('test:auto', () => ({
      id: 'test:auto',
      focusCategory: 'hustle',
      entries: normalizeActionEntries([], { focusCategory: 'hustle' }),
      metrics: {}
    }));

    const summary = {
      timeBreakdown: [
        { key: 'maint', category: 'Maintenance', hours: 2, label: 'Workshop upkeep' },
        { key: 'study', category: 'Study', hours: 1, label: 'Night classes' },
        { key: 'other', category: 'Exploration', hours: 3, label: 'Doodles' }
      ]
    };

    const queue = buildActionQueue({ state: {}, summary });
    assert.ok(Array.isArray(queue.autoCompletedEntries));
    assert.equal(queue.autoCompletedEntries.length, 2);
    const ids = queue.autoCompletedEntries.map(entry => entry.id);
    assert.ok(ids.includes('auto:maint'));
    assert.ok(ids.includes('auto:study'));
    const upkeep = queue.autoCompletedEntries.find(entry => entry.id === 'auto:maint');
    assert.equal(upkeep.durationText, '2h');
  });

  await t.test('providers skip gracefully when registry data is unavailable', () => {
    clearActionProviders();
    resetRegistry();
    t.after(() => {
      restoreDefaultProviders();
      resetRegistry();
    });

    registerQuickActionProvider();
    registerAssetUpgradeProvider();
    registerStudyEnrollmentProvider();

    const queue = buildActionQueue({ state: {}, summary: {} });
    assert.ok(Array.isArray(queue.entries));
    assert.equal(queue.entries.length, 0);
  });
});
