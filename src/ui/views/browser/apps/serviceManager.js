let cachedRegistries = null;
let cachedModels = null;
let latestServiceSummaries = [];
const serviceSummaryListeners = new Set();

function getStableSummaries() {
  return latestServiceSummaries.map(entry => ({ ...entry }));
}

function notifyServiceSummaryListeners() {
  const snapshot = getStableSummaries();
  serviceSummaryListeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      // Swallow listener errors to avoid breaking rendering
    }
  });
}

export function cachePayload(registries = {}, models = {}) {
  cachedRegistries = registries;
  cachedModels = models;
}

export function getCachedPayload() {
  if (!cachedRegistries || !cachedModels) {
    return null;
  }
  return {
    registries: cachedRegistries,
    models: cachedModels
  };
}

export function setServiceSummaries(summaries = []) {
  latestServiceSummaries = Array.isArray(summaries)
    ? summaries.filter(entry => entry && entry.id)
    : [];
  notifyServiceSummaryListeners();
}

export function getLatestServiceSummaries() {
  return getStableSummaries();
}

export function subscribeToServiceSummaries(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  serviceSummaryListeners.add(listener);
  return () => {
    serviceSummaryListeners.delete(listener);
  };
}

export default {
  cachePayload,
  getCachedPayload,
  setServiceSummaries,
  getLatestServiceSummaries,
  subscribeToServiceSummaries
};
