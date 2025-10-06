function normalizeLocaleSeparators(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const minusNormalized = trimmed.replace(/[−–—]/g, '-');
  const compact = minusNormalized.replace(/\s+/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');

  if (hasComma && hasDot) {
    if (compact.lastIndexOf(',') > compact.lastIndexOf('.')) {
      return compact.replace(/\./g, '').replace(/,/g, '.');
    }
    return compact.replace(/,/g, '');
  }

  if (hasComma) {
    if (!hasDot) {
      const unsigned = compact.replace(/^-/, '');
      const groups = unsigned.split(',');
      const fractional = groups[groups.length - 1];
      const isLikelyDecimal = fractional.length > 0 && fractional.length <= 2;

      if (!isLikelyDecimal) {
        return compact.replace(/,/g, '');
      }
    }

    return compact.replace(/,/g, '.');
  }

  return compact;
}

export function parseNumericInput(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const normalizedInput = normalizeLocaleSeparators(String(value));
  if (!normalizedInput) {
    return fallback;
  }

  const sanitized = normalizedInput.replace(/[^0-9.-]/g, '');
  if (!sanitized) {
    return fallback;
  }

  const negative = sanitized.startsWith('-');
  const digits = sanitized.replace(/-/g, '');
  if (!digits) {
    return fallback;
  }

  const canonical = negative ? `-${digits}` : digits;
  const numeric = Number(canonical);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default { parseNumericInput };
