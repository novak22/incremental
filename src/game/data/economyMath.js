const SAFE_EXPRESSION_PATTERN = /^[0-9+\-*/().\s]+$/;

function evaluateExpression(expression) {
  if (typeof expression !== 'string') return null;
  const trimmed = expression.trim();
  if (!trimmed) return null;
  if (!SAFE_EXPRESSION_PATTERN.test(trimmed)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${trimmed});`);
    const result = fn();
    const numeric = Number(result);
    return Number.isFinite(numeric) ? numeric : null;
  } catch (error) {
    return null;
  }
}

function normalizeModifierType(rawType) {
  const type = typeof rawType === 'string' ? rawType.toLowerCase() : '';
  if (type === 'multiplier') return 'multiplier';
  if (type === 'add' || type === 'flat') return 'add';
  return null;
}

function parseFormulaAmount(descriptor, normalizedType) {
  if (!descriptor || typeof descriptor.formula !== 'string') return null;
  const formula = descriptor.formula.trim();
  if (!formula) return null;
  if (normalizedType === 'multiplier') {
    const match = formula.match(/^[a-zA-Z_][\w]*\s*\*\s*(.+)$/);
    if (!match) return null;
    return evaluateExpression(match[1]);
  }
  if (normalizedType === 'add') {
    const match = formula.match(/^[a-zA-Z_][\w]*\s*\+\s*(.+)$/);
    if (!match) return null;
    return evaluateExpression(match[1]);
  }
  return null;
}

function normalizeModifierDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') return null;
  if (descriptor.__economyNormalized) {
    return descriptor;
  }

  const normalizedType = normalizeModifierType(descriptor.type);
  if (!normalizedType) return null;

  let amount = Number(descriptor.amount);
  if (!Number.isFinite(amount)) {
    amount = parseFormulaAmount(descriptor, normalizedType);
  }
  if (!Number.isFinite(amount)) return null;

  const normalized = {
    __economyNormalized: true,
    type: normalizedType,
    amount,
    id: descriptor.id || descriptor.source || null,
    label: descriptor.label || descriptor.notes || descriptor.source || 'Modifier',
    source: descriptor.source || descriptor.id || null,
    target: descriptor.target || null,
    notes: descriptor.notes || null,
    stack: descriptor.stack != null ? descriptor.stack : null,
    formula: descriptor.formula || null,
    original: descriptor.original || descriptor
  };

  return normalized;
}

/**
 * Apply additive or multiplicative modifiers from docs/normalized_economy.json to a base value.
 *
 * @example
 * // Outline Mastery hustle boost (docs/normalized_economy.json → modifiers source "outlineMastery")
 * const result = applyModifiers(120, [
 *   {
 *     source: 'outlineMastery',
 *     target: 'hustle:freelance.income',
 *     type: 'multiplier',
 *     formula: 'income * (1 + 0.25)'
 *   }
 * ]);
 * console.log(result.value); // 150
 *
 * @param {number} baseValue
 * @param {Array<object>} descriptors
 * @param {object} [options]
 * @param {{ min?: number, max?: number }} [options.clamp] Clamp multiplier results to spec limits.
 * @returns {{ value: number, multiplier: number, applied: Array<object>, clampApplied: boolean }}
 */
export function applyModifiers(baseValue, descriptors = [], options = {}) {
  const baseNumber = Number(baseValue);
  const base = Number.isFinite(baseNumber) ? baseNumber : 0;

  const normalizedDescriptors = Array.isArray(descriptors) ? descriptors : [];
  const applied = [];
  let running = base;
  let multiplierProduct = 1;
  let hasMultiplier = false;
  let hasNonMultiplier = false;

  normalizedDescriptors.forEach((entry, index) => {
    const normalized = normalizeModifierDescriptor(entry);
    if (!normalized) return;

    const before = running;
    let after = before;

    if (normalized.type === 'multiplier') {
      hasMultiplier = true;
      after = before * normalized.amount;
      multiplierProduct *= normalized.amount;
    } else if (normalized.type === 'add') {
      hasNonMultiplier = true;
      after = before + normalized.amount;
    }

    running = after;
    applied.push({
      id: normalized.id,
      label: normalized.label,
      type: normalized.type,
      value: normalized.amount,
      before,
      after,
      delta: after - before,
      percent: normalized.type === 'multiplier' ? normalized.amount - 1 : null,
      descriptor: normalized,
      index
    });
  });

  let multiplier = 1;
  if (base !== 0) {
    multiplier = base !== 0 ? running / base : 1;
  } else if (hasMultiplier) {
    multiplier = multiplierProduct;
  }

  let clampApplied = false;
  if (
    options.clamp &&
    hasMultiplier &&
    applied.length &&
    applied.every(entry => entry.type === 'multiplier')
  ) {
    const min = Number(options.clamp.min);
    const max = Number(options.clamp.max);
    let clamped = multiplier;
    if (Number.isFinite(min) && clamped < min) {
      clamped = min;
      clampApplied = true;
    }
    if (Number.isFinite(max) && clamped > max) {
      clamped = max;
      clampApplied = true;
    }
    if (clampApplied) {
      multiplier = clamped;
      running = base * clamped;
      applied.forEach((entry, index) => {
        const before = index === 0 ? base : applied[index - 1].after;
        const after = before * entry.value;
        entry.before = before;
        entry.after = after;
        entry.delta = after - before;
        entry.percent = entry.value - 1;
      });
    }
  }

  const value = hasNonMultiplier ? running : multiplier * base;

  return {
    value: Number.isFinite(value) ? value : 0,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    applied,
    clampApplied
  };
}

