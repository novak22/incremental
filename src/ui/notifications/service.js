const notifications = new Map();
const subscribers = new Set();

function cloneEntry(entry) {
  return entry ? { ...entry } : entry;
}

function buildSnapshot() {
  return Array.from(notifications.values()).map(cloneEntry);
}

function notifySubscribers() {
  const snapshot = buildSnapshot();
  subscribers.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      // Swallow subscriber errors so a single faulty listener does not break broadcasting.
    }
  });
}

function publish(notification = {}) {
  const id = String(notification?.id || '').trim();
  if (!id) {
    return null;
  }

  const existing = notifications.get(id);
  const timestamp = Date.now();
  const entry = {
    ...existing,
    ...notification,
    id,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  notifications.set(id, entry);
  notifySubscribers();
  return cloneEntry(entry);
}

function dismiss(id) {
  const key = String(id || '').trim();
  if (!key || !notifications.has(key)) {
    return false;
  }
  notifications.delete(key);
  notifySubscribers();
  return true;
}

function getSnapshot() {
  return buildSnapshot();
}

function subscribe(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  subscribers.add(listener);
  try {
    listener(buildSnapshot());
  } catch (error) {
    // Ignore subscriber errors on the initial push as well.
  }
  return () => {
    subscribers.delete(listener);
  };
}

export default {
  publish,
  dismiss,
  getSnapshot,
  subscribe
};
