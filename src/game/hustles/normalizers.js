import { structuredClone } from '../../core/helpers.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampMarketDay(value, fallback = 1) {
  const parsed = toNumber(value);
  if (parsed == null || parsed <= 0) {
    const fallbackParsed = toNumber(fallback);
    if (fallbackParsed == null || fallbackParsed <= 0) {
      return 1;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

export function clampMarketDaySpan(value, fallback = 0) {
  const parsed = toNumber(value);
  if (parsed == null || parsed < 0) {
    const fallbackParsed = toNumber(fallback);
    if (fallbackParsed == null || fallbackParsed < 0) {
      return 0;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

export function clampMarketNonNegativeNumber(value, fallback = 0) {
  const parsed = toNumber(value);
  if (parsed == null || parsed < 0) {
    const fallbackParsed = toNumber(fallback);
    if (fallbackParsed == null || fallbackParsed < 0) {
      return 0;
    }
    return fallbackParsed;
  }
  return parsed;
}

export function clampMarketPositiveInteger(value, fallback = 1) {
  const parsed = toNumber(value);
  if (parsed == null || parsed <= 0) {
    const fallbackParsed = toNumber(fallback);
    if (fallbackParsed == null || fallbackParsed <= 0) {
      return 1;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

export function clampMarketWeight(value, fallback = 1) {
  const parsed = toNumber(value);
  if (parsed == null || parsed <= 0) {
    const fallbackParsed = toNumber(fallback);
    if (fallbackParsed == null || fallbackParsed <= 0) {
      return 1;
    }
    return fallbackParsed;
  }
  return parsed;
}

export function cloneMarketMetadata(source, fallback = {}) {
  if (source && typeof source === 'object') {
    return structuredClone(source);
  }
  if (fallback && typeof fallback === 'object') {
    return structuredClone(fallback);
  }
  return {};
}
