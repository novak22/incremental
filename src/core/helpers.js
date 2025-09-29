export function structuredClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatMoney(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export function formatList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, and ${tail}`;
}

export function formatHours(hours) {
  if (Math.abs(hours - Math.round(hours)) < 0.05) {
    return `${Math.round(hours)}h`;
  }
  return `${hours.toFixed(1)}h`;
}

export function formatDays(days) {
  if (Math.abs(days - Math.round(days)) < 0.05) {
    return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
  }
  return `${days.toFixed(1)} days`;
}

export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}
