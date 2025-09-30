import { executeAction } from '../actions.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getNicheDefinition, getNicheDefinitions } from './nicheData.js';

const POPULARITY_MIN = 25;
const POPULARITY_MAX = 95;
const POPULARITY_BANDS = [
  { min: 85, label: 'Blazing', tone: 'hot', summary: 'Audiences are ravenous — capitalize now.' },
  { min: 70, label: 'Surging', tone: 'warm', summary: 'Momentum is building fast and payouts love it.' },
  { min: 55, label: 'Trending', tone: 'warm', summary: 'Steady waves of interest keep income humming.' },
  { min: 40, label: 'Steady', tone: 'steady', summary: 'Reliable attention with room for creative twists.' },
  { min: 25, label: 'Cooling', tone: 'cool', summary: 'Interest is dipping — refresh your hooks soon.' },
  { min: 0, label: 'Dormant', tone: 'cold', summary: 'Only superfans are tuning in today.' }
];
const MULTIPLIER_MIN = 0.75;
const MULTIPLIER_MAX = 1.3;

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rollPopularityScore() {
  const spread = POPULARITY_MAX - POPULARITY_MIN;
  const roll = Math.random();
  return clampScore(POPULARITY_MIN + roll * spread);
}

function ensureNicheState(target = getState()) {
  if (!target) return null;
  if (!target.niches || typeof target.niches !== 'object') {
    target.niches = {};
  }
  const data = target.niches;
  data.popularity = data.popularity || {};
  if (!Array.isArray(data.watchlist)) {
    data.watchlist = [];
  }

  const definitions = getNicheDefinitions();
  const knownIds = new Set(definitions.map(entry => entry.id));

  Object.keys(data.popularity).forEach(id => {
    if (!knownIds.has(id)) {
      delete data.popularity[id];
    }
  });

  if (Array.isArray(data.watchlist)) {
    data.watchlist = data.watchlist.filter(id => typeof id === 'string' && knownIds.has(id));
  } else {
    data.watchlist = [];
  }

  definitions.forEach(definition => {
    const entry = data.popularity[definition.id] || {};
    const score = clampScore(entry.score);
    const previous = clampScore(entry.previousScore);
    if (score === null) {
      data.popularity[definition.id] = {
        score: rollPopularityScore(),
        previousScore: previous
      };
    } else {
      data.popularity[definition.id] = {
        score,
        previousScore: previous
      };
    }
  });

  const storedDay = Number(data.lastRollDay);
  data.lastRollDay = Number.isFinite(storedDay) ? storedDay : target.day || 1;

  return data;
}

function describePopularity(score) {
  const band = POPULARITY_BANDS.find(entry => score >= entry.min) || POPULARITY_BANDS.at(-1);
  return {
    label: band?.label || 'Unknown',
    tone: band?.tone || 'steady',
    summary: band?.summary || ''
  };
}

function calculateMultiplier(score) {
  const normalized = Math.max(0, Math.min(1, score / 100));
  const range = MULTIPLIER_MAX - MULTIPLIER_MIN;
  const value = MULTIPLIER_MIN + normalized * range;
  return Math.max(0, Math.round(value * 100) / 100);
}

export function rerollNichePopularity({ force = false } = {}) {
  const state = getState();
  if (!state) return null;
  const data = ensureNicheState(state);
  if (!data) return null;
  const currentDay = state.day || 1;
  if (!force && Number(data.lastRollDay) === currentDay) {
    return data.popularity;
  }

  const definitions = getNicheDefinitions();
  definitions.forEach(definition => {
    const entry = data.popularity[definition.id] || {};
    data.popularity[definition.id] = {
      previousScore: clampScore(entry.score),
      score: rollPopularityScore()
    };
  });
  data.lastRollDay = currentDay;
  return data.popularity;
}

export function getNichePopularity(nicheId, state = getState()) {
  if (!nicheId) return null;
  const target = ensureNicheState(state);
  if (!target) return null;
  const entry = target.popularity?.[nicheId];
  if (!entry) return null;
  const score = clampScore(entry.score) ?? rollPopularityScore();
  const previousScore = clampScore(entry.previousScore);
  const descriptor = describePopularity(score);
  const multiplier = calculateMultiplier(score);
  const delta = Number.isFinite(previousScore) ? score - previousScore : null;
  return {
    id: nicheId,
    score,
    previousScore,
    delta,
    multiplier,
    ...descriptor
  };
}

