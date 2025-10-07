import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { assignInstanceToNiche } from '../../../game/assets/niches.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import { formatBlogpressModel, buildBlogpressPricing } from '../../blogpress/model/shared.js';

function buildBlogpressModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'blog') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta: 'BlogPress locked' },
      pricing: null,
      launch: null
    };
  }

  const lock = buildSkillLock(state, 'blogpress');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta: lock.meta },
      pricing: null,
      launch: null,
      lock
    };
  }

  const { summary, instances, nicheOptions } = formatBlogpressModel({ definition, state });
  const pricing = buildBlogpressPricing(definition, upgradeDefinitions, { nicheOptions });
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const launch = launchAction
    ? {
        label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
        disabled: typeof launchAction.disabled === 'function' ? launchAction.disabled(state) : Boolean(launchAction.disabled),
        onClick: launchAction.onClick || null,
        availability
      }
    : {
        label: 'Launch Blog',
        disabled: availability.disabled,
        onClick: null,
        availability
      };

  return {
    definition,
    instances,
    summary,
    pricing,
    launch
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder(
  'blogpress',
  (registries = {}, context = {}) =>
    buildBlogpressModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
