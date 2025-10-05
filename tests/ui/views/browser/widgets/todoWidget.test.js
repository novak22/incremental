import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { applyFocusOrdering } from '../../../../../src/ui/views/browser/widgets/todoWidget.js';
import {
  getFocusModeConfig,
  getFocusBucketComparator,
  hasFocusBucket,
  registerFocusBucket
} from '../../../../../src/ui/actions/focusBuckets.js';

describe('todoWidget focus ordering', () => {
  describe('provider-defined buckets', () => {
    let hadStudyBucket;
    let originalStudyComparator;
    let originalMoneyConfig;
    let originalUpgradeConfig;
    let originalBalancedConfig;

    beforeEach(() => {
      hadStudyBucket = hasFocusBucket('study');
      originalStudyComparator = hadStudyBucket ? getFocusBucketComparator('study') : null;
      originalMoneyConfig = getFocusModeConfig('money');
      originalUpgradeConfig = getFocusModeConfig('upgrades');
      originalBalancedConfig = getFocusModeConfig('balanced');
    });

    afterEach(() => {
      registerFocusBucket({
        name: 'study',
        comparator: hadStudyBucket ? originalStudyComparator : null,
        modes: {
          money: originalMoneyConfig,
          upgrades: originalUpgradeConfig,
          balanced: originalBalancedConfig
        }
      });
    });

    it('orders custom buckets based on configuration priorities', () => {
      registerFocusBucket({
        name: 'study',
        comparator: entries => [...entries].sort((a, b) => {
          const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : Infinity;
          const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : Infinity;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return (a?.id || '').localeCompare(b?.id || '');
        }),
        modes: {
          money: { order: ['hustle', 'study', 'upgrade'] },
          upgrades: { order: ['upgrade', 'study', 'hustle'] },
          balanced: {
            order: ['upgrade', 'study', 'hustle'],
            interleave: ['upgrade', 'study', 'hustle']
          }
        }
      });

      const entries = [
        { id: 'upgrade-slow', focusCategory: 'upgrade', upgradeRemaining: 5, durationHours: 1 },
        { id: 'hustle-low', focusCategory: 'hustle', moneyPerHour: 15, payout: 30, durationHours: 2 },
        { id: 'study-b', focusCategory: 'study', orderIndex: 2 },
        { id: 'hustle-high', focusCategory: 'hustle', moneyPerHour: 40, payout: 40, durationHours: 1 },
        { id: 'study-a', focusCategory: 'study', orderIndex: 1 },
        { id: 'upgrade-fast', focusCategory: 'upgrade', upgradeRemaining: 1, durationHours: 2 },
        { id: 'misc-task' }
      ];

      const moneyOrdered = applyFocusOrdering(entries, 'money');
      assert.deepEqual(
        moneyOrdered.map(entry => entry.id),
        ['hustle-high', 'hustle-low', 'study-a', 'study-b', 'upgrade-fast', 'upgrade-slow', 'misc-task']
      );

      const upgradeOrdered = applyFocusOrdering(entries, 'upgrades');
      assert.deepEqual(
        upgradeOrdered.map(entry => entry.id),
        ['upgrade-fast', 'upgrade-slow', 'study-a', 'study-b', 'hustle-high', 'hustle-low', 'misc-task']
      );

      const balancedOrdered = applyFocusOrdering(entries, 'balanced');
      assert.deepEqual(
        balancedOrdered.map(entry => entry.id),
        ['upgrade-fast', 'hustle-high', 'study-a', 'hustle-low', 'upgrade-slow', 'study-b', 'misc-task']
      );
    });

    it('honours explicit focus buckets supplied by providers', () => {
      const entries = [
        { id: 'general-task' },
        {
          id: 'bucketed-hustle',
          focusBucket: 'hustle',
          moneyPerHour: 80,
          payout: 80,
          durationHours: 1
        },
        { id: 'upgrade-item', focusCategory: 'upgrade', upgradeRemaining: 1, durationHours: 1 }
      ];

      const ordered = applyFocusOrdering(entries, 'balanced');
      assert.deepEqual(
        ordered.map(entry => entry.id),
        ['upgrade-item', 'bucketed-hustle', 'general-task']
      );
    });
  });
});

