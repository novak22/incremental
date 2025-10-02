import { buildAssetModels } from '../../../cards/model/index.js';

const assetModelGroupByDefinition = new Map();
const assetDefinitionLookup = new Map();
let currentAssetDefinitions = [];
let currentAssetModels = { groups: [], launchers: [] };

export function normalizeModelData(models = {}) {
  return {
    groups: Array.isArray(models?.groups) ? models.groups : [],
    launchers: Array.isArray(models?.launchers) ? models.launchers : []
  };
}

function cacheAssetModels(models = {}) {
  const normalized = normalizeModelData(models);
  currentAssetModels = normalized;
  assetModelGroupByDefinition.clear();
  normalized.groups.forEach(group => {
    if (!group?.id) return;
    const definitions = Array.isArray(group.definitions) ? group.definitions : [];
    definitions.forEach(entry => {
      const definitionId = entry?.id || entry?.definition?.id;
      if (definitionId) {
        assetModelGroupByDefinition.set(definitionId, group);
      }
    });
  });
}

function cacheAssetDefinitions(definitions = []) {
  currentAssetDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  assetDefinitionLookup.clear();
  currentAssetDefinitions.forEach(definition => {
    if (definition?.id) {
      assetDefinitionLookup.set(definition.id, definition);
    }
  });
}

export function storeAssetCaches({ definitions = [], models = {} } = {}) {
  if (definitions.length) {
    cacheAssetDefinitions(definitions);
  }
  cacheAssetModels(models);
}

export function resolveAssetModels(definitions = [], models = {}) {
  const normalized = normalizeModelData(models);
  if ((normalized.groups?.length ?? 0) > 0 || (normalized.launchers?.length ?? 0) > 0) {
    return normalized;
  }
  if (definitions.length) {
    const built = buildAssetModels(definitions);
    return normalizeModelData(built);
  }
  return normalized;
}

export function isAssetDefinition(id) {
  return assetDefinitionLookup.has(id);
}

export function getGroupForDefinition(definitionId) {
  return assetModelGroupByDefinition.get(definitionId) ?? null;
}

export function getCurrentAssetModels() {
  return currentAssetModels;
}

export function getDefinitionById(id) {
  return assetDefinitionLookup.get(id) ?? null;
}

export function resolveDefinitionReference(definition, instance, group) {
  if (definition) return definition;
  if (instance?.definition) return instance.definition;
  const definitionId = instance?.definitionId || instance?.definition?.id;
  if (definitionId && assetDefinitionLookup.has(definitionId)) {
    return assetDefinitionLookup.get(definitionId);
  }
  if (Array.isArray(group?.definitions)) {
    const match = group.definitions.find(entry => {
      const entryId = entry?.definition?.id || entry?.id;
      return entryId && (entryId === definitionId || entryId === instance?.id);
    });
    if (match?.definition) {
      return match.definition;
    }
  }
  if (instance?.id && assetDefinitionLookup.has(instance.id)) {
    return assetDefinitionLookup.get(instance.id);
  }
  return null;
}

export function resetAssetModelCache() {
  assetModelGroupByDefinition.clear();
  assetDefinitionLookup.clear();
  currentAssetDefinitions = [];
  currentAssetModels = { groups: [], launchers: [] };
}
