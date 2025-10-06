import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatSignedCurrency
} from '../../../../../src/ui/views/browser/utils/financeFormatting.js';

test('formatCurrency accepts values with localized separators', () => {
  assert.equal(formatCurrency('1 234,75'), '$1,234.75');
});

test('formatSignedCurrency preserves negative strings with symbols', () => {
  assert.equal(formatSignedCurrency('-$987.6'), '-$987.60');
});
