import { createAssetEvents } from './assetEvents.js';
import { createNicheEvents } from './nicheEvents.js';
import {
  logAssetEventStart,
  logAssetEventEnd,
  logNicheEventStart,
  logNicheEventEnd
} from './logging.js';
import { removeEvent, updateEvent } from '../../core/state/events.js';
import {
  clampChance,
  buildEventFromBlueprint,
  ensureEventStateForProcessing,
  cleanupMissingTargets,
  resolveEventDefinition
} from './factoryContext.js';

const {
  getAssetEvents,
  hasEventWithTone,
  maybeTriggerAssetEvents,
  triggerQualityActionEvents
} = createAssetEvents({
  clampChance,
  buildEventFromBlueprint,
  logAssetEventStart
});

const { getNicheEvents, maybeSpawnNicheEvents } = createNicheEvents({
  clampChance,
  buildEventFromBlueprint,
  hasEventWithTone,
  logNicheEventStart
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
  const state = ensureEventStateForProcessing();
  if (!state) return { amount, entries: [] };
  const events = [];
  if (instance?.id) {
    events.push(...getAssetEvents(state, definition.id, instance.id));
  }
  if (instance?.nicheId) {
    events.push(...getNicheEvents(state, instance.nicheId));
  }
  return applyEventListToAmount({ amount, events });
}

export function advanceEventsAfterDay(day) {
  const state = ensureEventStateForProcessing({ fallbackDay: day });
  if (!state) return;
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
      const definition = resolveEventDefinition(event);
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
