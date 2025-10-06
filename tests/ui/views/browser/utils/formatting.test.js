import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatNetCurrency,
  formatPercent,
  formatSignedCurrency
} from '../../../../../src/ui/views/browser/utils/formatting.js';

test('formatCurrency rounds to whole dollars when requested', () => {
  assert.equal(formatCurrency(10.6, { precision: 'integer' }), '$11');
});

test('formatCurrency clamps negative values to zero when asked', () => {
  assert.equal(formatCurrency(-25, { clampZero: true }), '$0');
});

test('formatCurrency supports absolute formatting without a sign', () => {
  assert.equal(
    formatCurrency(-18.75, { absolute: true, signDisplay: 'never' }),
    '$18.75'
  );
});

test('formatSignedCurrency adds a plus sign for positive values', () => {
  assert.equal(formatSignedCurrency(7.25), '+$7.25');
});

test('formatSignedCurrency uses the provided zero display option', () => {
  assert.equal(formatSignedCurrency(0, { zeroDisplay: '—' }), '—');
});

test('formatNetCurrency omits the plus sign for positive values', () => {
  assert.equal(formatNetCurrency(19), '$19');
});

test('formatNetCurrency preserves the negative sign for losses', () => {
  assert.equal(formatNetCurrency(-19.4), '-$19');
});

test('formatPercent returns the fallback when the value is missing', () => {
  assert.equal(formatPercent(null, { nullFallback: '—' }), '—');
});

test('formatPercent applies clamping and hides the sign when requested', () => {
  assert.equal(
    formatPercent(1.2, { clampMin: 0, clampMax: 1, signDisplay: 'never' }),
    '100%'
  );
});

test('formatPercent adds a plus sign for positive deltas when asked', () => {
  assert.equal(formatPercent(0.156, { signDisplay: 'always' }), '+16%');
});

test('formatCurrency parses formatted string input', () => {
  assert.equal(formatCurrency('$1,234.5'), '$1,234.50');
});
