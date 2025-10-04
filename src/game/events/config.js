import { ASSET_PAYOUT_EVENT_BLUEPRINTS } from './blueprints/assetPayout.js';
import { ASSET_QUALITY_EVENT_BLUEPRINTS } from './blueprints/assetQuality.js';
import { NICHE_TREND_BLUEPRINTS } from './blueprints/nicheTrends.js';

export { getInstanceQualityLevel, randomBetween } from './blueprints/utils.js';

export { ASSET_PAYOUT_EVENT_BLUEPRINTS };
export { ASSET_QUALITY_EVENT_BLUEPRINTS };
export { NICHE_TREND_BLUEPRINTS };

export const ASSET_EVENT_BLUEPRINTS = [
  ...ASSET_PAYOUT_EVENT_BLUEPRINTS,
  ...ASSET_QUALITY_EVENT_BLUEPRINTS
];

export const NICHE_EVENT_BLUEPRINTS = [...NICHE_TREND_BLUEPRINTS];
