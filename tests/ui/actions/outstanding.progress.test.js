import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultState } from '../../../src/core/state.js';
import { ensureSlice, resolveInstanceProgressSnapshot } from '../../../src/core/state/slices/actions/index.js';
import { collectOutstandingActionEntries } from '../../../src/ui/actions/outstanding.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';
import { KNOWLEDGE_HUSTLES, rollDailyOffers, acceptHustleOffer } from '../../../src/game/hustles.js';

function createTestDefinition() {
  return {
    id: 'test-hustle',
    name: 'Test Hustle',
    category: 'hustle',
    progress: {
      type: 'scheduled',
      completion: 'manual',
      hoursPerDay: 3,
      daysRequired: 4,
      hoursRequired: 12
    }
  };
}

test('outstanding entries mirror normalized progress snapshots', () => {
  resetRegistry();
  const definition = createTestDefinition();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 10;
  state.hustleMarket = { offers: [], accepted: [] };

  state.actions = state.actions || {};
  state.actions[definition.id] = {
    instances: [
      {
        id: 'instance-1',
        accepted: true,
        status: 'active',
        definitionId: definition.id,
        acceptedOnDay: state.day - 2,
        hoursRequired: 12,
        hoursLogged: 6,
        progress: {
          type: 'scheduled',
          hoursPerDay: 3,
          daysRequired: 4,
          daysCompleted: 2,
          hoursLogged: 6,
          lastWorkedDay: state.day - 1
        }
      }
    ]
  };

  ensureSlice(state);

  const normalizedInstance = state.actions[definition.id].instances[0];
  const snapshot = resolveInstanceProgressSnapshot(normalizedInstance);
  const [entry] = collectOutstandingActionEntries(state);

  assert.ok(entry, 'expected outstanding entry for the normalized instance');
  assert.equal(entry.instanceId, normalizedInstance.id);
  assert.equal(entry.definitionId, definition.id);

  const progress = entry.progress;
  assert.equal(progress.definitionId, definition.id);
  assert.equal(progress.instanceId, normalizedInstance.id);
  assert.equal(progress.hoursLogged, snapshot.hoursLogged);
  assert.equal(progress.hoursRequired, snapshot.hoursRequired);
  assert.equal(progress.hoursRemaining, snapshot.hoursRemaining);
  assert.equal(progress.hoursPerDay, snapshot.hoursPerDay);
  assert.equal(progress.daysCompleted, snapshot.daysCompleted);
  assert.equal(progress.daysRequired, snapshot.daysRequired);
  assert.equal(progress.completion, snapshot.completionMode || snapshot.completion);
  assert.equal(progress.percentComplete, snapshot.percentComplete);
  assert.equal(progress.lastWorkedDay, snapshot.lastWorkedDay);
});

test('outstanding entries stay in sync after progress updates', () => {
  resetRegistry();
  const definition = createTestDefinition();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 12;
  state.hustleMarket = { offers: [], accepted: [] };

  state.actions = state.actions || {};
  state.actions[definition.id] = {
    instances: [
      {
        id: 'instance-2',
        accepted: true,
        status: 'active',
        definitionId: definition.id,
        acceptedOnDay: state.day - 3,
        hoursRequired: 12,
        hoursLogged: 4,
        progress: {
          type: 'scheduled',
          hoursPerDay: 3,
          daysRequired: 4,
          daysCompleted: 1,
          hoursLogged: 4,
          lastWorkedDay: state.day - 1
        }
      }
    ]
  };

  ensureSlice(state);

  const normalizedInstance = state.actions[definition.id].instances[0];
  normalizedInstance.hoursLogged = 9;
  normalizedInstance.progress.hoursLogged = 9;
  normalizedInstance.progress.daysCompleted = 3;
  normalizedInstance.progress.lastWorkedDay = state.day;

  const snapshot = resolveInstanceProgressSnapshot(normalizedInstance);
  const [entry] = collectOutstandingActionEntries(state);

  assert.ok(entry, 'expected outstanding entry after progress change');
  const progress = entry.progress;
  assert.equal(progress.hoursLogged, snapshot.hoursLogged);
  assert.equal(progress.hoursRemaining, snapshot.hoursRemaining);
  assert.equal(progress.daysCompleted, snapshot.daysCompleted);
  assert.equal(progress.completion, snapshot.completionMode || snapshot.completion);
  assert.equal(progress.percentComplete, snapshot.percentComplete);
  assert.equal(progress.lastWorkedDay, snapshot.lastWorkedDay);
});

