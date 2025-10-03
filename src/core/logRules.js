const AUTO_READ_TYPES = new Set(['passive', 'upgrade']);

export function shouldAutoRead(type) {
  if (typeof type !== 'string') return false;
  return AUTO_READ_TYPES.has(type);
}

export { AUTO_READ_TYPES };

