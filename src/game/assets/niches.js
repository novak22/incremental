import { executeAction } from '../actions.js';
import { addLog } from '../../core/log.js';
import { getAssetState, getState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { getNicheDefinition, getNicheDefinitions } from './nicheData.js';
import { NICHE_ANALYTICS_HISTORY_LIMIT } from '../../core/state/niches.js';
import { markDirty } from '../../core/events/invalidationBus.js';
import {
  createNeutralPopularitySnapshot,
  sanitizePopularitySnapshot
} from '../niches/popularitySnapshot.js';

export function ensureNicheState(target = getState()) {
  if (!target) return null;
  if (!target.niches || typeof target.niches !== 'object') {
    target.niches = {};
  }
  const data = target.niches;
  data.popularity = data.popularity || {};
  if (!Array.isArray(data.watchlist)) {
    data.watchlist = [];
  }
  if (!Array.isArray(data.analyticsHistory)) {
    data.analyticsHistory = [];
  } else if (data.analyticsHistory.length > NICHE_ANALYTICS_HISTORY_LIMIT) {
    data.analyticsHistory = data.analyticsHistory.slice(-NICHE_ANALYTICS_HISTORY_LIMIT);
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
    const entry = data.popularity[definition.id];
    data.popularity[definition.id] = entry
      ? sanitizePopularitySnapshot(entry)
      : createNeutralPopularitySnapshot();
  });

  const storedDay = Number(data.lastRollDay);
  data.lastRollDay = Number.isFinite(storedDay) ? storedDay : target.day || 1;

  return data;
}

function getNichePopularity(nicheId, state = getState()) {
  if (!nicheId) return null;
  const target = ensureNicheState(state);
  if (!target) return null;
  const entry = target.popularity?.[nicheId];
  if (!entry) return null;
  const sanitized = sanitizePopularitySnapshot(entry);
  target.popularity[nicheId] = sanitized;
  return {
    id: nicheId,
    ...sanitized
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

function getAssignableNiches(definition) {
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
      popularity: getNichePopularity(niche.id, state) || {
        id: niche.id,
        ...createNeutralPopularitySnapshot()
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
    if (changed) {
      markDirty(['cards', 'dashboard']);
    }
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

    markDirty({ cards: true, dashboard: true, player: true });

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

