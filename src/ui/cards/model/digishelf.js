import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { assignInstanceToNiche } from '../../../game/assets/niches.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  getDigishelfQuickActionIds,
  buildDigishelfCollection,
  buildDigishelfOverview,
  describeDigishelfSummary,
  getDigishelfPlanCopy
} from '../../digishelf/model/shared.js';

function buildDigishelfModel(assetDefinitions = [], state = getState()) {
  const definitionMap = new Map(ensureArray(assetDefinitions).map(definition => [definition?.id, definition]));
  const ebookDefinition = definitionMap.get('ebook') || null;
  const stockDefinition = definitionMap.get('stockPhotos') || null;

  const lock = buildSkillLock(state, 'digishelf');
  if (lock) {
    const meta = lock.meta;
    const buildLocked = () => ({
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta },
      launch: null,
      plan: null
    });
    return {
      ebook: buildLocked(),
      stock: buildLocked(),
      overview: {
        ebooksActive: 0,
        stockActive: 0,
        totalDaily: 0,
        ebookDaily: 0,
        stockDaily: 0,
        meta
      },
      pricing: [],
      summary: { meta, totalActive: 0 },
      lock
    };
  }

  const ebook = buildDigishelfCollection(ebookDefinition, state, {
    planCopy: getDigishelfPlanCopy('ebook')
  });
  const stock = buildDigishelfCollection(stockDefinition, state, {
    planCopy: getDigishelfPlanCopy('stockPhotos')
  });
  const overview = buildDigishelfOverview(ebook.summary, stock.summary, ebook.instances, stock.instances);
  const { meta: summaryMeta, totalActive } = describeDigishelfSummary(overview);
  const pricing = [ebook.plan, stock.plan].filter(Boolean);

  return {
    ebook,
    stock,
    overview: {
      ...overview,
      meta: summaryMeta
    },
    pricing,
    summary: {
      meta: summaryMeta,
      totalActive
    }
  };
}

export function getQuickActionIds(assetId) {
  return getDigishelfQuickActionIds(assetId);
}

export function selectDigishelfNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder('digishelf', (registries = {}, context = {}) =>
  buildDigishelfModel(registries.assets ?? [], context.state)
);
