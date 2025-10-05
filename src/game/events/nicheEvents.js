import { getNicheDefinitions } from '../assets/nicheData.js';
import { NICHE_EVENT_BLUEPRINTS } from './config.js';
import { logNicheEventStart } from './logging.js';
import { getNicheEvents } from './getNicheEvents.js';

export function createNicheEvents({ clampChance, buildEventFromBlueprint, hasEventWithTone }) {
  function resolveWeight(blueprint, context) {
    if (!blueprint) return 0;
    const chance =
      typeof blueprint.chance === 'function' ? blueprint.chance(context) : blueprint.chance;
    const numeric = Number(chance);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 0;
    }
    // When clampChance is provided we still honor its safety rails for negative/NaN inputs.
    // Otherwise we treat the raw chance as a weight for deterministic selection.
    const clamped = clampChance ? clampChance(numeric) : numeric;
    return clamped <= 0 ? 0 : numeric;
  }

  function maybeSpawnNicheEvents({ state, day }) {
    const definitions = getNicheDefinitions();
    const created = [];

    for (const definition of definitions) {
      const existing = getNicheEvents(state, definition.id);
      const active = existing.filter(
        event => event && (event.remainingDays == null || Number(event.remainingDays) > 0)
      );
      if (active.length > 0) {
        continue;
      }

      const candidates = [];
      for (const blueprint of NICHE_EVENT_BLUEPRINTS) {
        const context = { definition, state };
        if (typeof blueprint.appliesTo === 'function' && !blueprint.appliesTo(context)) continue;
        if (hasEventWithTone(existing, blueprint.tone, blueprint.id)) continue;
        const weight = resolveWeight(blueprint, context);
        if (weight <= 0) continue;
        candidates.push({ blueprint, weight, context });
      }

      if (!candidates.length) {
        continue;
      }

      const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
      if (totalWeight <= 0) {
        continue;
      }

      let roll = Math.random() * totalWeight;
      let selected = candidates[candidates.length - 1];
      for (const candidate of candidates) {
        roll -= candidate.weight;
        if (roll <= 0) {
          selected = candidate;
          break;
        }
      }

      const event = buildEventFromBlueprint({
        state,
        blueprint: selected.blueprint,
        target: { type: 'niche', nicheId: definition.id },
        context: selected.context,
        day
      });
      if (event) {
        created.push({ event, definition });
        logNicheEventStart({ event, definition });
      }
    }

    return created;
  }

  return {
    getNicheEvents,
    maybeSpawnNicheEvents
  };
}

export function getNicheEventsForState(state, nicheId) {
  return getNicheEvents(state, nicheId);
}

export { getNicheEvents };
