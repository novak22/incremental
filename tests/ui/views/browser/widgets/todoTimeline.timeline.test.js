import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTimelineCompletedEntries } from '../../../../../src/ui/views/browser/apps/timodoro/model.js';
import { createSegments } from '../../../../../src/ui/views/browser/widgets/todoTimeline.js';

const DAY_START_HOUR = 8;

describe('timodoro timeline sequencing', () => {
  it('orders recorded completions by sequence and derives in-game offsets', () => {
    const recordedCompletions = [
      {
        id: 'late-session',
        title: 'Late session',
        durationHours: 1,
        count: 2,
        sequence: 5,
        durationText: '1h reps',
        completedAt: 5
      },
      {
        id: 'early-session',
        title: 'Early session',
        durationHours: 0.5,
        count: 1,
        sequence: 2,
        durationText: '30m push',
        completedAt: 1000
      }
    ];

    const timeline = buildTimelineCompletedEntries({}, { completedEntries: recordedCompletions });

    assert.deepEqual(
      timeline.map(entry => entry.id),
      ['early-session', 'late-session'],
      'sequence drives ordering instead of timestamps'
    );

    assert.deepEqual(
      timeline.map(entry => entry.sequence),
      [2, 5],
      'retains provided sequences'
    );

    assert.equal(timeline[0].startedAtHours, 0);
    assert.equal(timeline[0].durationMinutes, 30);
    assert.equal(timeline[1].startedAtHours, 0.5);
    assert.equal(timeline[1].durationMinutes, 120);

    assert.ok(!Object.prototype.hasOwnProperty.call(timeline[0], 'completedAt'), 'timeline data no longer exposes wall-clock timestamps');
  });

  it('creates segments using in-game offsets without wall-clock timing', () => {
    const recordedCompletions = [
      {
        id: 'contract-a',
        title: 'Contract A',
        durationHours: 1,
        count: 1,
        sequence: 11,
        durationText: '1h focus'
      },
      {
        id: 'contract-b',
        title: 'Contract B',
        durationHours: 0.5,
        count: 1,
        sequence: 12,
        durationText: '30m polish'
      }
    ];

    const timeline = buildTimelineCompletedEntries({}, { completedEntries: recordedCompletions });
    const segments = createSegments({ completed: timeline, pending: [], hoursSpent: null });
    const pastSegments = segments.filter(segment => segment.state === 'past' && !segment.isBuffer);

    assert.equal(pastSegments.length, 2, 'renders a segment per completion block');

    const firstSegment = pastSegments[0];
    const secondSegment = pastSegments[1];

    assert.equal(firstSegment.id, 'contract-a');
    assert.equal(firstSegment.start, DAY_START_HOUR);
    assert.equal(firstSegment.end, DAY_START_HOUR + 1);

    assert.equal(secondSegment.id, 'contract-b');
    assert.equal(secondSegment.start, DAY_START_HOUR + 1);
    assert.equal(secondSegment.end, DAY_START_HOUR + 1.5);

    assert.equal(
      secondSegment.start - DAY_START_HOUR,
      timeline[1].startedAtHours,
      'segment start mirrors the in-game offset'
    );
  });
});
