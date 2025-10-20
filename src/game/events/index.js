import { getState, getAssetState } from '../../core/state.js';
import { addEvent, ensureEventState, removeEvent, updateEvent } from '../../core/state/events.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getNicheDefinition } from '../assets/nicheData.js';
import { createAssetEvents } from './assetEvents.js';
import { createNicheEvents } from './nicheEvents.js';
import { logAssetEventEnd, logNicheEventEnd } from './logging.js';

function clampChance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

function buildEventFromBlueprint({ state, blueprint, target, context, day }) {
  const labelFactory = blueprint.label;
  const label = typeof labelFactory === 'function' ? labelFactory(context) : labelFactory || 'Event';
  const durationRaw = typeof blueprint.duration === 'function' ? blueprint.duration(context) : blueprint.duration;
  const totalDays = Math.max(1, Math.round(Number(durationRaw) || 1));
  const initialPercentFactory = blueprint.initialPercent || (() => 0);
  const changeFactory = blueprint.dailyPercentChange || (() => 0);
  const event = addEvent(state, {
    templateId: blueprint.id,
    label,
    stat: blueprint.stat || 'income',
    modifierType: blueprint.modifierType || 'percent',
    tone: blueprint.tone || 'neutral',
    target,
    currentPercent: initialPercentFactory(context),
    dailyPercentChange: changeFactory(context),
    totalDays,
    remainingDays: totalDays,
    createdOnDay: day,
    lastProcessedDay: Math.max(0, day - 1),
    meta: {
      assetId: context.definition?.id || null,
      instanceId: context.instance?.id || null,
      nicheId: target.type === 'niche' ? target.nicheId : null
    }
  });
  return event;
}

const {
  getAssetEvents,
  hasEventWithTone,
  maybeTriggerAssetEvents,
  triggerQualityActionEvents
} = createAssetEvents({ clampChance, buildEventFromBlueprint });

const { getNicheEvents, maybeSpawnNicheEvents } = createNicheEvents({
  clampChance,
  buildEventFromBlueprint,
  hasEventWithTone
});

function applyEventListToAmount({ amount, events }) {
  let updated = amount;
  const entries = [];
  events.forEach(event => {
    if (!event) return;
    if (event.stat !== 'income' || event.modifierType !== 'percent') return;
    if (!Number.isFinite(Number(event.currentPercent))) return;
    if (event.remainingDays != null && event.remainingDays <= 0) return;
    const before = updated;
    const multiplier = 1 + Number(event.currentPercent || 0);
    const next = before * multiplier;
    updated = Math.max(0, next);
    const delta = updated - before;
    if (Math.abs(delta) > 0.01) {
      entries.push({
        id: event.id,
        label: event.label,
        amount: delta,
        type: 'event',
        percent: Number(event.currentPercent || 0)
      });
    }
  });
  return { amount: updated, entries };
}

export function applyIncomeEvents({ amount, definition, instance }) {
  const state = getState();
  if (!state) return { amount, entries: [] };
  ensureEventState(state, { fallbackDay: state.day || 1 });
  const events = [];
  if (instance?.id) {
    events.push(...getAssetEvents(state, definition.id, instance.id));
  }
  if (instance?.nicheId) {
    events.push(...getNicheEvents(state, instance.nicheId));
  }
  return applyEventListToAmount({ amount, events });
}

function cleanupMissingTargets(state) {
  const removed = [];
  state.events.active.slice().forEach(event => {
    if (!event || event.target?.type !== 'assetInstance') return;
    const definition = getAssetDefinition(event.target.assetId);
    if (!definition) {
      removeEvent(state, event.id);
      removed.push(event);
      return;
    }
    const assetState = getAssetState(definition.id);
    if (!assetState) {
      removeEvent(state, event.id);
      removed.push(event);
      return;
    }
    const exists = assetState.instances.some(instance => instance?.id === event.target.instanceId);
    if (!exists) {
      removeEvent(state, event.id);
      removed.push(event);
    }
  });
  return removed;
}

export function advanceEventsAfterDay(day) {
  const state = getState();
  if (!state) return;
  ensureEventState(state, { fallbackDay: day || state.day || 1 });

  cleanupMissingTargets(state);

  const ended = [];
  state.events.active.slice().forEach(event => {
    if (!event) return;
    if (event.lastProcessedDay >= day) return;
    const updated = updateEvent(state, event.id, draft => {
      draft.lastProcessedDay = day;
      const remaining = Number(draft.remainingDays);
      draft.remainingDays = Math.max(0, (Number.isFinite(remaining) ? remaining : draft.totalDays || 0) - 1);
      if (draft.remainingDays > 0) {
        const current = Number(draft.currentPercent) || 0;
        const change = Number(draft.dailyPercentChange) || 0;
        draft.currentPercent = Math.max(-0.95, Math.min(5, current + change));
      }
    });
    if (!updated || updated.remainingDays <= 0 || Math.abs(updated.currentPercent || 0) < 0.0001) {
      removeEvent(state, event.id);
      const definition =
        event.target?.type === 'assetInstance'
          ? getAssetDefinition(event.target.assetId)
          : getNicheDefinition(event.target?.nicheId);
      if (event.target?.type === 'assetInstance' && definition) {
        logAssetEventEnd({ event, definition });
      } else if (event.target?.type === 'niche' && definition) {
        logNicheEventEnd({ event, definition });
      }
      ended.push(event);
    }
  });

  maybeSpawnNicheEvents({ state, day });
  return ended;
}

export {
  getAssetEvents,
  getNicheEvents,
  maybeSpawnNicheEvents,
  maybeTriggerAssetEvents,
  triggerQualityActionEvents
};
