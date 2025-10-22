import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineModel } from '../../../src/ui/views/browser/widgets/todoTimeline.js';

function toHourString(hour) {
  return hour.toFixed(4).replace(/0+$/u, '').replace(/\.$/u, '');
}

test('completed segments anchor to their completion hour when timestamps exist', () => {
  const completedEntries = [
    {
      id: 'focus-block-1',
      title: 'Draft edits',
      durationHours: 1,
      durationText: '1h',
      completedAt: new Date('2024-05-15T09:15:00Z').getTime()
    },
    {
      id: 'focus-block-2',
      title: 'Client follow-up',
      durationHours: 0.5,
      durationText: '30m',
      completedAt: new Date('2024-05-15T12:00:00Z').getTime()
    }
  ];

  const model = buildTimelineModel({
    completedEntries,
    pendingEntries: [],
    now: new Date('2024-05-15T14:00:00Z')
  });

  const segments = model.segments.filter(segment => segment.state === 'past' && !segment.isBuffer);
  assert.equal(segments.length, 2, 'timeline renders two completed segments');

  const [morningSegment, afternoonSegment] = segments;

  assert.ok(Math.abs(morningSegment.start - 8.25) < 1e-6, `first segment start expected 8.25h, received ${toHourString(morningSegment.start)}`);
  assert.ok(Math.abs(morningSegment.end - 9.25) < 1e-6, `first segment end expected 9.25h, received ${toHourString(morningSegment.end)}`);
  const morningStartPercent = ((morningSegment.start - 8) / 16) * 100;
  assert.ok(
    Math.abs(morningSegment.startPercent - morningStartPercent) < 1e-6,
    `first segment offset percent expected ${morningStartPercent.toFixed(6)}%, received ${morningSegment.startPercent.toFixed(6)}%`
  );

  assert.ok(Math.abs(afternoonSegment.start - 11.5) < 1e-6, `second segment start expected 11.5h, received ${toHourString(afternoonSegment.start)}`);
  assert.ok(Math.abs(afternoonSegment.end - 12) < 1e-6, `second segment end expected 12h, received ${toHourString(afternoonSegment.end)}`);
  const afternoonStartPercent = ((afternoonSegment.start - 8) / 16) * 100;
  assert.ok(
    Math.abs(afternoonSegment.startPercent - afternoonStartPercent) < 1e-6,
    `second segment offset percent expected ${afternoonStartPercent.toFixed(6)}%, received ${afternoonSegment.startPercent.toFixed(6)}%`
  );
});

test('completed segments fall back to sequential placement when timestamps are missing', () => {
  const completedEntries = [
    {
      id: 'focus-block-a',
      title: 'Morning planning',
      durationHours: 1
    },
    {
      id: 'focus-block-b',
      title: 'Daily review',
      durationHours: 0.5
    }
  ];

  const model = buildTimelineModel({
    completedEntries,
    pendingEntries: [],
    now: new Date('2024-05-15T10:00:00Z')
  });

  const segments = model.segments.filter(segment => segment.state === 'past' && !segment.isBuffer);
  assert.equal(segments.length, 2, 'sequential fallback produces two segments');

  assert.ok(Math.abs(segments[0].start - 8) < 1e-6, `expected first fallback start at 8h, received ${toHourString(segments[0].start)}`);
  assert.ok(Math.abs(segments[0].end - 9) < 1e-6, `expected first fallback end at 9h, received ${toHourString(segments[0].end)}`);
  assert.ok(Math.abs(segments[1].start - 9) < 1e-6, `expected second fallback start at 9h, received ${toHourString(segments[1].start)}`);
  assert.ok(Math.abs(segments[1].end - 9.5) < 1e-6, `expected second fallback end at 9.5h, received ${toHourString(segments[1].end)}`);
});
