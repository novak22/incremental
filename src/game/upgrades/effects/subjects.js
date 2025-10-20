import { ensureArray } from '../../../core/helpers.js';
import { normalizeScope } from './parsers.js';

function createEmptyScope() {
  return normalizeScope();
}

function hasIntersection(a = [], b = []) {
  if (!a.length || !b.length) return false;
  const set = new Set(a);
  return b.some(value => set.has(value));
}

function normalizeTarget(target) {
  if (!target || typeof target !== 'object') {
    return createEmptyScope();
  }

  const scope = {
    ids: ensureArray(target.ids),
    tags: ensureArray(target.tags),
    families: ensureArray(target.families),
    categories: ensureArray(target.categories)
  };

  return normalizeScope(scope);
}

export function subjectMatches(target, subject) {
  const normalized = normalizeTarget(target);
  if (
    !normalized.ids.length &&
    !normalized.tags.length &&
    !normalized.families.length &&
    !normalized.categories.length
  ) {
    return true;
  }

  if (normalized.ids.length && normalized.ids.includes(subject.id)) return true;
  if (normalized.families.length && normalized.families.includes(subject.family)) return true;
  if (normalized.categories.length && normalized.categories.includes(subject.category)) return true;

  const subjectTags = ensureArray(subject.tags).filter(Boolean);
  if (normalized.tags.length && hasIntersection(normalized.tags, subjectTags)) {
    return true;
  }

  return false;
}

export function actionMatches(affectsActions, actionType) {
  if (!affectsActions) return true;
  const normalized = normalizeTarget({ ids: affectsActions.types });
  if (!normalized.ids.length) return true;
  return normalized.ids.includes(actionType);
}

export function prepareSubject(subjectType, subjectId, { getAssetDefinition, getHustleDefinition }) {
  if (subjectType === 'asset') {
    const definition = typeof subjectId === 'string' ? getAssetDefinition(subjectId) : subjectId;
    if (!definition) return null;
    return {
      id: definition.id,
      family: definition.family || null,
      category: definition.category || null,
      tags: ensureArray(definition.tags)
    };
  }

  if (subjectType === 'hustle') {
    const definition = typeof subjectId === 'string' ? getHustleDefinition(subjectId) : subjectId;
    if (!definition) return null;
    return {
      id: definition.id,
      family: definition.family || null,
      category: definition.category || null,
      tags: ensureArray(definition.tags)
    };
  }

  return null;
}
