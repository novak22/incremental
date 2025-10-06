import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumericInput } from '../../../../../src/ui/views/browser/utils/numberParsing.js';

test('parseNumericInput strips thousands separators when no decimal is present', () => {
  assert.equal(parseNumericInput('1,234'), 1234);
  assert.equal(parseNumericInput('12,345,678'), 12345678);
});

test('parseNumericInput preserves decimal meaning for comma locales', () => {
  assert.equal(parseNumericInput('12,34'), 12.34);
  assert.equal(parseNumericInput('-9,5'), -9.5);
});
