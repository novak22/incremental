import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveStudyTrackId } from '../../../src/ui/actions/studyTracks.js';

test('resolveStudyTrackId prioritizes explicit studyTrackId values', () => {
  const trackId = resolveStudyTrackId({ studyTrackId: 'writing' });
  assert.equal(trackId, 'writing');
});

test('resolveStudyTrackId falls back to trackId fields and trims whitespace', () => {
  const trackId = resolveStudyTrackId({ trackId: '  design  ' });
  assert.equal(trackId, 'design');
});

test('resolveStudyTrackId reads metadata fields and strips prefixes', () => {
  const progress = {
    metadata: {
      definitionId: 'study-analytics'
    }
  };
  const trackId = resolveStudyTrackId(progress);
  assert.equal(trackId, 'analytics');
});

test('resolveStudyTrackId inspects nested progress metadata', () => {
  const entry = {
    progress: {
      metadata: {
        studyTrackId: 'focus'
      }
    }
  };
  const trackId = resolveStudyTrackId(entry);
  assert.equal(trackId, 'focus');
});

test('resolveStudyTrackId uses definition identifiers when prefixed', () => {
  const entry = {
    definitionId: 'study-research',
    progress: {
      definitionId: 'study-ignore'
    }
  };
  const trackId = resolveStudyTrackId(entry);
  assert.equal(trackId, 'research');
});

test('resolveStudyTrackId returns null when no identifiers are present', () => {
  assert.equal(resolveStudyTrackId({ metadata: { label: 'Nope' } }), null);
});
