import { getState } from '../../core/state.js';
import { coerceNumber, normalizeActionEntries } from './utils.js';
import './fallbacks/findFreelanceWork.js';
import {
  mergeQueueSnapshotMetrics,
  applyFinalQueueMetrics
} from './queueService.js';
import {
  applyAutoCompletedEntries,
  collectOutstandingActionEntries
} from './outstanding/index.js';
import {
  registerActionProvider,
  clearActionProviders,
  collectActionProviders
} from './providers.js';

const DEFAULT_EMPTY_MESSAGE = 'Queue a hustle or upgrade to add new tasks.';

function selectPreferredEntry(candidate, existing) {
  const candidateHasHandler = typeof candidate?.onClick === 'function';
  const existingHasHandler = typeof existing?.onClick === 'function';

  if (candidateHasHandler && !existingHasHandler) {
    return candidate;
  }

  if (!candidateHasHandler && existingHasHandler) {
    return existing;
  }

  return existing;
}

function dedupeEntries(entries = []) {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return entries;
  }

  const unique = [];
  const seen = new Map();

  entries.forEach(entry => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const id = entry.id;
    if (!id) {
      unique.push(entry);
      return;
    }

    const record = seen.get(id);
    if (!record) {
      const index = unique.push(entry) - 1;
      seen.set(id, { index, entry });
      return;
    }

    const preferred = selectPreferredEntry(entry, record.entry);
    if (preferred !== record.entry) {
      unique[record.index] = preferred;
      seen.set(id, { index: record.index, entry: preferred });
    }
  });

  return unique;
}

export function buildActionQueue({ state, summary = {} } = {}) {
  const resolvedState = state || getState() || {};
  const queue = { entries: [] };
  applyAutoCompletedEntries(queue, summary);

  const activeDay = coerceNumber(resolvedState?.day, null);
  queue.day = Number.isFinite(activeDay) ? activeDay : null;

  const snapshots = collectActionProviders({ state: resolvedState, summary });

  const outstandingEntries = collectOutstandingActionEntries(resolvedState);
  if (outstandingEntries.length) {
    queue.entries.push(...outstandingEntries);
  }

  snapshots.forEach(snapshot => {
    const snapshotEntries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    snapshotEntries.forEach(entry => {
      if (entry?.excludeFromQueue || entry?.raw?.excludeFromQueue) {
        return;
      }
      queue.entries.push(entry);
    });
  });

  mergeQueueSnapshotMetrics(queue, snapshots, resolvedState);

  queue.entries = dedupeEntries(queue.entries);

  if (!queue.entries.length && !queue.emptyMessage) {
    queue.emptyMessage = DEFAULT_EMPTY_MESSAGE;
  }

  applyFinalQueueMetrics(queue, resolvedState);

  if (!queue.scroller) {
    delete queue.scroller;
  }

  return queue;
}

export { registerActionProvider, clearActionProviders, collectActionProviders } from './providers.js';
export { normalizeActionEntries } from './utils.js';

export default {
  registerActionProvider,
  clearActionProviders,
  collectActionProviders,
  buildActionQueue,
  normalizeActionEntries
};
