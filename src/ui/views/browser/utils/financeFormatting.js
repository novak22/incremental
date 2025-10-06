import { formatMoney } from '../../../../core/helpers.js';
import { parseNumericInput } from './numberParsing.js';

function normalizeAmount(value) {
  return parseNumericInput(value, 0);
}

function withCents(value) {
  const magnitude = Math.abs(value);
  return Math.round(magnitude * 100) / 100;
}

export function formatCurrency(amount) {
  const numeric = normalizeAmount(amount);
  const absolute = withCents(numeric);
  const formatted = formatMoney(absolute);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

export function formatSignedCurrency(amount) {
  const numeric = normalizeAmount(amount);
  const absolute = withCents(numeric);
  const formatted = formatMoney(absolute);
  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
  return `${sign}$${formatted}`;
}

export default {
  formatCurrency,
  formatSignedCurrency
};
