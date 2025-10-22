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

  const available = models.find(
    model => model.definitionId === 'hustle-available' && model.offerId === 'offer-available'
  );
  assert.ok(available, 'expected available hustle model');
  assert.equal(available.available, true);
  assert.equal(available.filters.available, true);
  assert.equal(available.filters.limitRemaining, null);
  assert.equal(available.actionCategory, 'hustle');
  assert.equal(available.descriptors.categoryLabel, 'Hustle');
  assert.equal(available.filters.category, 'hustle');
  assert.equal(available.filters.templateKind, '');
  assert.equal(available.labels.category, 'Hustle');

  const blocked = models.find(model => model.definitionId === 'hustle-blocked');
  assert.ok(blocked, 'expected blocked hustle model');
  assert.equal(blocked.available, false);
  assert.equal(blocked.filters.available, false);
  assert.equal(blocked.status, 'placeholder');
});

test('buildHustleModels disables accept action when requirements are unmet', () => {
  const hustles = [
    {
      id: 'hustle-locked',
      name: 'Locked Hustle',
      description: 'Requires more prep.',
      time: 2,
      payout: { amount: 50 }
    }
  ];

  const models = buildHustleModels(hustles, {
    getState: () => ({ day: 1 }),
    describeRequirements: () => [{ label: 'Camera Rig Upgrade', met: false, type: 'equipment' }],
    getUsage: () => null,
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    getOffers: () => [{
      id: 'offer-locked',
      templateId: 'hustle-locked',
      definitionId: 'hustle-locked',
      availableOnDay: 1,
      expiresOnDay: 2,
      metadata: {},
      variant: { label: 'Locked Hustle' }
    }],
    getAcceptedOffers: () => [],
    collectCommitments: () => [],
    acceptOffer: () => {
      throw new Error('acceptOffer should not be called when locked');
    },
    rollOffers: null
  });

  assert.equal(models.length, 1);
  const [model] = models;
  assert.equal(model.action.label, 'Locked — Locked Hustle');
  assert.equal(model.action.disabled, true);
  assert.ok(/Unlock tip/i.test(model.action.guidance));
  assert.equal(model.available, false);
  assert.equal(model.status, 'upcoming');
  assert.equal(model.offer.ready, false);
  assert.equal(model.offer.locked, true);
  assert.equal(model.offer.onAccept, null);
  assert.ok(/Unlock tip/i.test(model.offer.meta));
});

test('buildHustleModels prefers accepting ready offers and queues upcoming separately', () => {
  const hustles = [
    {
      id: 'priority-hustle',
      name: 'Priority Hustle',
      description: 'Grab this gig right away.',
      time: 2,
      payout: { amount: 50 }
    }
  ];

  const readyOffer = {
    id: 'offer-ready',
    templateId: 'priority-hustle',
    definitionId: 'priority-hustle',
    availableOnDay: 3,
    expiresOnDay: 3,
    metadata: {},
    variant: { label: 'Ready Offer' }
  };

  const upcomingOffer = {
    id: 'offer-upcoming',
    templateId: 'priority-hustle',
    definitionId: 'priority-hustle',
    availableOnDay: 4,
    expiresOnDay: 5,
    metadata: {},
    variant: { label: 'Coming Soon' }
  };

  const models = buildHustleModels(hustles, {
    getState: () => ({ day: 3 }),
    describeRequirements: () => [],
    getUsage: () => null,
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    getOffers: () => [readyOffer, upcomingOffer],
    getAcceptedOffers: () => [],
    collectCommitments: () => [],
    acceptOffer: () => {}
  });

  const readyModel = models.find(entry => entry.offerId === 'offer-ready');
  assert.ok(readyModel, 'expected ready offer model');
  assert.equal(readyModel.action.label, 'Accept Ready Offer');
  assert.equal(readyModel.action.disabled, false);
  assert.equal(readyModel.action.className, 'primary');
  assert.match(readyModel.action.guidance, /Step 1 • Accept/i);

  const upcomingModel = models.find(entry => entry.offerId === 'offer-upcoming');
  assert.ok(upcomingModel, 'expected upcoming offer model');
  assert.equal(upcomingModel.status, 'upcoming');
  assert.equal(upcomingModel.available, false);
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
  assert.equal(model.offer.hoursPerDay, 3);
  assert.equal(model.offer.daysRequired, 4);
  assert.equal(model.offer.completionMode, 'manual');
  assert.equal(model.offer.progressLabel, 'Ship updates');
  assert.equal(model.offer.meta.includes('3h/day for 4 days'), true, 'summary should highlight daily load');
  assert.equal(model.offer.meta.includes('Manual completion'), true, 'summary should reflect manual completion rule');
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
  assert.equal(model.action.label, 'Check back tomorrow');
  assert.equal(model.action.disabled, true);
  assert.equal(model.action.onClick, null);
  assert.match(model.action.guidance, /tomorrow/i);
});

