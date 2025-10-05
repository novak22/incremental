import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  applyFocusOrdering,
  focusBucketComparators,
  focusOrdering
} from '../../../../../src/ui/views/browser/widgets/todoWidget.js';

describe('todoWidget focus ordering', () => {
  describe('provider-defined buckets', () => {
    let originalStudyComparator;
    let originalMoneyOrder;
    let originalUpgradeOrder;
    let originalBalancedOrder;
    let originalBalancedInterleave;

    beforeEach(() => {
      originalStudyComparator = focusBucketComparators.study;
      originalMoneyOrder = [...(focusOrdering.money.order || [])];
      originalUpgradeOrder = [...(focusOrdering.upgrades.order || [])];
      originalBalancedOrder = [...(focusOrdering.balanced.order || [])];
      originalBalancedInterleave = Array.isArray(focusOrdering.balanced.interleave)
        ? [...focusOrdering.balanced.interleave]
        : [];
    });

    afterEach(() => {
      if (typeof originalStudyComparator === 'function') {
        focusBucketComparators.study = originalStudyComparator;
      } else {
        delete focusBucketComparators.study;
      }
      focusOrdering.money.order = [...originalMoneyOrder];
      focusOrdering.upgrades.order = [...originalUpgradeOrder];
      focusOrdering.balanced.order = [...originalBalancedOrder];
      focusOrdering.balanced.interleave = [...originalBalancedInterleave];
    });

    it('orders custom buckets based on configuration priorities', () => {
      focusBucketComparators.study = entries => [...entries].sort((a, b) => {
        const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : Infinity;
        const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : Infinity;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a?.id || '').localeCompare(b?.id || '');
      });

      focusOrdering.money.order = ['hustle', 'study', 'upgrade'];
      focusOrdering.upgrades.order = ['upgrade', 'study', 'hustle'];
      focusOrdering.balanced.order = ['upgrade', 'study', 'hustle'];
      focusOrdering.balanced.interleave = ['upgrade', 'study', 'hustle'];

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
  });
});

