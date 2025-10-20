import { structuredClone } from '../../core/helpers.js';
import audiobookNarration from './market/audiobookNarration.js';
import audienceCall from './market/audienceCall.js';
import bundlePush from './market/bundlePush.js';
import dataEntry from './market/dataEntry.js';
import dropshipPackParty from './market/dropshipPackParty.js';
import eventPhotoGig from './market/eventPhotoGig.js';
import freelance from './market/freelance.js';
import popUpWorkshop from './market/popUpWorkshop.js';
import saasBugSquash from './market/saasBugSquash.js';
import streetPromoSprint from './market/streetPromoSprint.js';
import surveySprint from './market/surveySprint.js';
import virtualAssistant from './market/virtualAssistant.js';
import vlogEditRush from './market/vlogEditRush.js';

const DEFAULT_SEATS = 1;
const GLOBAL_MAX_ACTIVE = 6;

const toNumber = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseBaseValues = base => ({
  hours: toNumber(base.timeHours),
  payout: toNumber(base.payout)
});

const instantiateMarket = (definition, base = {}) => {
  if (!definition) {
    return null;
  }

  const context = parseBaseValues(base);
  const metadata = typeof definition.metadata === 'function'
    ? definition.metadata(context)
    : structuredClone(definition.metadata || {});
  const variants = (definition.variants || []).map(entry => {
    if (typeof entry === 'function') {
      return entry(context);
    }
    return structuredClone(entry);
  });

  const maxActive = definition.maxActive ?? GLOBAL_MAX_ACTIVE;

  return {
    category: definition.category,
    seats: definition.seats ?? DEFAULT_SEATS,
    slotsPerRoll: definition.slotsPerRoll,
    maxActive: Math.min(maxActive, GLOBAL_MAX_ACTIVE),
    metadata,
    variants
  };
};

const MARKET_DEFINITIONS = {
  audiobookNarration,
  audienceCall,
  bundlePush,
  dataEntry,
  dropshipPackParty,
  eventPhotoGig,
  freelance,
  popUpWorkshop,
  saasBugSquash,
  streetPromoSprint,
  surveySprint,
  virtualAssistant,
  vlogEditRush
};

const MARKET_BUILDERS = Object.fromEntries(
  Object.entries(MARKET_DEFINITIONS).map(([key, definition]) => [
    key,
    base => instantiateMarket(definition, base)
  ])
);

export function getHustleMarketConfig(key, baseConfig = {}) {
  const builder = MARKET_BUILDERS[key];
  if (!builder) {
    return null;
  }
  const config = builder(baseConfig || {});
  return config ? structuredClone(config) : null;
}

