export function getInstanceQualityLevel(instance) {
  return Number(instance?.quality?.level) || 0;
}

export function randomBetween(min, max) {
  const low = Number(min);
  const high = Number(max);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return low || 0;
  }
  if (high <= low) return low;
  return low + Math.random() * (high - low);
}
