import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyEnrollmentActionModel } from '../../../src/ui/dashboard/knowledge.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';

const studyStub = {
  id: 'study:test',
  name: 'Focus Lab',
  description: 'Sharpen your skills quickly.',
  tag: { type: 'study' },
  action: {
    label: () => 'Enroll now',
    onClick: () => 'enroll',
    timeCost: 2,
    moneyCost: 150,
    disabled: () => false
  }
};

test('buildStudyEnrollmentActionModel surfaces active study hustles', () => {
  resetRegistry();
  loadRegistry({ hustles: [studyStub], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.baseTime = 6;
  state.bonusTime = 0;
  state.dailyBonusTime = 0;
  state.timeLeft = 4;
  state.money = 500;

  const model = buildStudyEnrollmentActionModel(state);
  assert.ok(model.entries.length > 0);
  const entry = model.entries.find(item => item.id === studyStub.id);
  assert.ok(entry, 'expected study hustle to be present');
  assert.equal(entry.buttonLabel, 'Enroll now');
  assert.ok(entry.meta.includes('tuition'));
  assert.ok(model.hoursAvailableLabel.includes('h'));
});
