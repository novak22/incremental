const AUTO_READ_TYPES = Object.freeze(['passive', 'upgrade', 'hustle', 'quality']);

export function isAutoReadType(type) {
  if (typeof type !== 'string' || !type) {
    return false;
  }
  const normalized = type.toLowerCase();
  return AUTO_READ_TYPES.includes(normalized);
}

export function getAutoReadTypes() {
  return AUTO_READ_TYPES.slice();
}

export default {
  isAutoReadType,
  getAutoReadTypes
};
