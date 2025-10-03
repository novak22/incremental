import test from 'node:test';
import assert from 'node:assert/strict';

const { shouldAutoRead } = await import('../src/core/loggingRules.js');

test('auto-read applies to hustle payouts', () => {
  assert.equal(shouldAutoRead('hustle'), true);
  assert.equal(shouldAutoRead('hustle:payout'), true);
});

test('auto-read applies to passive payouts', () => {
  assert.equal(shouldAutoRead('passive'), true);
  assert.equal(shouldAutoRead('passive:education'), true);
});

test('auto-read ignores other notification types', () => {
  assert.equal(shouldAutoRead('warning'), false);
  assert.equal(shouldAutoRead('info'), false);
});
