import assert from 'node:assert/strict';
import test from 'node:test';

import {
  incomeDetail,
  instanceLabel,
  latestYieldDetail,
  ownedDetail,
  qualitySummaryDetail,
  setupCostDetail,
  setupDetail
} from '../src/game/assets/details.js';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();

function resetWithAsset(definition, assetState = {}) {
  const state = harness.resetState();
  state.assets[definition.id] = {
    ...(state.assets[definition.id] || {}),
    ...assetState,
    instances: Array.isArray(assetState.instances) ? assetState.instances : []
  };
  return state.assets[definition.id];
}

test('ownedDetail encourages the first build when no instances exist', t => {
  const definition = { id: 'storyStudio', name: 'Story Studio' };
  resetWithAsset(definition, { instances: [] });

  t.after(() => {
    harness.resetState();
  });

  assert.equal(ownedDetail(definition), '📦 Owned: <strong>0</strong> (ready for your first build)');
});

test('ownedDetail lists active and setup counts for existing instances', t => {
  const definition = { id: 'lunarLab', name: 'Lunar Lab' };
  resetWithAsset(definition, {
    instances: [
      { status: 'active' },
      { status: 'active' },
      { status: 'setup' }
    ]
  });

  t.after(() => {
    harness.resetState();
  });

  assert.equal(ownedDetail(definition), '📦 Owned: <strong>3</strong> (2 active, 1 in setup)');
});

test('setupDetail handles instant, single-day, and multi-day schedules', () => {
  assert.equal(setupDetail({ id: 'instantBuild' }), '⏳ Setup: <strong>Instant</strong>');

  const singleDay = { id: 'quickBuild', setup: { days: 0, hoursPerDay: 4 } };
  assert.equal(setupDetail(singleDay), '⏳ Setup: <strong>4h investment</strong>');

  const multiDay = { id: 'slowForge', setup: { days: 3, hoursPerDay: 5.5 } };
  assert.equal(setupDetail(multiDay), '⏳ Setup: <strong>3 days · 5.5h/day</strong>');
});

test('setupCostDetail formats missing and configured costs', () => {
  assert.equal(setupCostDetail({ id: 'freebie' }), '💵 Setup Cost: <strong>$0</strong>');

  const pricey = { id: 'bigSpender', setup: { cost: 12500 } };
  assert.equal(setupCostDetail(pricey), '💵 Setup Cost: <strong>$12,500</strong>');
});

test('incomeDetail reports quality-driven income ranges', () => {
  const definition = {
    id: 'artisanBakery',
    quality: {
      levels: [
        { level: 1, income: { min: 1200, max: 3400.5 } },
        { level: 3, income: { min: 2500, max: 7200.75 } }
      ]
    }
  };

  assert.equal(
    incomeDetail(definition),
    '💸 Income: <strong>$1,200 - $7,200.75 / day</strong> (quality-scaled)'
  );
});

test('incomeDetail falls back to variance defaults when levels are missing', () => {
  const definition = { id: 'streetCart', income: { base: 500, variance: 0.2 } };

  assert.equal(incomeDetail(definition), '💸 Income: <strong>$400 - $600 / day</strong> (quality-scaled)');
});

test('latestYieldDetail highlights when there are no active instances', t => {
  const definition = { id: 'demoPublisher' };
  resetWithAsset(definition, {
    instances: [
      { status: 'setup', lastIncome: 480 }
    ]
  });

  t.after(() => {
    harness.resetState();
  });

  assert.equal(latestYieldDetail(definition), '📊 Latest Yield: <strong>$0</strong> (no active instances)');
});

test('latestYieldDetail reports rounded averages for active instances', t => {
  const definition = { id: 'dailyDigest' };
  resetWithAsset(definition, {
    instances: [
      { status: 'active', lastIncome: 80 },
      { status: 'active', lastIncome: 100.4 },
      { status: 'setup', lastIncome: 500 }
    ]
  });

  t.after(() => {
    harness.resetState();
  });

  assert.equal(
    latestYieldDetail(definition),
    '📊 Latest Yield: <strong>$90</strong> avg per active instance'
  );
});

test('instanceLabel prefers custom names while falling back to singular titles', t => {
  const definition = { id: 'droneFleet', name: 'Drone Fleet', singular: 'Drone' };
  const assetState = resetWithAsset(definition, {
    instances: [
      { customName: '  Aurora ' },
      { status: 'active' }
    ]
  });

  // Sanity: ensure state persisted for both label checks
  assert.equal(assetState.instances.length, 2);

  assert.equal(instanceLabel(definition, 0), 'Aurora');
  assert.equal(instanceLabel(definition, 1), 'Drone #2');
});

test('instanceLabel gracefully defaults when names are missing', t => {
  const definition = { id: 'nameless' };
  resetWithAsset(definition, {
    instances: [{}]
  });

  t.after(() => {
    harness.resetState();
  });

  assert.equal(instanceLabel(definition, 0), 'Asset #1');
});

test('qualitySummaryDetail summarizes income ranges and track progress', () => {
  const definition = {
    id: 'creativeStudio',
    quality: {
      tracks: {
        craft: { shortLabel: 'Craft' },
        charm: { label: 'Charm' }
      },
      levels: [
        { level: 1, income: { min: 80, max: 150 } },
        { level: 3, income: { min: 120, max: 320 } }
      ]
    }
  };

  assert.equal(
    qualitySummaryDetail(definition),
    '✨ Quality: ⭐ Quality 1 starts at <strong>$80/day</strong> · Quality 3 can reach <strong>$320/day</strong> · Progress via Craft and Charm'
  );
});

test('qualitySummaryDetail omits track notes when none are provided', () => {
  const definition = {
    id: 'simpleBrewery',
    quality: {
      levels: [
        { level: 1, income: { min: 90, max: 180 } },
        { level: 2, income: { min: 120, max: 240 } }
      ]
    }
  };

  assert.equal(
    qualitySummaryDetail(definition),
    '✨ Quality: ⭐ Quality 1 starts at <strong>$90/day</strong> · Quality 2 can reach <strong>$240/day</strong>'
  );
});

test('qualitySummaryDetail returns an empty string when no quality data exists', () => {
  const definition = { id: 'noQuality' };
  assert.equal(qualitySummaryDetail(definition), '');
});
