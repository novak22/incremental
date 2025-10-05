import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  applyFocusOrdering,
  buildTodoGrouping,
  groupEntriesByTaskGroup,
  TASK_GROUP_CONFIGS
} from '../../../../../src/ui/actions/taskGrouping.js';
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

  describe('shared task grouping', () => {
    it('organizes entries into configured buckets for downstream views', () => {
      const entries = [
        { id: 'hustle-a', focusCategory: 'hustle' },
        { id: 'upgrade-a', focusCategory: 'upgrade' },
        { id: 'education-a', focusCategory: 'education' },
        { id: 'support-a', focusCategory: 'assist' }
      ];

      const groups = groupEntriesByTaskGroup(entries);

      const configKeys = TASK_GROUP_CONFIGS.map(config => config.key);
      assert.deepEqual(Object.keys(groups), configKeys, 'all configured groups should be present');
      assert.deepEqual(
        groups.hustle.map(entry => entry.id),
        ['hustle-a'],
        'hustle entries remain grouped together'
      );
      assert.deepEqual(
        groups.upgrade.map(entry => entry.id),
        ['upgrade-a'],
        'upgrade entries remain grouped together'
      );
      assert.deepEqual(
        groups.study.map(entry => entry.id),
        ['education-a'],
        'education aliases map into the study bucket'
      );
      assert.deepEqual(
        groups.other.map(entry => entry.id),
        ['support-a'],
        'assist entries fall back to the catch-all group'
      );
    });

    it('filters entries using shared availability and completion rules', () => {
      const entries = [
        { id: 'hustle-ready', focusCategory: 'hustle', durationHours: 2, remainingRuns: 1 },
        { id: 'hustle-too-long', focusCategory: 'hustle', durationHours: 5 },
        { id: 'upgrade-complete', focusCategory: 'upgrade', durationHours: 1, remainingRuns: 1 }
      ];

      const completions = new Map([
        ['upgrade-complete', { count: 1 }]
      ]);

      const grouping = buildTodoGrouping(entries, {
        availableHours: 3,
        getCompletion: entry => completions.get(entry.id) || null,
        getRemainingRuns: (entry, completion) => {
          if (entry.remainingRuns == null) {
            return null;
          }
          const total = Number(entry.remainingRuns);
          const used = Number(completion?.count);
          const consumed = Number.isFinite(used) ? Math.max(0, used) : 0;
          return Math.max(0, total - consumed);
        },
        emptyMessage: 'No hustle queued.'
      });

      assert.equal(grouping.totalPending, 1, 'only affordable, unfinished entries remain');
      assert.equal(grouping.entries[0].id, 'hustle-ready', 'retains valid hustle entry');
      assert.equal(grouping.groups.hustle.length, 1, 'groups pending hustle entries');
      assert.equal(grouping.emptyMessage, 'No hustle queued.', 'honours provided empty message');
    });
  });
});

