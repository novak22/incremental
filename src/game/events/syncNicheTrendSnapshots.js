import { getNicheDefinitions } from '../assets/nicheData.js';
import { getNicheEvents } from './getNicheEvents.js';
import { computePopularitySnapshot, createNeutralPopularitySnapshot } from '../niches/popularitySnapshot.js';

function aggregateMultiplier(events = []) {
  return events.reduce((product, event) => {
    if (!event) return product;
    if (event.stat !== 'income' || event.modifierType !== 'percent') return product;
    if (!Number.isFinite(Number(event.currentPercent))) return product;
    if (event.remainingDays != null && event.remainingDays <= 0) return product;
    return Math.max(0, product * (1 + Number(event.currentPercent)));
  }, 1);
}

export function syncNicheTrendSnapshots(state) {
  if (!state || typeof state !== 'object') return null;
  state.niches = state.niches || {};
  const nicheState = state.niches;
  nicheState.popularity = nicheState.popularity || {};

  const definitions = getNicheDefinitions();
  const knownIds = new Set(definitions.map(definition => definition.id));

  for (const id of Object.keys(nicheState.popularity)) {
    if (!knownIds.has(id)) {
      delete nicheState.popularity[id];
    }
  }

  definitions.forEach(definition => {
    const events = getNicheEvents(state, definition.id);
    const multiplier = aggregateMultiplier(events);
    const existing = nicheState.popularity[definition.id] || createNeutralPopularitySnapshot();
    nicheState.popularity[definition.id] = computePopularitySnapshot({ multiplier, existing });
  });

  return nicheState.popularity;
}
