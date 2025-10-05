import { coerceNumber, normalizeActionEntries } from './utils.js';

let providers = [];
let providerSequence = 0;

export function registerActionProvider(provider, priority = 0) {
  if (typeof provider !== 'function') {
    return () => {};
  }
  const record = {
    handler: provider,
    priority: coerceNumber(priority),
    order: providerSequence++
  };
  providers.push(record);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    providers = providers.filter(item => item !== record);
  };
}

export function clearActionProviders() {
  const previous = providers.slice();
  providers = [];
  return () => {
    providers = previous.slice();
  };
}

export function collectActionProviders({ state = {}, summary = {} } = {}) {
  const snapshots = [];

  const activeProviders = providers
    .slice()
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.order - b.order;
    });

  activeProviders.forEach(provider => {
    const handler = provider?.handler;
    if (typeof handler !== 'function') return;

    let result;
    try {
      result = handler({ state, summary });
    } catch (error) {
      result = null;
    }

    if (!result) return;

    const focusCategory = result.focusCategory || null;
    const normalized = normalizeActionEntries(result.entries).map((entry, index) => ({
      ...entry,
      focusCategory: entry.focusCategory || focusCategory,
      orderIndex: Number.isFinite(entry.orderIndex) ? entry.orderIndex : index
    }));

    snapshots.push({
      id: result.id || null,
      focusCategory,
      entries: normalized,
      metrics: result.metrics || {}
    });
  });

  return snapshots;
}

export default {
  registerActionProvider,
  clearActionProviders,
  collectActionProviders
};
