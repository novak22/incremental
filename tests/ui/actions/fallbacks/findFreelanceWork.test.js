import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables as findFreelanceTestables } from '../../../../src/ui/actions/fallbacks/findFreelanceWork.js';

const { isOfferDownworkAligned } = findFreelanceTestables;

test('isOfferDownworkAligned rejects study-aligned offers', () => {
  const template = {
    id: 'study-template',
    category: 'study',
    tag: { type: 'study' },
    progress: { type: 'study' },
    market: { category: 'study' }
  };
  const offer = {
    templateId: template.id,
    templateCategory: 'study',
    metadata: { templateCategory: 'study' }
  };

  assert.equal(isOfferDownworkAligned(offer, template), false);
});

test('isOfferDownworkAligned accepts hustle-aligned offers', () => {
  const template = {
    id: 'freelance-template',
    category: 'writing',
    tag: { type: 'instant' },
    progress: { type: 'instant' },
    market: { category: 'writing' }
  };
  const offer = {
    templateId: template.id,
    templateCategory: 'writing',
    metadata: { templateCategory: 'writing' }
  };

  assert.equal(isOfferDownworkAligned(offer, template), true);
});
