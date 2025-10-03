const builders = new Map();
let defaultsRegistered = false;

function normalizeKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Model builder key must be a non-empty string.');
  }
  return key;
}

function registerModelBuilder(key, builder, { isDefault = false } = {}) {
  const normalizedKey = normalizeKey(key);
  if (typeof builder !== 'function') {
    throw new Error(`Model builder for "${normalizedKey}" must be a function.`);
  }
  builders.set(normalizedKey, builder);
  if (isDefault) {
    defaultsRegistered = true;
  }
  return () => builders.delete(normalizedKey);
}

function getModelBuilderEntries() {
  return Array.from(builders.entries());
}

function buildModelMap(registries, context = {}) {
  const models = {};
  getModelBuilderEntries().forEach(([key, builder]) => {
    models[key] = builder(registries, context);
  });
  return models;
}

function ensureDefaultBuilders(registerDefaults) {
  if (defaultsRegistered) {
    return;
  }
  if (typeof registerDefaults === 'function') {
    registerDefaults();
  }
  defaultsRegistered = true;
}

export {
  registerModelBuilder,
  getModelBuilderEntries,
  buildModelMap,
  ensureDefaultBuilders
};
