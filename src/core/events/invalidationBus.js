const ALL_UI_SECTIONS = Object.freeze([
  'dashboard',
  'player',
  'skillsWidget',
  'headerAction',
  'cards'
]);

const dirtySections = new Set();
const topicListeners = new Map();

export const EVENT_TOPICS = Object.freeze({
  invalidation: 'invalidation:dirty',
  moneyChanged: 'currency:moneyChanged'
});

function ensureListenerSet(eventName) {
  if (!topicListeners.has(eventName)) {
    topicListeners.set(eventName, new Set());
  }
  return topicListeners.get(eventName);
}

function markEntry(section, flag = true) {
  if (!section) return;
  if (flag) {
    dirtySections.add(section);
  } else {
    dirtySections.delete(section);
  }
}

export function markDirty(sectionOrMap, flag = true) {
  if (typeof sectionOrMap === 'string') {
    markEntry(sectionOrMap, flag);
    return;
  }

  if (Array.isArray(sectionOrMap)) {
    sectionOrMap.forEach(section => markEntry(section, true));
    return;
  }

  if (sectionOrMap && typeof sectionOrMap === 'object') {
    for (const [section, value] of Object.entries(sectionOrMap)) {
      if (section === 'changed') continue;
      markEntry(section, Boolean(value));
    }
  }
}

export function markAllDirty() {
  ALL_UI_SECTIONS.forEach(section => dirtySections.add(section));
}

export function consumeDirty() {
  if (dirtySections.size === 0) {
    return {};
  }

  const result = {};
  dirtySections.forEach(section => {
    result[section] = true;
  });
  dirtySections.clear();
  return result;
}

export function publish(eventName, payload) {
  const listeners = topicListeners.get(eventName);
  if (!listeners || listeners.size === 0) {
    return false;
  }

  const snapshot = Array.from(listeners);
  snapshot.forEach(listener => {
    listener(payload);
  });
  return true;
}

export function subscribe(eventName, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('Listener must be a function');
  }
  const listeners = ensureListenerSet(eventName);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      topicListeners.delete(eventName);
    }
  };
}

export function subscribeToInvalidation(listener) {
  return subscribe(EVENT_TOPICS.invalidation, listener);
}

export function flushDirty() {
  const dirty = consumeDirty();
  if (Object.keys(dirty).length === 0) {
    return null;
  }
  publish(EVENT_TOPICS.invalidation, dirty);
  return dirty;
}

export function resetInvalidationBus() {
  dirtySections.clear();
  topicListeners.clear();
}

export { ALL_UI_SECTIONS };
