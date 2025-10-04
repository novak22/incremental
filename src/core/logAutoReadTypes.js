const AUTO_READ_TYPES = Object.freeze(['passive', 'hustle', 'quality', 'educationPayoff']);

export function isAutoReadType(type) {
  if (typeof type !== 'string' || !type) {
    return false;
  }
  const normalized = type.toLowerCase();
  return AUTO_READ_TYPES.some(entry => String(entry).toLowerCase() === normalized);
}

export function getAutoReadTypes() {
  return AUTO_READ_TYPES.slice();
}

export default {
  isAutoReadType,
  getAutoReadTypes
};
