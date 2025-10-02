import test from 'node:test';
import assert from 'node:assert/strict';
import { buildObligations } from '../../../src/ui/cards/model/finance/obligations.js';

function createState() {
  return {
    assets: {
      studio: {
        instances: [
          { id: 'studio-1', status: 'active', maintenanceFundedToday: false, pendingIncome: 0 },
          { id: 'studio-2', status: 'inactive' }
        ]
      }
    },
    education: {
      'course-1': { enrolled: true, completed: false, studiedToday: false, totalDays: 8, daysCompleted: 2 }
    }
  };
}

test('buildObligations summarises upkeep, payroll, and tuition', () => {
  const state = createState();
  const assets = [
    { id: 'studio', name: 'Studio', maintenance: { cost: 12 } }
  ];
  const courses = [
    { id: 'course-1', name: 'Story', days: 8, tuition: 40, hoursPerDay: 2, summary: 'Learn to narrate' }
  ];

  const obligations = buildObligations(state, assets, courses, {
    getAssetState: id => state.assets[id],
    instanceLabel: (definition, index) => `${definition.name} #${index + 1}`,
    getAssistantCount: () => 2,
    getAssistantDailyCost: () => 30,
    resolveTrack: definition => ({ ...definition, id: definition.id }),
    getKnowledgeProgress: id => state.education[id],
    buildSkillRewards: () => ({ xp: 15, skills: [{ name: 'Focus' }] })
  });

  assert.equal(obligations.entries.length, 3);

  const upkeep = obligations.entries.find(entry => entry.id === 'upkeep');
  assert.equal(upkeep.amount, 12);
  assert.equal(upkeep.items.length, 1);

  const payroll = obligations.entries.find(entry => entry.id === 'payroll');
  assert.equal(payroll.amount, 30);

  const tuition = obligations.entries.find(entry => entry.id === 'tuition');
  assert.equal(tuition.amount, 40);
  assert.equal(tuition.items[0].bonus.includes('Focus'), true);

  assert.equal(obligations.quick.id, 'tuition');
});