test('buildHustleModels wraps manual rerolls in executeAction to flush state', () => {
  const hustles = [
    {
      id: 'manual-reroll',
      name: 'Manual Reroll Hustle',
      description: 'Spin the wheel for a fresh gig.'
    }
  ];

  let executed = false;
  let rolled = false;

  const models = buildHustleModels(hustles, {
    getState: () => ({ day: 5 }),
    describeRequirements: () => [],
    getUsage: () => null,
    formatHours: value => `${value}h`,
    formatMoney: value => value.toFixed(0),
    getOffers: () => [],
    getAcceptedOffers: () => [],
    collectCommitments: () => [],
    executeAction: fn => {
      executed = true;
      if (typeof fn === 'function') {
        fn();
      }
    },
    rollOffers: () => {
      rolled = true;
    }
  });

  assert.equal(models.length, 1);
  const [model] = models;
  assert.equal(model.action.label, 'Roll a fresh offer');
  assert.equal(model.action.disabled, false);

  model.action.onClick();

  assert.equal(executed, true, 'executeAction should wrap manual rerolls');
  assert.equal(rolled, true, 'rollOffers should be invoked when rerolling');
});

test('buildUpgradeModels groups families in sorted order', () => {
  const upgrades = [
    {
      id: 'tech-camera',
      name: 'Prime Lens',
      category: 'tech',
      family: 'camera',
      cost: 120,
      action: { label: 'Install' },
      placements: ['general']
    },
    {
      id: 'tech-automation',
      name: 'Workflow Robot',
      category: 'tech',
      family: 'automation',
      cost: 200,
      action: { label: 'Install' },
      placements: ['general']
    },
    {
      id: 'house-studio',
      name: 'Studio Lights',
      category: 'house',
      family: 'lighting',
      cost: 80,
      action: { label: 'Install' },
      placements: ['general']
    },
    {
      id: 'extra-alchemy',
      name: 'Alchemy Boost',
      category: 'alchemy',
      family: 'zeta',
      cost: 50,
      action: { label: 'Install' },
      placements: ['general']
    }
  ];

  const state = {
    money: 500,
    upgrades: {
      'tech-camera': { purchased: true }
    }
  };

  const models = buildUpgradeModels(upgrades, { getState: () => state, placement: 'general' });
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

test('buildUpgradeModels filters definitions by placement', () => {
  const upgrades = [
    {
      id: 'general-upgrade',
      name: 'General Boost',
      category: 'tech',
      family: 'camera',
      cost: 100,
      placements: ['general']
    },
    {
      id: 'shop-upgrade',
      name: 'Shop Boost',
      category: 'tech',
      family: 'automation',
      cost: 150,
      placements: ['shopily']
    }
  ];

  const state = { money: 0, upgrades: {} };

  const general = buildUpgradeModels(upgrades, { getState: () => state, placement: 'general' });
  const generalIds = general.categories.flatMap(category =>
    category.families.flatMap(family => family.definitions.map(definition => definition.id))
  );
  assert.deepEqual(generalIds, ['general-upgrade']);

  const shopily = buildUpgradeModels(upgrades, { getState: () => state, placement: 'shopily' });
  const shopIds = shopily.categories.flatMap(category =>
    category.families.flatMap(family => family.definitions.map(definition => definition.id))
  );
  assert.deepEqual(shopIds, ['shop-upgrade']);
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
