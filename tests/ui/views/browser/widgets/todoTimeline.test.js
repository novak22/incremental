import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatHourLabel } from '../../../../../src/ui/views/browser/widgets/todoTimeline.js';

describe('todoTimeline formatHourLabel', () => {
  it('rounds up to the next hour when rounding minutes to sixty', () => {
    assert.equal(formatHourLabel(19.9999), '20:00');
  });

  it('wraps around midnight when incrementing past the day boundary', () => {
    assert.equal(formatHourLabel(-0.0001), '00:00');
    assert.equal(formatHourLabel(23.9999), '00:00');
  });

  it('formats standard times with padded minutes', () => {
    assert.equal(formatHourLabel(8.5), '08:30');
    assert.equal(formatHourLabel(0), '00:00');
  });
});
