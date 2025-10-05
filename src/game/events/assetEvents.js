import { getState, getAssetState } from '../../core/state.js';
import { ensureEventState, findEvents } from '../../core/state/events.js';
import { ASSET_EVENT_BLUEPRINTS } from './config.js';
import { logAssetEventStart } from './logging.js';

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

function hasEventWithTone(events, tone, templateId) {
  if (!events.length) return false;
  return events.some(event => event.tone === tone || (templateId && event.templateId === templateId));
}

export function createAssetEvents({ clampChance, buildEventFromBlueprint }) {
  function maybeTriggerAssetEvents({
    definition,
    assetState,
    instance,
    instanceIndex,
    trigger = 'payout',
    context: additionalContext = {}
  }) {
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
      existing,
      trigger,
      ...additionalContext
    };

    for (const blueprint of ASSET_EVENT_BLUEPRINTS) {
      const blueprintTrigger = blueprint.trigger || 'payout';
      if (blueprintTrigger !== trigger) continue;
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

  function triggerQualityActionEvents({
    definition,
    assetState,
    instance,
    instanceIndex,
    action,
    context: additionalContext = {}
  }) {
    if (!definition || !instance || !action) return [];
    const resolvedAssetState = assetState || getAssetState(definition.id);
    const resolvedInstanceIndex =
      typeof instanceIndex === 'number' && instanceIndex >= 0
        ? instanceIndex
        : resolvedAssetState?.instances?.indexOf(instance) ?? -1;
    return maybeTriggerAssetEvents({
      definition,
      assetState: resolvedAssetState,
      instance,
      instanceIndex: resolvedInstanceIndex,
      trigger: 'qualityAction',
      context: { ...additionalContext, action }
    });
  }

  return {
    getAssetEvents,
    hasEventWithTone,
    maybeTriggerAssetEvents,
    triggerQualityActionEvents
  };
}

export function getAssetEventsForState(state, assetId, instanceId) {
  return getAssetEvents(state, assetId, instanceId);
}
