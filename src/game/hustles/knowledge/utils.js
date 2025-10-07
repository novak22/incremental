export function clampDay(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const fallbackValue = Number(fallback);
    return Number.isFinite(fallbackValue) && fallbackValue > 0 ? Math.floor(fallbackValue) : 1;
  }
  return Math.floor(parsed);
}

export function ensureNestedObject(container, key) {
  if (!container || typeof container !== 'object') {
    return {};
  }
  const existing = container[key];
  if (existing && typeof existing === 'object') {
    return existing;
  }
  const created = {};
  container[key] = created;
  return created;
}

export function getTrackDefinitionId(trackId) {
  return `study-${trackId}`;
}
