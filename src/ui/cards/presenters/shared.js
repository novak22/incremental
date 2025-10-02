const REGISTRY_KEYS = ['hustles', 'education', 'assets', 'upgrades'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeRegistries(registries = {}) {
  const normalized = isPlainObject(registries) ? { ...registries } : {};
  REGISTRY_KEYS.forEach(key => {
    const value = registries?.[key];
    normalized[key] = Array.isArray(value) ? value : [];
  });
  return normalized;
}

export function renderCollections(payload = {}, adapters = {}, options = {}) {
  const { registries = {}, models = {} } = payload ?? {};
  const normalizedRegistries = normalizeRegistries(registries);

  if (typeof adapters.cache === 'function') {
    adapters.cache(normalizedRegistries, models, options);
  }

  if (typeof adapters.render === 'function') {
    adapters.render(normalizedRegistries, models, options);
  }

  if (typeof adapters.afterRender === 'function') {
    adapters.afterRender(normalizedRegistries, models, options);
  }

  return { registries: normalizedRegistries, models };
}

export function updateCollections(payload = {}, adapters = {}, options = {}) {
  const { registries = {}, models = {} } = payload ?? {};
  const normalizedRegistries = normalizeRegistries(registries);

  if (typeof adapters.cache === 'function') {
    adapters.cache(normalizedRegistries, models, options);
  }

  if (typeof adapters.update === 'function') {
    adapters.update(normalizedRegistries, models, options);
  } else if (typeof adapters.render === 'function') {
    adapters.render(normalizedRegistries, models, options);
  }

  if (typeof adapters.afterUpdate === 'function') {
    adapters.afterUpdate(normalizedRegistries, models, options);
  }

  return { registries: normalizedRegistries, models };
}

const sharedCollections = {
  normalizeRegistries,
  renderCollections,
  updateCollections
};

export default sharedCollections;
