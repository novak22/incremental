import test from 'node:test';
import assert from 'node:assert/strict';

import normalizedEconomy from '../docs/normalized_economy.json' with { type: 'json' };
import { assets, hustles, upgrades } from '../src/game/data/economyConfig.js';

const minutesToHours = minutes => minutes / 60;

test('blog economy config matches normalized spec', () => {
  const spec = normalizedEconomy.assets.blog;
  const config = assets.blog;

  assert.strictEqual(config.setup.days, spec.schedule.setup_days);
  assert.strictEqual(config.setup.hoursPerDay, minutesToHours(spec.schedule.setup_minutes_per_day));
  assert.strictEqual(config.setup.cost, spec.setup_cost);
  assert.strictEqual(config.maintenance.hours, minutesToHours(spec.maintenance_time));
  assert.strictEqual(config.maintenance.cost, spec.maintenance_cost);
  assert.strictEqual(config.income.base, spec.base_income);
  assert.strictEqual(config.income.variance, spec.variance);

  const [quality0, quality1] = config.qualityLevels;
  assert.deepEqual(quality0.income, {
    min: spec.quality_curve[0].income_min,
    max: spec.quality_curve[0].income_max
  });
  assert.deepEqual(quality1.requirements, spec.quality_curve[1].requirements);
});

test('dropship pack party hustle stays aligned with spec', () => {
  const spec = normalizedEconomy.hustles.dropshipPackParty;
  const config = hustles.dropshipPackParty;

  assert.strictEqual(config.timeHours, minutesToHours(spec.setup_time));
  assert.strictEqual(config.payout, spec.base_income);
  assert.strictEqual(config.cost, spec.setup_cost);
});

test('editorial pipeline upgrade pulls its cost from the spec', () => {
  const spec = normalizedEconomy.upgrades.editorialPipeline;
  const config = upgrades.editorialPipeline;

  assert.strictEqual(config.cost, spec.setup_cost);
});
