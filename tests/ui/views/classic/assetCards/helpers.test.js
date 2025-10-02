import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeQualityAvailability } from '../../../../../src/ui/views/classic/assetCards/qualityActions.js';
import { getNicheHintText } from '../../../../../src/ui/views/classic/assetCards/nicheAssignments.js';

test('summarizeQualityAvailability prefers explicit summary text', () => {
  const availability = { summary: 'Ready for a milestone splash.' };
  assert.equal(
    summarizeQualityAvailability(availability),
    'Ready for a milestone splash.'
  );
});

test('summarizeQualityAvailability falls back to default encouragement', () => {
  assert.equal(
    summarizeQualityAvailability(null),
    'Trigger quick actions to build quality momentum.'
  );
});

test('getNicheHintText uses the current niche popularity summary first', () => {
  const info = { popularity: { summary: 'High demand in travel vlogs.' } };
  const summaries = [{ popularity: { summary: 'Fallback summary' } }];
  assert.equal(getNicheHintText(info, summaries), 'High demand in travel vlogs.');
});

test('getNicheHintText falls back to first available summary', () => {
  const info = {};
  const summaries = [{ popularity: { summary: 'Trending among artists.' } }];
  assert.equal(getNicheHintText(info, summaries), 'Trending among artists.');
});

test('getNicheHintText encourages specialization when already assigned', () => {
  const info = { definition: { id: 'photography' } };
  const summaries = [];
  assert.equal(
    getNicheHintText(info, summaries),
    'Boosting demand with a specialty audience.'
  );
});

test('getNicheHintText provides default guidance when no data is available', () => {
  assert.equal(
    getNicheHintText({}, []),
    'Pick a niche to sync with daily demand.'
  );
});
