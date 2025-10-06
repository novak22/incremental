import { formatMoney } from '../../../../core/helpers.js';
import { parseNumericInput } from './numberParsing.js';

function toNumeric(value) {
  return parseNumericInput(value, 0);
}

function roundValue(value, precision) {
  switch (precision) {
    case 'integer':
    case 'dollar':
      return Math.round(value);
    case 'none':
      return value;
    case 'cent':
    default:
      return Math.round(value * 100) / 100;
  }
}

function formatMagnitude(value, precision) {
  const rounded = roundValue(value, precision);
  return Math.abs(rounded);
}

function getSignPrefix(value, signDisplay) {
  const mode = signDisplay || 'auto';
  if (value > 0 && mode === 'always') {
    return '+';
  }
  if (value < 0 && mode !== 'never') {
    return '-';
  }
  return '';
}

function buildCurrency(value, options = {}) {
  const {
    precision = 'cent',
    clampZero = false,
    absolute = false,
    signDisplay = 'auto',
    zeroDisplay = null
  } = options;

  const baseValue = toNumeric(value);
  const clampedValue = clampZero ? Math.max(0, baseValue) : baseValue;
  const magnitudeSource = absolute ? baseValue : clampedValue;
  const magnitude = formatMagnitude(magnitudeSource, precision);
  const formatted = `$${formatMoney(magnitude)}`;

  if (magnitude === 0 && zeroDisplay != null) {
    return zeroDisplay;
  }

  const signReference = absolute && !clampZero ? baseValue : clampedValue;
  const sign = getSignPrefix(signReference, signDisplay);
  return `${sign}${formatted}`;
}

export function formatCurrency(value, options = {}) {
  return buildCurrency(value, options);
}

export function formatSignedCurrency(value, options = {}) {
  const { precision = 'cent', zeroDisplay = '$0' } = options;
  return buildCurrency(value, {
    ...options,
    precision,
    zeroDisplay,
    absolute: true,
    signDisplay: 'always'
  });
}

export function formatNetCurrency(value, options = {}) {
  const { precision = 'integer' } = options;
  return buildCurrency(value, {
    ...options,
    precision,
    absolute: true,
    signDisplay: 'auto'
  });
}

function formatPercentMagnitude(value, precision) {
  if (typeof precision === 'number' && precision > 0) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }
  return Math.round(value);
}

function toPercentString(value, precision) {
  if (typeof precision === 'number' && precision > 0) {
    const fixed = value.toFixed(precision);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }
  return String(Math.round(value));
}

export function formatPercent(value, options = {}) {
  const {
    precision = 0,
    clampMin = null,
    clampMax = null,
    nullFallback = '—',
    zeroDisplay = null,
    signDisplay = 'auto'
  } = options;

  if (value === null || value === undefined) {
    return nullFallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return nullFallback;
  }

  let clamped = numeric;
  if (clampMin !== null && clampMin !== undefined) {
    clamped = Math.max(clampMin, clamped);
  }
  if (clampMax !== null && clampMax !== undefined) {
    clamped = Math.min(clampMax, clamped);
  }

  const percentValue = clamped * 100;
  const rounded = formatPercentMagnitude(percentValue, precision);
  const magnitude = Math.abs(rounded);

  if (magnitude === 0 && zeroDisplay != null) {
    return zeroDisplay;
  }

  const sign = getSignPrefix(clamped, signDisplay);
  const formattedMagnitude = toPercentString(magnitude, precision);
  return `${sign}${formattedMagnitude}%`;
}

export default {
  formatCurrency,
  formatSignedCurrency,
  formatNetCurrency,
  formatPercent
};
