import { countActiveAssetInstances, getState } from '../../core/state.js';
import { buildAssetRequirementDescriptor } from '../requirements.js';

export const AUDIENCE_CALL_REQUIREMENTS = [{ assetId: 'blog', count: 1 }];
export const BUNDLE_PUSH_REQUIREMENTS = [
  { assetId: 'blog', count: 2 },
  { assetId: 'ebook', count: 1 }
];
export const EVENT_PHOTO_REQUIREMENTS = [{ assetId: 'stockPhotos', count: 1 }];
export const WORKSHOP_REQUIREMENTS = [
  { assetId: 'blog', count: 1 },
  { assetId: 'ebook', count: 1 }
];
export const EDIT_RUSH_REQUIREMENTS = [{ assetId: 'vlog', count: 1 }];
export const PACK_PARTY_REQUIREMENTS = [{ assetId: 'dropshipping', count: 1 }];
export const BUG_SQUASH_REQUIREMENTS = [{ assetId: 'saas', count: 1 }];
export const NARRATION_REQUIREMENTS = [{ assetId: 'ebook', count: 1 }];
export const STREET_PROMO_REQUIREMENTS = [{ assetId: 'blog', count: 2 }];

export function getHustleRequirements(definition) {
  if (!definition) return [];
  return Array.isArray(definition.requirements) ? definition.requirements : [];
}

export function normalizeHustleDailyUsage(definition, state = getState()) {
  if (!definition || typeof definition.getDailyUsage !== 'function') {
    const dayFromState = Number(state?.day);
    return {
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      day: Number.isFinite(dayFromState) && dayFromState > 0 ? dayFromState : 1
    };
  }

  const usage = definition.getDailyUsage(state) || {};
  const rawLimit = Number(usage.limit);
  const isLimited = Number.isFinite(rawLimit) && rawLimit > 0;
  const limit = isLimited ? rawLimit : Infinity;
  const used = Math.max(0, Number(usage.used) || 0);
  const rawRemaining = usage.remaining ?? (isLimited ? limit - used : Infinity);
  const remaining = isLimited ? Math.max(0, Number(rawRemaining)) : Infinity;
  const dayFromState = Number(state?.day);
  const dayFromUsage = Number(usage.currentDay);
  const day = Number.isFinite(dayFromState) && dayFromState > 0
    ? dayFromState
    : (Number.isFinite(dayFromUsage) && dayFromUsage > 0 ? dayFromUsage : 1);

  return { limit, used, remaining, day };
}

export function describeDailyLimit(definition, state = getState()) {
  const usage = normalizeHustleDailyUsage(definition, state);
  if (!usage || !Number.isFinite(usage.limit) || usage.limit <= 0) return [];
  const { used, remaining, limit } = usage;
  return [
    {
      type: 'limit',
      label: `Daily runs left: ${remaining}/${limit}`,
      met: remaining > 0,
      progress: {
        used,
        remaining,
        limit
      }
    }
  ];
}

export function describeHustleRequirements(definition, state = getState()) {
  const requirements = getHustleRequirements(definition);
  const descriptors = requirements.map(req => buildAssetRequirementDescriptor(req, state, 'asset'));
  return [...descriptors, ...describeDailyLimit(definition, state)];
}

export function areHustleRequirementsMet(definition, state = getState()) {
  const requirements = getHustleRequirements(definition);
  const assetsMet = requirements.every(req => countActiveAssetInstances(req.assetId, state) >= (Number(req.count) || 1));
  if (!assetsMet) return false;
  const usage = normalizeHustleDailyUsage(definition, state);
  if (usage && Number.isFinite(usage.limit) && usage.limit > 0 && Math.max(0, Number(usage.remaining)) <= 0) {
    return false;
  }
  return true;
}

export function getHustleDailyUsage(definition, state = getState()) {
  const usage = normalizeHustleDailyUsage(definition, state);
  if (!usage || !Number.isFinite(usage.limit) || usage.limit <= 0) {
    return null;
  }
  const { limit, used, remaining, day } = usage;
  return { limit, used, remaining, day };
}
