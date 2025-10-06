import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampMarketDay,
  clampMarketDaySpan,
  clampMarketNonNegativeNumber,
  clampMarketPositiveInteger,
  clampMarketWeight,
  cloneMarketMetadata
} from '../../../src/game/hustles/normalizers.js';

test('clampMarketDay enforces positive integer fallbacks', () => {
  assert.equal(clampMarketDay(3.9, 1), 3);
  assert.equal(clampMarketDay(-2, 4), 4);
  assert.equal(clampMarketDay('not-a-number', 0), 1);
});

test('clampMarketDaySpan clamps negative spans and floors decimals', () => {
  assert.equal(clampMarketDaySpan(5.7, 0), 5);
  assert.equal(clampMarketDaySpan(-1, 2), 2);
  assert.equal(clampMarketDaySpan(null, 'ignored'), 0);
});

test('clampMarketNonNegativeNumber keeps positive values and uses fallback otherwise', () => {
  assert.equal(clampMarketNonNegativeNumber(2.5, 0), 2.5);
  assert.equal(clampMarketNonNegativeNumber(-3, 1.25), 1.25);
  assert.equal(clampMarketNonNegativeNumber('bad', -4), 0);
});

test('clampMarketPositiveInteger floors decimals and uses safe fallback', () => {
  assert.equal(clampMarketPositiveInteger(6.4, 1), 6);
  assert.equal(clampMarketPositiveInteger(0, 3), 3);
  assert.equal(clampMarketPositiveInteger('bad', 'also-bad'), 1);
});

test('clampMarketWeight respects fallback when invalid', () => {
  assert.equal(clampMarketWeight(0.5, 2), 0.5);
  assert.equal(clampMarketWeight(-2, 3.5), 3.5);
  assert.equal(clampMarketWeight('bad', 0), 1);
});

test('cloneMarketMetadata returns deep clones and fallbacks', () => {
  const original = { nested: { value: 1 } };
  const clone = cloneMarketMetadata(original);
  assert.notEqual(clone, original);
  assert.notEqual(clone.nested, original.nested);
  clone.nested.value = 2;
  assert.equal(original.nested.value, 1);

  const fallback = { fallback: true };
  const clonedFallback = cloneMarketMetadata(null, fallback);
  assert.notEqual(clonedFallback, fallback);
  clonedFallback.fallback = false;
  assert.equal(fallback.fallback, true);

  const emptyClone = cloneMarketMetadata(null);
  assert.deepEqual(emptyClone, {});
});
