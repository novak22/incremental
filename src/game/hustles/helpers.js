import { getState } from '../../core/state.js';
import { hustles as hustleConfigs } from '../data/economyConfig.js';
import { buildAssetRequirementDescriptor } from '../requirements.js';

const getConfigRequirements = id => {
  const requirements = hustleConfigs?.[id]?.requirements;
  if (!Array.isArray(requirements)) return [];
  return requirements.map(requirement => ({ ...requirement }));
};

export const AUDIENCE_CALL_REQUIREMENTS = getConfigRequirements('audienceCall');
export const BUNDLE_PUSH_REQUIREMENTS = getConfigRequirements('bundlePush');
export const EVENT_PHOTO_REQUIREMENTS = getConfigRequirements('eventPhotoGig');
export const WORKSHOP_REQUIREMENTS = getConfigRequirements('popUpWorkshop');
export const EDIT_RUSH_REQUIREMENTS = getConfigRequirements('vlogEditRush');
export const PACK_PARTY_REQUIREMENTS = getConfigRequirements('dropshipPackParty');
export const BUG_SQUASH_REQUIREMENTS = getConfigRequirements('saasBugSquash');
export const NARRATION_REQUIREMENTS = getConfigRequirements('audiobookNarration');
export const STREET_PROMO_REQUIREMENTS = getConfigRequirements('streetPromoSprint');

function getHustleRequirements(definition) {
  if (!definition) return [];
  return Array.isArray(definition.requirements) ? definition.requirements : [];
}

function normalizeHustleDailyUsage(definition, state = getState()) {
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

function describeDailyLimit(definition, state = getState()) {
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

export function getHustleDailyUsage(definition, state = getState()) {
  const usage = normalizeHustleDailyUsage(definition, state);
  if (!usage || !Number.isFinite(usage.limit) || usage.limit <= 0) {
    return null;
  }
  const { limit, used, remaining, day } = usage;
  return { limit, used, remaining, day };
}
