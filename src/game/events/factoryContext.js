import { getState, getAssetState } from '../../core/state.js';
import { addEvent, ensureEventState, removeEvent } from '../../core/state/events.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getNicheDefinition } from '../assets/nicheData.js';

export function clampChance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

export function buildEventFromBlueprint({ state, blueprint, target, context, day }) {
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

export function cleanupMissingTargets(state) {
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

export function resolveEventDefinition(event) {
  if (!event?.target) return null;
  if (event.target.type === 'assetInstance') {
    return getAssetDefinition(event.target.assetId);
  }
  if (event.target.type === 'niche') {
    return getNicheDefinition(event.target.nicheId);
  }
  return null;
}

export function ensureEventStateForProcessing({ fallbackDay } = {}) {
  const state = getState();
  if (!state) return null;
  const resolvedFallback = fallbackDay ?? state.day ?? 1;
  ensureEventState(state, { fallbackDay: resolvedFallback });
  return state;
}
