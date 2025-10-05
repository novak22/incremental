import { getNicheDefinitions } from '../assets/nicheData.js';
import { NICHE_EVENT_BLUEPRINTS } from './config.js';
import { logNicheEventStart } from './logging.js';
import { getNicheEvents } from './getNicheEvents.js';

export function createNicheEvents({ clampChance, buildEventFromBlueprint, hasEventWithTone }) {
  function maybeSpawnNicheEvents({ state, day }) {
    const definitions = getNicheDefinitions();
    const created = [];
    for (const definition of definitions) {
      for (const blueprint of NICHE_EVENT_BLUEPRINTS) {
        if (typeof blueprint.appliesTo === 'function' && !blueprint.appliesTo({ definition, state })) continue;
        const existing = getNicheEvents(state, definition.id);
        if (hasEventWithTone(existing, blueprint.tone, blueprint.id)) continue;
        const chance = clampChance(
          typeof blueprint.chance === 'function' ? blueprint.chance({ definition, state }) : blueprint.chance
        );
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

  return {
    getNicheEvents,
    maybeSpawnNicheEvents
  };
}

export function getNicheEventsForState(state, nicheId) {
  return getNicheEvents(state, nicheId);
}

export { getNicheEvents };
