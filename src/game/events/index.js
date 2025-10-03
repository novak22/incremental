import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import {
  addEvent,
  ensureEventState,
  findEvents,
  removeEvent,
  updateEvent
} from '../../core/state/events.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { ASSET_EVENT_BLUEPRINTS, NICHE_EVENT_BLUEPRINTS } from './config.js';
import { getNicheDefinition, getNicheDefinitions } from '../assets/nicheData.js';

function clampChance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

function formatPercentDisplay(value) {
  const numeric = Number(value) || 0;
  const rounded = Math.round(Math.abs(numeric * 100));
  return `${rounded}%`;
}

function formatInstanceLabel(definition, instanceIndex) {
  const base = definition?.singular || definition?.name || 'Asset';
  if (instanceIndex == null || instanceIndex < 0) {
    return base;
  }
  return `${base} #${instanceIndex + 1}`;
}

function getInstanceIndex(definition, instanceId) {
  const assetState = getAssetState(definition.id);
  if (!assetState) return -1;
  return assetState.instances.findIndex(entry => entry?.id === instanceId);
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

function logAssetEventStart({ event, blueprint, definition, instanceIndex }) {
  if (!event) return;
  const label = formatInstanceLabel(definition, instanceIndex);
  const percent = formatPercentDisplay(event.currentPercent);
  const days = event.totalDays === 1 ? 'today' : `for about ${event.totalDays} days`;
  const tone = event.tone === 'negative' ? 'warning' : 'info';
  const emoji = event.tone === 'negative' ? '⚠️' : '🚀';
  const descriptor = blueprint?.id === 'asset:viralTrend' && definition.id === 'vlog' ? 'viral burst' : event.label;
  const message =
    event.tone === 'negative'
      ? `${emoji} ${label} hit a ${descriptor}. Expect roughly −${percent} earnings ${days}.`
      : `${emoji} ${label} caught a ${descriptor}! Earnings jump around +${percent} ${days}.`;
  addLog(message, tone);
}

function logAssetEventEnd({ event, definition }) {
  const label = formatInstanceLabel(definition, getInstanceIndex(definition, event.target.instanceId));
  const tone = event.tone === 'negative' ? 'info' : 'info';
  const emoji = event.tone === 'negative' ? '💪' : '✨';
  const message =
    event.tone === 'negative'
      ? `${emoji} ${label} worked through the ${event.label.toLowerCase()}. Earnings are steady again.`
      : `${emoji} ${label}'s ${event.label.toLowerCase()} fades. Payouts glide back toward normal.`;
  addLog(message, tone);
}

function logNicheEventStart({ event, definition }) {
  if (!event || !definition) return;
  const tone = event.tone === 'negative' ? 'warning' : 'info';
  const emoji = event.tone === 'negative' ? '📉' : '📈';
  const percent = formatPercentDisplay(event.currentPercent);
  const days = event.totalDays === 1 ? 'today' : `for about ${event.totalDays} days`;
  const direction = event.tone === 'negative' ? 'dips by roughly' : 'soars about';
  const message = `${emoji} ${definition.name} ${event.label.toLowerCase()}! Payouts for aligned assets ${direction} ${percent} ${days}.`;
  addLog(message, tone);
}

function logNicheEventEnd({ event, definition }) {
  if (!event || !definition) return;
  const emoji = event.tone === 'negative' ? '🌤️' : '🌬️';
  const message =
    event.tone === 'negative'
      ? `${emoji} ${definition.name} shakes off the ${event.label.toLowerCase()}. Trendlines brighten.`
      : `${emoji} ${event.label} settles down for ${definition.name}. Multipliers return to baseline.`;
  addLog(message, 'info');
}

function getAssetEvents(state, assetId, instanceId) {
  if (!assetId || !instanceId) return [];
  return findEvents(state, event => {
    return (
      event.target?.type === 'assetInstance' &&
      event.target.assetId === assetId &&
      event.target.instanceId === instanceId
    );
  });
}

function getNicheEvents(state, nicheId) {
  if (!nicheId) return [];
  return findEvents(state, event => event.target?.type === 'niche' && event.target.nicheId === nicheId);
}

function hasEventWithTone(events, tone, templateId) {
  if (!events.length) return false;
  return events.some(event => event.tone === tone || (templateId && event.templateId === templateId));
}

export function maybeTriggerAssetEvents({ definition, assetState, instance, instanceIndex }) {
  const state = getState();
  if (!state || !instance?.id) return [];
  ensureEventState(state, { fallbackDay: state.day || 1 });
  const created = [];

  const target = {
    type: 'assetInstance',
    assetId: definition.id,
    instanceId: instance.id
  };

  const existing = getAssetEvents(state, definition.id, instance.id);
  if (existing.length > 0) {
    return [];
  }

  const context = {
    state,
    definition,
    assetState,
    instance,
    instanceIndex,
    target,
    existing
  };

  for (const blueprint of ASSET_EVENT_BLUEPRINTS) {
    if (typeof blueprint.appliesTo === 'function' && !blueprint.appliesTo(context)) continue;
    if (typeof blueprint.canTrigger === 'function' && !blueprint.canTrigger(context)) continue;
    if (hasEventWithTone(existing, blueprint.tone, blueprint.id)) continue;
    const chance = clampChance(typeof blueprint.chance === 'function' ? blueprint.chance(context) : blueprint.chance);
    if (chance <= 0) continue;
    const roll = Math.random();
    if (roll <= 0) continue;
    if (roll >= chance) continue;
    const event = buildEventFromBlueprint({
      state,
      blueprint,
      target,
      context,
      day: state.day || 1
    });
    if (event) {
      created.push(event);
      existing.push(event);
      logAssetEventStart({ event, blueprint, definition, instanceIndex });
      break;
    }
  }

  return created;
}

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

function maybeSpawnNicheEvents({ state, day }) {
  const definitions = getNicheDefinitions();
  const created = [];
  for (const definition of definitions) {
    for (const blueprint of NICHE_EVENT_BLUEPRINTS) {
      if (typeof blueprint.appliesTo === 'function' && !blueprint.appliesTo({ definition, state })) continue;
      const existing = getNicheEvents(state, definition.id);
      if (hasEventWithTone(existing, blueprint.tone, blueprint.id)) continue;
      const chance = clampChance(typeof blueprint.chance === 'function' ? blueprint.chance({ definition, state }) : blueprint.chance);
      if (chance <= 0) continue;
      const roll = Math.random();
      if (roll <= 0) continue;
      if (roll >= chance) continue;
      const event = buildEventFromBlueprint({
        state,
        blueprint,
        target: { type: 'niche', nicheId: definition.id },
        context: { definition, state },
        day
      });
      if (event) {
        created.push({ event, definition });
        logNicheEventStart({ event, definition });
      }
    }
  }
  return created;
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
