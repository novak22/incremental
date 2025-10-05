import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureTestDom } from '../../../../helpers/setupDom.js';
import {
  createCommitmentTimeline,
  describeDeadlineLabel
} from '../../../../../src/ui/views/browser/components/commitmentMeters.js';

test('describeDeadlineLabel treats anything due in a day or less as due today', () => {
  assert.equal(describeDeadlineLabel({ remainingDays: 1 }), 'Due today');
  assert.equal(describeDeadlineLabel({ remainingDays: 0 }), 'Due today');
  assert.equal(describeDeadlineLabel({ remainingDays: 0.25 }), 'Due today');
});

test('describeDeadlineLabel adds a friendly overdue message for past deadlines', () => {
  assert.equal(
    describeDeadlineLabel({ remainingDays: -0.5 }),
    'Running a little late (1 day overdue)'
  );
  assert.equal(
    describeDeadlineLabel({ remainingDays: -2.1 }),
    'Running a little late (3 days overdue)'
  );
});

test('commitment timeline renders the updated deadline label', () => {
  ensureTestDom();
  const timeline = createCommitmentTimeline(
    { remainingDays: 1 },
    { showHours: false, showDeadline: true }
  );

  assert.ok(timeline, 'timeline should render when deadline information is present');
  const label = timeline.querySelector('.commitment-meter__label');
  assert.ok(label, 'timeline should include a label element');
  assert.equal(label.textContent, 'Due today');
});
