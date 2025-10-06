import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionQueue } from '../../../src/ui/actions/registry.js';
import { buildTodoGrouping, collectBuckets } from '../../../src/ui/actions/taskGrouping.js';
import { buildQuickActionModel } from '../../../src/ui/dashboard/quickActions.js';
import { buildTimodoroViewModel } from '../../../src/ui/views/browser/apps/timodoro/model.js';

const baseState = {
  baseTime: 6,
  bonusTime: 2,
  dailyBonusTime: 1,
  timeLeft: 4,
  money: 150,
  day: 8
};

const summarySnapshot = {
  totalTime: 3,
  totalEarnings: 120,
  activeEarnings: 90,
  passiveEarnings: 30,
  maintenanceHours: 1
};

test('queue metrics remain consistent across widgets and workspaces', () => {
  const queue = buildActionQueue({ state: baseState, summary: summarySnapshot });
  const quickActions = buildQuickActionModel(baseState);

  const todoGrouping = buildTodoGrouping(queue.entries, {
    availableHours: queue.hoursAvailable,
    availableMoney: queue.moneyAvailable,
    emptyMessage: queue.emptyMessage
  });

  const todoModel = {
    ...todoGrouping,
    hoursAvailable: queue.hoursAvailable,
    hoursAvailableLabel: queue.hoursAvailableLabel,
    hoursSpent: queue.hoursSpent,
    hoursSpentLabel: queue.hoursSpentLabel,
    moneyAvailable: queue.moneyAvailable
  };

  const timodoro = buildTimodoroViewModel(baseState, summarySnapshot, todoModel);

  assert.equal(queue.hoursAvailable, quickActions.hoursAvailable);
  assert.equal(queue.hoursAvailableLabel, quickActions.hoursAvailableLabel);
  assert.equal(queue.hoursSpent, quickActions.hoursSpent);
  assert.equal(queue.hoursSpentLabel, quickActions.hoursSpentLabel);
  assert.equal(queue.moneyAvailable, quickActions.moneyAvailable);

  assert.equal(queue.hoursAvailable, timodoro.todoHoursAvailable);
  assert.equal(queue.hoursAvailableLabel, timodoro.hoursAvailableLabel);
  assert.equal(queue.hoursSpentLabel, timodoro.hoursSpentLabel);
  assert.equal(queue.moneyAvailable, timodoro.todoMoneyAvailable);
});

test('queue bucket collection normalizes study and maintenance aliases', () => {
  const entries = [
    { id: 'study-entry', focusBucket: 'Education' },
    { id: 'maintenance-entry', focusCategory: 'Maintenance' }
  ];

  const buckets = collectBuckets(entries);
  const studyEntries = buckets.get('study') || [];
  const commitmentEntries = buckets.get('commitment') || [];

  assert.equal(studyEntries.length, 1);
  assert.equal(studyEntries[0].id, 'study-entry');

  assert.equal(commitmentEntries.length, 1);
  assert.equal(commitmentEntries[0].id, 'maintenance-entry');
});