test('outstanding entries react to accepted metadata for payouts and deadlines', () => {
  resetRegistry();
  const definition = createTestDefinition();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 18;

  const offer = {
    id: 'offer-1',
    definitionId: definition.id,
    templateId: 'template-1',
    metadata: {
      payoutSchedule: 'daily',
      payoutAmount: 40,
      progress: {
        hoursPerDay: 2,
        daysRequired: 5
      }
    },
    expiresOnDay: state.day + 5
  };

  const accepted = {
    id: 'accepted-1',
    offerId: offer.id,
    instanceId: 'instance-3',
    definitionId: definition.id,
    templateId: offer.templateId,
    deadlineDay: state.day + 3,
    metadata: {
      completionMode: 'manual',
      progress: {
        completion: 'manual',
        hoursPerDay: 2,
        daysRequired: 5
      }
    },
    payout: {
      amount: 60,
      schedule: 'weekly'
    }
  };

  state.hustleMarket = {
    offers: [offer],
    accepted: [accepted]
  };

  state.actions = state.actions || {};
  state.actions[definition.id] = {
    instances: [
      {
        id: 'instance-3',
        accepted: true,
        status: 'active',
        definitionId: definition.id,
        acceptedOnDay: state.day - 1,
        hoursLogged: 2,
        progress: {
          type: 'scheduled',
          hoursLogged: 2,
          daysCompleted: 1
        }
      }
    ]
  };

  ensureSlice(state);

  let [entry] = collectOutstandingActionEntries(state);
  assert.ok(entry, 'expected outstanding entry with accepted metadata');
  assert.equal(entry.progress.deadlineDay, accepted.deadlineDay);
  assert.equal(entry.progress.payoutSchedule, accepted.payout.schedule);
  assert.equal(entry.progress.payoutAmount, accepted.payout.amount);
  assert.equal(entry.progress.hoursPerDay, 2);
  assert.equal(entry.progress.daysRequired, 5);
  assert.equal(entry.progress.hoursRequired, 10);

  accepted.deadlineDay = state.day + 1;
  accepted.payout.schedule = 'onCompletion';
  accepted.payout.amount = 45;
  accepted.metadata.progress.hoursPerDay = 3;
  accepted.metadata.progress.daysRequired = 3;
  state.actions[definition.id].instances[0].hoursLogged = 4;
  state.actions[definition.id].instances[0].progress.hoursLogged = 4;
  state.actions[definition.id].instances[0].progress.daysCompleted = 2;

  [entry] = collectOutstandingActionEntries(state);
  assert.ok(entry, 'expected outstanding entry after metadata update');
  assert.equal(entry.progress.deadlineDay, accepted.deadlineDay);
  assert.equal(entry.progress.payoutSchedule, 'onCompletion');
  assert.equal(entry.progress.payoutAmount, 45);
  assert.equal(entry.progress.hoursPerDay, 3);
  assert.equal(entry.progress.daysRequired, 3);
  assert.equal(entry.progress.hoursRequired, 9);
  assert.equal(entry.progress.hoursRemaining, 5);
  assert.equal(entry.progress.metadata, accepted.metadata);
});

test('outstanding entries map study and maintenance commitments to canonical buckets', () => {
  resetRegistry();
  const studyDefinition = {
    id: 'study-commitment',
    name: 'Study Program',
    category: 'education',
    progress: {
      type: 'scheduled',
      completion: 'manual',
      hoursPerDay: 2,
      daysRequired: 3
    }
  };
  const maintenanceDefinition = {
    id: 'maintenance-commitment',
    name: 'Maintenance Duty',
    category: 'maintenance',
    progress: {
      type: 'scheduled',
      completion: 'manual',
      hoursPerDay: 1,
      daysRequired: 2
    }
  };

  loadRegistry({ actions: [studyDefinition, maintenanceDefinition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 7;
  state.hustleMarket = { offers: [], accepted: [] };
  state.actions = {
    [studyDefinition.id]: {
      instances: [
        {
          id: 'study-instance',
          accepted: true,
          status: 'active',
          definitionId: studyDefinition.id,
          hoursLogged: 0,
          progress: {
            type: 'scheduled',
            hoursLogged: 0,
            hoursPerDay: 2,
            daysRequired: 3
          }
        }
      ]
    },
    [maintenanceDefinition.id]: {
      instances: [
        {
          id: 'maintenance-instance',
          accepted: true,
          status: 'active',
          definitionId: maintenanceDefinition.id,
          hoursLogged: 0,
          progress: {
            type: 'scheduled',
            hoursLogged: 0,
            hoursPerDay: 1,
            daysRequired: 2
          }
        }
      ]
    }
  };

  ensureSlice(state);

  const entries = collectOutstandingActionEntries(state);
  const byDefinition = new Map(entries.map(entry => [entry.definitionId, entry]));

  const studyEntry = byDefinition.get(studyDefinition.id);
  assert.ok(studyEntry, 'expected study commitment entry');
  assert.equal(studyEntry.focusCategory, 'study');

  const maintenanceEntry = byDefinition.get(maintenanceDefinition.id);
  assert.ok(maintenanceEntry, 'expected maintenance commitment entry');
  assert.equal(maintenanceEntry.focusCategory, 'commitment');
});

test('accepted study offers keep their study focus metadata', () => {
  resetRegistry();
  const knowledgeTemplate = KNOWLEDGE_HUSTLES.find(template => template?.tag?.type === 'study');
  assert.ok(knowledgeTemplate, 'expected to find a study hustle template');

  loadRegistry({ actions: [knowledgeTemplate], hustles: [knowledgeTemplate], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 6;
  state.money = 10_000;

  ensureSlice(state);

  const [offer] = rollDailyOffers({ templates: [knowledgeTemplate], day: state.day, now: 1_000, state });
  assert.ok(offer, 'expected a study seat offer to roll');
  assert.equal(offer.templateCategory, 'study');

  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'expected enrollment to succeed for the rolled study offer');
  assert.equal(accepted?.metadata?.templateCategory, 'study');

  const entries = collectOutstandingActionEntries(state);
  const studyEntry = entries.find(entry => entry.definitionId === knowledgeTemplate.id);
  assert.ok(studyEntry, 'expected an outstanding entry for the accepted study instance');
  assert.equal(studyEntry.focusCategory, 'study');
  assert.equal(studyEntry.progress?.metadata?.templateCategory, 'study');
});
