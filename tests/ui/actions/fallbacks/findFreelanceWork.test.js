import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { offerMatchesHustleGroup } from '../../../../src/ui/actions/fallbacks/findFreelanceWork.js';

describe('findFreelanceWork hustle filtering', () => {
  it('accepts offers whose focus bucket maps into the hustle task group', () => {
    const offer = { focusBucket: 'project' };
    assert.equal(offerMatchesHustleGroup(offer), true);
  });

  it('rejects offers that declare non-hustle categories', () => {
    const offer = { templateCategory: 'study' };
    assert.equal(offerMatchesHustleGroup(offer), false);
  });

  it('rejects offers without a recognizable task group', () => {
    const offer = { templateCategory: 'unknown-category' };
    assert.equal(offerMatchesHustleGroup(offer), false);
  });
});
