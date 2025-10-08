import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HUSTLE_TEMPLATES } from '../../../../src/game/hustles.js';
import { offerMatchesHustleGroup } from '../../../../src/ui/actions/fallbacks/findFreelanceWork.js';

describe('findFreelanceWork hustle filtering', () => {
  it('accepts offers whose focus bucket maps into the hustle task group', () => {
    const offer = { focusBucket: 'project' };
    assert.equal(offerMatchesHustleGroup(offer), true);
  });

  it('accepts real hustle offers even when their market category is specific', () => {
    const freelanceTemplate = HUSTLE_TEMPLATES.find(template => template?.id === 'freelance');
    assert.ok(freelanceTemplate, 'freelance template should exist for hustle filtering tests');

    const offer = {
      templateId: freelanceTemplate.id,
      definitionId: freelanceTemplate.id,
      templateCategory: 'writing',
      metadata: { templateCategory: 'writing' }
    };

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

  it('rejects knowledge study track offers', () => {
    const studyTemplate = HUSTLE_TEMPLATES.find(template => template?.category === 'study');
    assert.ok(studyTemplate, 'study track template should exist for hustle filtering tests');

    const offer = {
      templateId: studyTemplate.id,
      definitionId: studyTemplate.id,
      templateCategory: 'study',
      metadata: { templateCategory: 'study' }
    };

    assert.equal(offerMatchesHustleGroup(offer), false);
  });
});
