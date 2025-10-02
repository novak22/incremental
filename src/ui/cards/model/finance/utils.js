export function toCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export default {
  toCurrency,
  ensureArray
};
