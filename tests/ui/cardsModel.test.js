import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHustleModels,
  buildUpgradeModels,
  buildEducationModels
} from '../../src/ui/cards/model/index.js';
import { buildModelMap, registerModelBuilder } from '../../src/ui/cards/modelBuilderRegistry.js';
import { ensureRegistryReady } from '../../src/game/registryBootstrap.js';

test('buildHustleModels mirrors availability filters', () => {
  const hustles = [
    {
      id: 'hustle-available',
      name: 'Available Hustle',
      description: 'Earn freely.',
      time: 2,
      payout: { amount: 40 },
      tag: { label: 'Focus' },
      action: {
        label: () => 'Queue',
        onClick: () => {},
        disabled: () => false
      }
    },
    {
      id: 'hustle-blocked',
      name: 'Blocked Hustle',
      description: 'Requires prep.',
      time: 3,
      payout: { amount: 60 },
      action: {
        label: 'Queue',
        onClick: () => {},
        disabled: state => state.blocked
      }
    }
  ];

  const state = { blocked: true };
  const models = buildHustleModels(hustles, {
    getState: () => state,
    describeRequirements: () => [],
    getUsage: () => null,
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    getOffers: () => [{
      id: 'offer-available',
      templateId: 'hustle-available',
      definitionId: 'hustle-available',
      availableOnDay: 1,
      expiresOnDay: 1,
      metadata: {},
      variant: { label: 'Available Hustle' }
    }],
    getAcceptedOffers: () => [],
    collectCommitments: () => [],
    acceptOffer: () => {}
  });

  const available = models.find(model => model.id === 'hustle-available');
  assert.ok(available, 'expected available hustle model');
  assert.equal(available.available, true);
  assert.equal(available.filters.available, true);
  assert.equal(available.filters.limitRemaining, null);

  const blocked = models.find(model => model.id === 'hustle-blocked');
  assert.ok(blocked, 'expected blocked hustle model');
  assert.equal(blocked.available, false);
  assert.equal(blocked.filters.available, false);
});

test('buildHustleModels surfaces multi-day offers with daily requirements', () => {
  const hustles = [
    {
      id: 'multi-day',
      name: 'Multi-day Hustle',
      description: 'Log steady progress across several days.',
      time: 12,
      payout: { amount: 300 }
    }
  ];

  const offer = {
    id: 'offer-multi',
    templateId: 'multi-day',
    definitionId: 'multi-day',
    availableOnDay: 7,
    expiresOnDay: 10,
    metadata: {
      hoursRequired: 12,
      hoursPerDay: 3,
      daysRequired: 4,
      completionMode: 'manual',
      progressLabel: 'Ship updates',
      payout: { amount: 300, schedule: 'onCompletion' },
      progress: {
        hoursPerDay: 3,
        daysRequired: 4,
        completionMode: 'manual',
        label: 'Ship updates'
      }
    },
    variant: {
      label: 'Daily Sprint',
      description: 'Log effort every day to stay on track.'
    }
  };

  const models = buildHustleModels(hustles, {
    getState: () => ({ day: 7 }),
    getOffers: () => [offer],
    getAcceptedOffers: () => [],
    describeRequirements: () => [],
    getUsage: () => null,
    collectCommitments: () => [],
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    acceptOffer: () => {}
  });

  assert.equal(models.length, 1);
  const [model] = models;
  assert.equal(model.offers.length, 1, 'expected multi-day offer to appear');
  const [entry] = model.offers;
  assert.equal(entry.hoursPerDay, 3);
  assert.equal(entry.daysRequired, 4);
  assert.equal(entry.completionMode, 'manual');
  assert.equal(entry.progressLabel, 'Ship updates');
  assert.equal(entry.meta.includes('3h/day for 4 days'), true, 'summary should highlight daily load');
  assert.equal(entry.meta.includes('Manual completion'), true, 'summary should reflect manual completion rule');
});

test('buildHustleModels provides guidance when no offers or manual rerolls exist', () => {
  const hustles = [
    {
      id: 'empty-market',
      name: 'Empty Market Hustle',
      description: 'Wait for tomorrow\'s leads.',
      time: 2,
      payout: { amount: 80 },
      action: {
        label: 'Legacy Run',
        onClick: () => {}
      }
    }
  ];

  const models = buildHustleModels(hustles, {
    getState: () => ({ day: 3 }),
    describeRequirements: () => [],
    getUsage: () => null,
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    getOffers: () => [],
    getAcceptedOffers: () => [],
    collectCommitments: () => [],
    rollOffers: null
  });

  assert.equal(models.length, 1);
  const [model] = models;
  assert.equal(model.offers.length, 0);
  assert.equal(model.action.label, 'Check back tomorrow');
  assert.equal(model.action.disabled, true);
  assert.equal(model.action.onClick, null);
  assert.match(model.action.guidance, /tomorrow/i);
});

