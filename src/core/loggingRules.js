const AUTO_READ_TYPES = new Set(['passive', 'hustle', 'upgrade']);

function normalizeTypeId(type) {
  if (typeof type !== 'string' || !type) {
    return '';
  }
  const separatorIndex = type.indexOf(':');
  if (separatorIndex === -1) {
    return type;
  }
  return type.slice(0, separatorIndex);
}

export function shouldAutoRead(type) {
  const normalized = normalizeTypeId(type);
  return AUTO_READ_TYPES.has(normalized);
}

export default {
  AUTO_READ_TYPES,
  shouldAutoRead
};
