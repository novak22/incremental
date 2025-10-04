import { formatHours } from '../../../../core/helpers.js';

const focusModes = ['money', 'upgrades', 'balanced'];
const completedItems = new Map();
let currentDay = null;
let focusMode = 'balanced';
let pendingEntries = [];
let lastModel = null;

function normalizeDay(day) {
  const numeric = Number(day);
  return Number.isFinite(numeric) ? numeric : null;
}

function resetCompletedForDay(day) {
  const normalized = normalizeDay(day);
  if (normalized === null) {
    if (currentDay !== null) {
      completedItems.clear();
      currentDay = null;
    }
    return;
  }

  if (normalized !== currentDay) {
    completedItems.clear();
    currentDay = normalized;
  }
}

function seedAutoCompletedEntries(entries = [], formatDuration = hours => formatHours(hours || 0)) {
  if (!Array.isArray(entries) || !entries.length) return;

  entries.forEach((entry, index) => {
    const id = entry?.id || `auto-${index}`;
    if (!id) return;

    const existing = completedItems.get(id);
    const hours = Number(entry?.durationHours);
    const durationHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
    const durationText = entry?.durationText || formatDuration(durationHours);
    const count = Number.isFinite(entry?.count) && entry.count > 0 ? entry.count : 1;
    const completedAt = existing?.completedAt ?? Date.now();

    completedItems.set(id, {
      id,
      title: entry?.title || 'Scheduled work',
      durationHours,
      durationText,
      repeatable: false,
      remainingRuns: null,
      count,
      completedAt
    });
  });
}

function isValidFocusMode(mode) {
  return focusModes.includes(mode);
}

function setFocusMode(mode) {
  const normalized = typeof mode === 'string' ? mode.toLowerCase() : '';
  if (!isValidFocusMode(normalized) || normalized === focusMode) {
    return false;
  }

  focusMode = normalized;
  return true;
}

function getFocusMode() {
  return focusMode;
}

function getFocusModes() {
  return [...focusModes];
}

function setLastModel(model = {}) {
  lastModel = model;
}

function getLastModel() {
  return lastModel;
}

function setPendingEntries(entries = []) {
  pendingEntries = Array.isArray(entries) ? entries : [];
}

function getPendingEntries() {
  return pendingEntries;
}

function getCompletion(entryId) {
  if (!entryId) return null;
  return completedItems.get(entryId) || null;
}

function recordCompletion(entry, {
  durationHours = 0,
  durationText = '',
  repeatable = false,
  remainingRuns = null
} = {}) {
  if (!entry?.id) {
    return null;
  }

  const existing = completedItems.get(entry.id);
  const count = existing ? (existing.count || 1) + 1 : 1;
  const normalizedDuration = Number.isFinite(durationHours) && durationHours > 0 ? durationHours : 0;

  const record = {
    id: entry.id,
    title: entry.title,
    durationHours: normalizedDuration,
    durationText,
    repeatable,
    remainingRuns,
    count,
    completedAt: Date.now()
  };

  completedItems.set(entry.id, record);
  return record;
}

function getCompletedEntries() {
  return Array.from(completedItems.values());
}

function getEffectiveRemainingRuns(entry = {}, completion) {
  if (entry?.remainingRuns == null) {
    return null;
  }

  const total = Number(entry.remainingRuns);
  if (!Number.isFinite(total)) {
    return null;
  }

  const used = Number(completion?.count);
  const consumed = Number.isFinite(used) ? Math.max(0, used) : 0;
  return Math.max(0, total - consumed);
}

export {
  getCompletion,
  getCompletedEntries,
  getEffectiveRemainingRuns,
  getFocusMode,
  getFocusModes,
  getLastModel,
  getPendingEntries,
  recordCompletion,
  resetCompletedForDay,
  seedAutoCompletedEntries,
  setFocusMode,
  setLastModel,
  setPendingEntries
};

export default {
  getCompletion,
  getCompletedEntries,
  getEffectiveRemainingRuns,
  getFocusMode,
  getFocusModes,
  getLastModel,
  getPendingEntries,
  recordCompletion,
  resetCompletedForDay,
  seedAutoCompletedEntries,
  setFocusMode,
  setLastModel,
  setPendingEntries
};
