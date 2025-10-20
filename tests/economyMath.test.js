import test from 'node:test';
import assert from 'node:assert/strict';

import { applyModifiers } from '../src/game/data/economyMath.js';

const assertCloseTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `Expected ${actual} to be within 1e-9 of ${expected}`);
};

test('applyModifiers respects additive and multiplier ordering', () => {
  const addFirst = applyModifiers(100, [
    { id: 'add', label: 'Add', type: 'add', amount: 20 },
    { id: 'mult', label: 'Mult', type: 'multiplier', amount: 1.5 }
  ]);

  assert.strictEqual(addFirst.value, 180);
  assert.strictEqual(addFirst.multiplier, 1.8);
  assert.strictEqual(addFirst.applied.length, 2);
  assert.strictEqual(addFirst.applied[0].before, 100);
  assert.strictEqual(addFirst.applied[0].after, 120);
  assert.strictEqual(addFirst.applied[0].delta, 20);
  assert.strictEqual(addFirst.applied[0].percent, null);
  assert.strictEqual(addFirst.applied[1].before, 120);
  assert.strictEqual(addFirst.applied[1].after, 180);
  assert.strictEqual(addFirst.applied[1].delta, 60);
  assert.strictEqual(addFirst.applied[1].percent, 0.5);
  assert.strictEqual(addFirst.clampApplied, false);

  const multiplierFirst = applyModifiers(100, [
    { id: 'mult', label: 'Mult', type: 'multiplier', amount: 1.5 },
    { id: 'add', label: 'Add', type: 'add', amount: 20 }
  ]);

  assert.strictEqual(multiplierFirst.value, 170);
  assert.strictEqual(multiplierFirst.multiplier, 1.7);
  assert.strictEqual(multiplierFirst.applied.length, 2);
  assert.strictEqual(multiplierFirst.applied[0].before, 100);
  assert.strictEqual(multiplierFirst.applied[0].after, 150);
  assert.strictEqual(multiplierFirst.applied[0].delta, 50);
  assert.strictEqual(multiplierFirst.applied[0].percent, 0.5);
  assert.strictEqual(multiplierFirst.applied[1].before, 150);
  assert.strictEqual(multiplierFirst.applied[1].after, 170);
  assert.strictEqual(multiplierFirst.applied[1].delta, 20);
  assert.strictEqual(multiplierFirst.applied[1].percent, null);
  assert.strictEqual(multiplierFirst.clampApplied, false);
});

test('applyModifiers supports formula-based descriptors and skips invalid expressions', () => {
  const descriptors = [
    { id: 'formula-mult', label: 'Formula Mult', type: 'multiplier', formula: 'income * (1 + 0.25)' },
    { id: 'formula-add', label: 'Formula Add', type: 'add', formula: 'value + ( 10 + 5 )' },
    { id: 'invalid', label: 'Invalid', type: 'multiplier', formula: 'income * (1 + rate)' }
  ];

  const result = applyModifiers(80, descriptors);

  assert.strictEqual(result.value, 115);
  assert.strictEqual(result.multiplier, 1.4375);
  assert.strictEqual(result.applied.length, 2);

  const [multiplierEntry, additiveEntry] = result.applied;
  assert.strictEqual(multiplierEntry.id, 'formula-mult');
  assert.strictEqual(multiplierEntry.before, 80);
  assert.strictEqual(multiplierEntry.after, 100);
  assert.strictEqual(multiplierEntry.delta, 20);
  assert.strictEqual(multiplierEntry.percent, 0.25);

  assert.strictEqual(additiveEntry.id, 'formula-add');
  assert.strictEqual(additiveEntry.before, 100);
  assert.strictEqual(additiveEntry.after, 115);
  assert.strictEqual(additiveEntry.delta, 15);
  assert.strictEqual(additiveEntry.percent, null);

  assert.strictEqual(result.clampApplied, false);
});

test('applyModifiers clamps multiplier-only results to provided bounds', () => {
  const minClamped = applyModifiers(
    100,
    [
      { id: 'boost', label: 'Boost', type: 'multiplier', amount: 1.1 },
      { id: 'nerf', label: 'Nerf', type: 'multiplier', amount: 0.5 }
    ],
    { clamp: { min: 0.75, max: 3 } }
  );

  assert.strictEqual(minClamped.value, 75);
  assert.strictEqual(minClamped.multiplier, 0.75);
  assert.strictEqual(minClamped.clampApplied, true);
  assert.strictEqual(minClamped.applied.length, 2);
  assert.strictEqual(minClamped.applied[0].before, 100);
  assertCloseTo(minClamped.applied[0].after, 110);
  assertCloseTo(minClamped.applied[0].delta, 10);
  assertCloseTo(minClamped.applied[0].percent, 0.1);
  assertCloseTo(minClamped.applied[1].before, 110);
  assertCloseTo(minClamped.applied[1].after, 55);
  assertCloseTo(minClamped.applied[1].delta, -55);
  assertCloseTo(minClamped.applied[1].percent, -0.5);

  const maxClamped = applyModifiers(
    100,
    [
      { id: 'mult-a', label: 'Mult A', type: 'multiplier', amount: 1.5 },
      { id: 'mult-b', label: 'Mult B', type: 'multiplier', amount: 1.6 }
    ],
    { clamp: { min: 0.25, max: 2 } }
  );

  assert.strictEqual(maxClamped.value, 200);
  assert.strictEqual(maxClamped.multiplier, 2);
  assert.strictEqual(maxClamped.clampApplied, true);
  assert.strictEqual(maxClamped.applied.length, 2);
  assert.strictEqual(maxClamped.applied[0].before, 100);
  assertCloseTo(maxClamped.applied[0].after, 150);
  assertCloseTo(maxClamped.applied[0].delta, 50);
  assertCloseTo(maxClamped.applied[0].percent, 0.5);
  assertCloseTo(maxClamped.applied[1].before, 150);
  assertCloseTo(maxClamped.applied[1].after, 240);
  assertCloseTo(maxClamped.applied[1].delta, 90);
  assertCloseTo(maxClamped.applied[1].percent, 0.6);
});

test('applyModifiers preserves normalized descriptors', () => {
  const normalizedAdd = {
    __economyNormalized: true,
    type: 'add',
    amount: 5,
    id: 'norm-add',
    label: 'Normalized Add'
  };
  const normalizedMult = {
    __economyNormalized: true,
    type: 'multiplier',
    amount: 2,
    id: 'norm-mult',
    label: 'Normalized Mult'
  };

  const result = applyModifiers(50, [normalizedAdd, normalizedMult]);

  assert.strictEqual(result.value, 110);
  assert.strictEqual(result.multiplier, 2.2);
  assert.strictEqual(result.applied.length, 2);
  assert.strictEqual(result.applied[0].descriptor, normalizedAdd);
  assert.strictEqual(result.applied[0].before, 50);
  assert.strictEqual(result.applied[0].after, 55);
  assert.strictEqual(result.applied[0].delta, 5);
  assert.strictEqual(result.applied[0].percent, null);
  assert.strictEqual(result.applied[1].descriptor, normalizedMult);
  assert.strictEqual(result.applied[1].before, 55);
  assert.strictEqual(result.applied[1].after, 110);
  assert.strictEqual(result.applied[1].delta, 55);
  assert.strictEqual(result.applied[1].percent, 1);
  assert.strictEqual(result.clampApplied, false);
});
