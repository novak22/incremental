import { createId, structuredClone } from '../helpers.js';

const MAX_DURATION_DAYS = 14;
const MIN_DURATION_DAYS = 1;

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-0.95, Math.min(5, numeric));
}

function sanitizePositiveInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  const rounded = Math.round(Math.max(min, numeric));
  return Math.min(max, Math.max(min, rounded));
}

function sanitizeTarget(target) {
  if (!target || typeof target !== 'object') {
    return null;
  }

  const type = typeof target.type === 'string' ? target.type : null;
  if (type === 'assetInstance') {
    const assetId = typeof target.assetId === 'string' && target.assetId ? target.assetId : null;
    const instanceId = typeof target.instanceId === 'string' && target.instanceId ? target.instanceId : null;
    if (!assetId || !instanceId) return null;
    return { type, assetId, instanceId };
  }

  if (type === 'niche') {
    const nicheId = typeof target.nicheId === 'string' && target.nicheId ? target.nicheId : null;
    if (!nicheId) return null;
    return { type, nicheId };
  }

  return null;
}

function sanitizeTone(value) {
  if (value === 'positive' || value === 'negative' || value === 'neutral') {
    return value;
  }
  return 'neutral';
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  return structuredClone(meta);
}

function normalizeEventEntry(entry, { fallbackDay = 1 } = {}) {
  if (!entry || typeof entry !== 'object') return null;

  const id = typeof entry.id === 'string' && entry.id ? entry.id : createId();
  const templateId = typeof entry.templateId === 'string' && entry.templateId ? entry.templateId : 'custom';
  const label = typeof entry.label === 'string' && entry.label ? entry.label : 'Event';
  const stat = typeof entry.stat === 'string' && entry.stat ? entry.stat : 'income';
  const modifierType = typeof entry.modifierType === 'string' && entry.modifierType ? entry.modifierType : 'percent';
  const target = sanitizeTarget(entry.target);
  if (!target) return null;

  const tone = sanitizeTone(entry.tone);

  const totalDays = sanitizePositiveInteger(entry.totalDays, {
    min: MIN_DURATION_DAYS,
    max: MAX_DURATION_DAYS
  });
  const remainingDaysRaw = sanitizePositiveInteger(entry.remainingDays, {
    min: 0,
    max: MAX_DURATION_DAYS
  });
  const remainingDays = Math.min(totalDays, remainingDaysRaw || totalDays);

  const currentPercent = clampPercent(entry.currentPercent || entry.percent || 0);
  const dailyPercentChange = clampPercent(entry.dailyPercentChange || 0);

  const createdOnDay = sanitizePositiveInteger(entry.createdOnDay, { min: 1 });
  const lastProcessedDay = sanitizePositiveInteger(entry.lastProcessedDay, {
    min: 0,
    max: Math.max(fallbackDay, createdOnDay)
  });

  const meta = sanitizeMeta(entry.meta);

  return {
    id,
    templateId,
    label,
    stat,
    modifierType,
    target,
    tone,
    currentPercent,
    dailyPercentChange,
    totalDays,
    remainingDays,
    createdOnDay: createdOnDay || fallbackDay,
    lastProcessedDay,
    meta
  };
}

export function ensureEventState(target, { fallbackDay = 1 } = {}) {
  if (!target) return;
  target.events = target.events || {};
  const eventState = target.events;
  if (!Array.isArray(eventState.active)) {
    eventState.active = [];
  }
  eventState.active = eventState.active
    .map(entry => normalizeEventEntry(entry, { fallbackDay }))
    .filter(Boolean);
}

export function addEvent(target, eventEntry) {
  if (!target) return null;
  ensureEventState(target);
  const normalized = normalizeEventEntry(eventEntry, { fallbackDay: target.day || 1 });
  if (!normalized) return null;
  target.events.active.push(normalized);
  return normalized;
}

export function removeEvent(target, eventId) {
  if (!target || !Array.isArray(target.events?.active)) return;
  target.events.active = target.events.active.filter(event => event?.id !== eventId);
}

export function updateEvent(target, eventId, updater) {
  if (!target || typeof updater !== 'function') return null;
  ensureEventState(target);
  const events = target.events.active;
  let updated = null;
  target.events.active = events
    .map(event => {
      if (!event || event.id !== eventId) return event;
      const draft = structuredClone(event);
      updater(draft);
      updated = normalizeEventEntry(draft, { fallbackDay: target.day || 1 });
      return updated;
    })
    .filter(Boolean);
  return updated;
}

export function findEvents(target, predicate) {
  if (!target || typeof predicate !== 'function') return [];
  ensureEventState(target);
  return target.events.active.filter(event => {
    try {
      return predicate(event);
    } catch (error) {
      return false;
    }
  });
}