export function getInstanceNicheInfo(instance, state = getState()) {
  if (!instance?.nicheId) return null;
  const definition = getNicheDefinition(instance.nicheId);
  if (!definition) return null;
  const popularity = getNichePopularity(instance.nicheId, state);
  if (!popularity) return null;
  return { definition, popularity };
}

export function getAssignableNiches(definition) {
  if (!definition) return [];
  const tags = new Set(Array.isArray(definition.tags) ? definition.tags : []);
  const definitions = getNicheDefinitions();
  const matches = definitions.filter(niche => {
    if (!Array.isArray(niche.tags) || !niche.tags.length) return true;
    return niche.tags.some(tag => tags.has(tag));
  });
  return matches.length ? matches : definitions;
}

export function getAssignableNicheSummaries(definition, state = getState()) {
  return getAssignableNiches(definition)
    .map(niche => ({
      definition: niche,
      popularity: getNichePopularity(niche.id, state)
    }))
    .map(entry => ({
      ...entry,
      popularity: entry.popularity || {
        id: entry.definition.id,
        score: 0,
        delta: null,
        multiplier: 1,
        label: 'Unknown',
        tone: 'steady',
        summary: 'Popularity data pending.'
      }
    }))
    .sort((a, b) => (b.popularity?.score || 0) - (a.popularity?.score || 0));
}

export function getNicheRoster(state = getState()) {
  const definitions = getNicheDefinitions();
  return definitions
    .map(definition => ({
      definition,
      popularity: getNichePopularity(definition.id, state)
    }))
    .sort((a, b) => (b.popularity?.score || 0) - (a.popularity?.score || 0));
}

export function getNicheWatchlist(state = getState()) {
  const data = ensureNicheState(state);
  if (!data) return new Set();
  const entries = Array.isArray(data.watchlist) ? data.watchlist : [];
  return new Set(entries.filter(id => typeof id === 'string'));
}

export function setNicheWatchlist(nicheId, watchlisted) {
  if (!nicheId) return false;
  let changed = false;
  executeAction(() => {
    const data = ensureNicheState();
    if (!data) return;
    const list = new Set(Array.isArray(data.watchlist) ? data.watchlist : []);
    const hasEntry = list.has(nicheId);
    if (watchlisted && !hasEntry) {
      list.add(nicheId);
      changed = true;
    } else if (!watchlisted && hasEntry) {
      list.delete(nicheId);
      changed = true;
    }
    data.watchlist = Array.from(list);
  });
  return changed;
}

export function getInstanceNicheEffect(instance, state = getState()) {
  const info = getInstanceNicheInfo(instance, state);
  if (!info) return null;
  return {
    id: info.definition.id,
    definition: info.definition,
    ...info.popularity
  };
}

export function assignInstanceToNiche(assetId, instanceId, nicheId) {
  const assetDefinition = getAssetDefinition(assetId);
  if (!assetDefinition) return false;
  const allowed = new Set(getAssignableNiches(assetDefinition).map(niche => niche.id));
  const normalized = typeof nicheId === 'string' && allowed.has(nicheId) ? nicheId : null;

  let changed = false;
  executeAction(() => {
    const state = getState();
    const assetState = getAssetState(assetId, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const index = instances.findIndex(entry => entry?.id === instanceId);
    if (index === -1) return;
    const instance = instances[index];
    const current = typeof instance.nicheId === 'string' ? instance.nicheId : null;
    if (current === normalized) return;
    instance.nicheId = normalized;
    if (!normalized) {
      delete instance.nicheId;
    }
    changed = true;

    const labelBase = assetDefinition.singular || assetDefinition.name || 'Asset';
    const label = `${labelBase} #${index + 1}`;
    if (normalized) {
      const niche = getNicheDefinition(normalized);
      const popularity = getNichePopularity(normalized, state);
      const hype = popularity?.label ? `${popularity.label.toLowerCase()} demand` : 'fresh buzz';
      addLog(`${label} pivoted into the ${niche?.name || 'new'} niche to chase ${hype}.`, 'info');
    } else {
      addLog(`${label} is taking a breather from niche targeting today.`, 'info');
    }
  });

  return changed;
}

