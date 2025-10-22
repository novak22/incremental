import { ensureArray as ensureArrayHelper } from '../../core/helpers.js';

/**
 * Normalizes a value into an array so UI layers can iterate safely.
 * @template T
 * @param {T|T[]} value
 * @returns {T[]}
 */
export function ensureArray(value) {
  return ensureArrayHelper(value);
}