test('buildUpgradeModels groups families in sorted order', () => {
  const upgrades = [
    {
      id: 'tech-camera',
      name: 'Prime Lens',
      category: 'tech',
      family: 'camera',
      cost: 120,
      action: { label: 'Install' }
    },
    {
      id: 'tech-automation',
      name: 'Workflow Robot',
      category: 'tech',
      family: 'automation',
      cost: 200,
      action: { label: 'Install' }
    },
    {
      id: 'house-studio',
      name: 'Studio Lights',
      category: 'house',
      family: 'lighting',
      cost: 80,
      action: { label: 'Install' }
    },
    {
      id: 'extra-alchemy',
      name: 'Alchemy Boost',
      category: 'alchemy',
      family: 'zeta',
      cost: 50,
      action: { label: 'Install' }
    }
  ];

  const state = {
    money: 500,
    upgrades: {
      'tech-camera': { purchased: true }
    }
  };

  const models = buildUpgradeModels(upgrades, { getState: () => state });
  assert.ok(Array.isArray(models.categories));
  assert.equal(models.categories[0].id, 'tech', 'tech lane should render first');
  const techFamilies = models.categories[0].families.map(family => family.id);
  assert.deepEqual(techFamilies, ['automation', 'camera']);

  const alchemy = models.categories.find(category => category.id === 'alchemy');
  assert.ok(alchemy, 'expected custom category appended');
  assert.equal(alchemy.copy.label, 'Alchemy', 'fallback label generated from key');

  const cameraUpgrade = models.categories[0].families
    .find(family => family.id === 'camera')
    .definitions.find(def => def.id === 'tech-camera');
  assert.ok(cameraUpgrade.snapshot.purchased, 'purchased upgrade reflected in snapshot');
  assert.equal(cameraUpgrade.filters.family, 'camera');
});

test('buildEducationModels summarises study queue totals', () => {
  const definitions = [
    {
      id: 'track-1',
      name: 'Storytelling 101',
      tag: { type: 'study' },
      hoursPerDay: 2,
      action: { label: 'Study', onClick: () => {} }
    },
    {
      id: 'track-2',
      name: 'Advanced Editing',
      tag: { type: 'study' },
      hoursPerDay: 3,
      action: { label: 'Study', onClick: () => {} }
    },
    {
      id: 'track-3',
      name: 'Lore Mastery',
      tag: { type: 'study' },
      hoursPerDay: 1,
      action: { label: 'Study', onClick: () => {} }
    }
  ];

  const progress = {
    'track-1': { enrolled: true, completed: false, daysCompleted: 2, totalDays: 10 },
    'track-2': { enrolled: false, completed: false },
    'track-3': { enrolled: true, completed: true }
  };

  const models = buildEducationModels(definitions, {
    getState: () => ({}),
    getKnowledgeProgress: id => progress[id] || {},
    getTimeCap: () => 8
  });

  assert.equal(models.queue.entries.length, 1, 'only active studies appear in queue');
  assert.equal(models.queue.entries[0].id, 'track-1');
  assert.equal(models.queue.totalHours, 2);
  assert.equal(models.queue.totalLabel.includes('Total ETA'), true);
  assert.equal(models.queue.capLabel, 'Daily cap: 8h');
});

test('model builder registry composes registered card models', () => {
  const registries = {
    hustles: [],
    education: [],
    assets: [],
    upgrades: []
  };

  const dispose = registerModelBuilder('customCard', () => ({ id: 'customCard', label: 'Custom' }));

  try {
    ensureRegistryReady();
    const models = buildModelMap(registries);
    assert.ok(models.hustles, 'expected default hustle models to be present');
    assert.ok(models.education, 'expected default education models to be present');
    assert.ok(models.assets, 'expected default asset models to be present');
    assert.ok(models.upgrades, 'expected default upgrade models to be present');
    assert.deepEqual(models.customCard, { id: 'customCard', label: 'Custom' });
  } finally {
    dispose();
  }
});
