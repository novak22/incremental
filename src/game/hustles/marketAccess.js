import { structuredClone } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { getRegistrySnapshot } from '../../core/state/registry.js';
import { ensureActionMarketCategoryState } from '../../core/state/slices/actionMarket/state.js';
import { rollDailyOffers } from './market.js';

function clampDay(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const fallbackParsed = Number(fallback);
    if (!Number.isFinite(fallbackParsed) || fallbackParsed <= 0) {
      return 1;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

function resolveTemplates(templates) {
  if (Array.isArray(templates) && templates.length) {
    return templates;
  }
  const registry = getRegistrySnapshot();
  if (Array.isArray(registry?.hustles)) {
    return registry.hustles;
  }
  return [];
}

export function ensureDailyOffersForDay({
  state = getState(),
  templates,
  day,
  now,
  rng,
  category = 'hustle'
} = {}) {
  const workingState = state || getState();
  if (!workingState) {
    return [];
  }

  const currentDay = clampDay(day ?? workingState.day ?? 1, workingState.day ?? 1);
  const marketState = ensureActionMarketCategoryState(workingState, category, { fallbackDay: currentDay });
  const hasOffers = Array.isArray(marketState.offers) && marketState.offers.length > 0;
  const rolledToday = marketState.lastRolledOnDay === currentDay;

  if (rolledToday && hasOffers) {
    return marketState.offers.map(offer => structuredClone(offer));
  }

  const templateList = resolveTemplates(templates);
  return rollDailyOffers({
    templates: templateList,
    day: currentDay,
    now,
    state: workingState,
    rng,
    category
  });
}
