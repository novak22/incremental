import nicheDefinitions from '../../game/assets/nicheData.js';

let cachedNicheIds = null;

function getNicheIdSet() {
  if (!cachedNicheIds) {
    cachedNicheIds = new Set(nicheDefinitions.map(entry => entry.id));
  }
  return cachedNicheIds;
}

export function isValidNicheId(id) {
  if (typeof id !== 'string' || !id) return false;
  return getNicheIdSet().has(id);
}

export function rollInitialNicheScore() {
  const min = 25;
  const max = 95;
  const spread = max - min;
  return Math.max(0, Math.min(100, Math.round(min + Math.random() * spread)));
}

export function ensureNicheStateShape(target, { fallbackDay = 1 } = {}) {
  if (!target) return;

  target.niches = target.niches || {};
  const nicheState = target.niches;
  nicheState.popularity = nicheState.popularity || {};

  const validIds = getNicheIdSet();
  for (const id of Object.keys(nicheState.popularity)) {
    if (!validIds.has(id)) {
      delete nicheState.popularity[id];
    }
  }

  for (const definition of nicheDefinitions) {
    const entry = nicheState.popularity[definition.id] || {};
    const score = Number(entry.score);
    const previousScore = Number(entry.previousScore);
    nicheState.popularity[definition.id] = {
      score: Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : rollInitialNicheScore(),
      previousScore: Number.isFinite(previousScore)
        ? Math.max(0, Math.min(100, Math.round(previousScore)))
        : null
    };
  }

  const storedDay = Number(nicheState.lastRollDay);
  nicheState.lastRollDay = Number.isFinite(storedDay) ? storedDay : fallbackDay;
}

export default {
  ensureNicheStateShape,
  isValidNicheId,
  rollInitialNicheScore
};
