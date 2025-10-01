import { getAssets, getHustles, getUpgrades } from '../registryService.js';
import { getState, getAssetState, getUpgradeState } from '../../core/state.js';
import { getUpgradeDefinition, getAssetDefinition } from '../../core/state/registry.js';
import { toNumber } from '../../core/helpers.js';
import { assetRequirementsMet, listAssetRequirementDescriptors, KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../requirements.js';
import { getQualityActions, canPerformQualityAction, getQualityActionUsage } from '../assets/quality.js';
import { describeHustleRequirements, areHustleRequirementsMet } from '../hustles/helpers.js';
import { canHireAssistant, getAssistantCount, ASSISTANT_CONFIG } from '../assistant.js';
import { COFFEE_LIMIT } from '../../core/constants.js';

function createKey(sourceType, sourceId, actionId) {
  return `${sourceType}:${sourceId}:${actionId}`;
}

function resolveActionLabel(action, fallback) {
  if (!action) return fallback;
  if (typeof action.label === 'function') {
    try {
      return action.label();
    } catch (error) {
      return fallback;
    }
  }
  if (typeof action.label === 'string' && action.label.length) {
    return action.label;
  }
  return fallback;
}

function describeQualityRequirements(definition, action, state) {
  const assetState = getAssetState(definition.id, state);
  const totalInstances = assetState.instances?.length || 0;
  const activeInstances = (assetState.instances || []).filter(instance => instance.status === 'active');
  const usageEntries = activeInstances.map(instance => ({
    instance,
    usage: getQualityActionUsage(definition, instance, action)
  }));
  const availableInstances = activeInstances.filter(instance => canPerformQualityAction(definition, instance, action, state));
  const descriptors = [
    {
      type: 'assetInstance',
      assetId: definition.id,
      label: `${definition.singular || definition.name} active`,
      met: activeInstances.length > 0,
      progress: { active: activeInstances.length, total: totalInstances }
    }
  ];
  if (activeInstances.length > 0) {
    const totalRemaining = usageEntries.reduce((sum, entry) => sum + entry.usage.remainingUses, 0);
    const totalLimit = usageEntries.reduce((sum, entry) => sum + entry.usage.dailyLimit, 0);
    descriptors.push({
      type: 'dailyUsage',
      label: 'Daily juice left',
      met: totalRemaining > 0,
      progress: { remaining: totalRemaining, total: totalLimit }
    });
    descriptors.push({
      type: 'availability',
      label: 'Ready right now',
      met: availableInstances.length > 0,
      progress: { available: availableInstances.length, total: activeInstances.length }
    });
  }
  return descriptors;
}

function describeStudyStatus(hustle, state) {
  if (!hustle.studyTrackId) return [];
  const track = KNOWLEDGE_TRACKS[hustle.studyTrackId];
  const progress = getKnowledgeProgress(hustle.studyTrackId, state);
  if (!track || !progress) return [];
  return [
    {
      type: 'study',
      id: hustle.studyTrackId,
      label: track.name,
      met: !progress.enrolled && !progress.completed,
      progress: {
        enrolled: progress.enrolled,
        completed: progress.completed,
        daysCompleted: progress.daysCompleted,
        totalDays: track.days
      }
    }
  ];
}

function describeUpgradeRequirements(definition, state) {
  const requirements = Array.isArray(definition.requirements) ? definition.requirements : [];
  if (!requirements.length) return [];
  return requirements.map(req => {
    switch (req.type) {
      case 'upgrade': {
        const upgradeDef = getUpgradeDefinition(req.id);
        const upgradeState = getUpgradeState(req.id, state);
        return {
          type: 'upgrade',
          id: req.id,
          label: upgradeDef?.name || req.id,
          met: Boolean(upgradeState?.purchased)
        };
      }
      case 'experience': {
        const assetDef = getAssetDefinition(req.assetId);
        const need = Math.max(0, Number(req.count) || 0);
        const assetState = getAssetState(req.assetId, state);
        const have = (assetState.instances || []).filter(instance => instance.status === 'active').length;
        return {
          type: 'experience',
          assetId: req.assetId,
          label: `${need} ${(assetDef?.singular || assetDef?.name || req.assetId)}${need === 1 ? '' : 's'}`,
          met: have >= need,
          progress: { have, need }
        };
      }
      case 'knowledge': {
        const track = KNOWLEDGE_TRACKS[req.id];
        const progress = getKnowledgeProgress(req.id, state);
        return {
          type: 'knowledge',
          id: req.id,
          label: track?.name || req.id,
          met: progress.completed,
          progress: {
            daysCompleted: progress.daysCompleted,
            totalDays: track?.days ?? 0
          }
        };
      }
      default:
        return { type: req.type || 'unknown', met: false };
    }
  });
}

function buildAssetEntries() {
  return getAssets().map(definition => {
    const action = definition.action || {};
    const actionId = action.id || 'launch';
    const timeCost = Math.max(0, toNumber(definition.setup?.hoursPerDay, 0));
    const moneyCost = Math.max(0, toNumber(definition.setup?.cost, 0));
    const durationDays = Math.max(0, toNumber(definition.setup?.days, 0));
    return {
      key: createKey('asset', definition.id, actionId),
      sourceType: 'asset',
      sourceId: definition.id,
      sourceName: definition.name,
      actionId,
      category: 'setup',
      timeCost,
      moneyCost,
      durationDays,
      tags: {
        group: definition.tag?.type || null
      },
      resolveLabel: state => resolveActionLabel(action, `Launch ${definition.singular || definition.name}`),
      describeRequirements: state => listAssetRequirementDescriptors(definition, state),
      isAvailable: state => {
        if (!state) return false;
        if (timeCost > 0 && state.timeLeft < timeCost) return false;
        if (moneyCost > 0 && state.money < moneyCost) return false;
        return assetRequirementsMet(definition, state);
      }
    };
  });
}

function buildQualityEntries() {
  const entries = [];
  for (const definition of getAssets()) {
    const actions = getQualityActions(definition) || [];
    for (const action of actions) {
      const actionId = action.id || action.label;
      const timeCost = Math.max(0, toNumber(action.time, 0));
      const moneyCost = Math.max(0, toNumber(action.cost, 0));
      entries.push({
        key: createKey('quality', definition.id, actionId),
        sourceType: 'quality',
        sourceId: definition.id,
        sourceName: definition.name,
        actionId,
        category: 'quality',
        timeCost,
        moneyCost,
        tags: {
          group: definition.tag?.type || null
        },
        resolveLabel: () => action.label,
        describeRequirements: state => describeQualityRequirements(definition, action, state),
        isAvailable: state => {
          if (!state) return false;
          if (timeCost > 0 && state.timeLeft < timeCost) return false;
          if (moneyCost > 0 && state.money < moneyCost) return false;
          const assetState = getAssetState(definition.id, state);
          const activeInstances = (assetState.instances || []).filter(instance => instance.status === 'active');
          if (!activeInstances.length) return false;
          return activeInstances.some(instance => canPerformQualityAction(definition, instance, action, state));
        }
      });
    }
  }
  return entries;
}

function buildHustleEntries() {
  return getHustles().map(definition => {
    const action = definition.action || {};
    const actionId = action.id || 'action';
    const timeCost = Math.max(0, toNumber(action.timeCost, 0));
    const moneyCost = Math.max(0, toNumber(action.moneyCost, 0));
    return {
      key: createKey('hustle', definition.id, actionId),
      sourceType: definition.tag?.type === 'study' ? 'study' : 'hustle',
      sourceId: definition.id,
      sourceName: definition.name,
      actionId,
      category: definition.tag?.type || 'instant',
      timeCost,
      moneyCost,
      delaySeconds: toNumber(action.delaySeconds, 0),
      tags: {
        group: definition.tag?.type || null
      },
      resolveLabel: () => resolveActionLabel(action, definition.action?.label || definition.name),
      describeRequirements: state => {
        const base = describeHustleRequirements(definition, state);
        if (definition.tag?.type === 'study') {
          return [...base, ...describeStudyStatus(definition, state)];
        }
        return base;
      },
      isAvailable: state => {
        if (!state) return false;
        if (definition.tag?.type === 'study') {
          const trackId = definition.studyTrackId;
          if (!trackId) return false;
          const progress = getKnowledgeProgress(trackId, state);
          if (progress.completed || progress.enrolled) return false;
          if (moneyCost > 0 && state.money < moneyCost) return false;
          return true;
        }
        if (timeCost > 0 && state.timeLeft < timeCost) return false;
        if (moneyCost > 0 && state.money < moneyCost) return false;
        return areHustleRequirementsMet(definition, state);
      }
    };
  });
}

function upgradeDailyLimitDescriptor(definition, state) {
  if (definition.id !== 'coffee') return [];
  const upgrade = getUpgradeState('coffee', state);
  const used = Number(upgrade.usedToday) || 0;
  return [
    {
      type: 'limit',
      label: `Daily limit (${COFFEE_LIMIT})`,
      met: used < COFFEE_LIMIT,
      progress: { used, limit: COFFEE_LIMIT }
    }
  ];
}

function describeAssistantRequirement(state) {
  const count = getAssistantCount(state);
  return [
    {
      type: 'limit',
      label: `Team size < ${ASSISTANT_CONFIG.maxAssistants}`,
      met: count < ASSISTANT_CONFIG.maxAssistants,
      progress: { have: count, limit: ASSISTANT_CONFIG.maxAssistants }
    }
  ];
}

function buildUpgradeEntries() {
  return getUpgrades().map(definition => {
    const action = definition.action || {};
    const actionId = action.id || 'activate';
    const timeCost = Math.max(0, toNumber(action.timeCost, 0));
    const moneyCost = Math.max(0, toNumber(action.moneyCost, 0));
    return {
      key: createKey('upgrade', definition.id, actionId),
      sourceType: 'upgrade',
      sourceId: definition.id,
      sourceName: definition.name,
      actionId,
      category: 'upgrade',
      timeCost,
      moneyCost,
      tags: {
        group: definition.tag?.type || null
      },
      resolveLabel: () => resolveActionLabel(action, definition.name),
      describeRequirements: state => {
        const descriptors = describeUpgradeRequirements(definition, state);
        if (definition.id === 'assistant') {
          return [...descriptors, ...describeAssistantRequirement(state)];
        }
        if (definition.id === 'coffee') {
          return [...descriptors, ...upgradeDailyLimitDescriptor(definition, state)];
        }
        return descriptors;
      },
      isAvailable: state => {
        if (!state) return false;
        if (definition.id === 'assistant') {
          if (!canHireAssistant(state)) return false;
          if (moneyCost > 0 && state.money < moneyCost) return false;
          return true;
        }
        if (definition.id === 'coffee') {
          const coffeeState = getUpgradeState('coffee', state);
          if (moneyCost > 0 && state.money < moneyCost) return false;
          if (state.timeLeft <= 0) return false;
          return (Number(coffeeState.usedToday) || 0) < COFFEE_LIMIT;
        }
        const upgradeState = getUpgradeState(definition.id, state);
        if (upgradeState?.purchased) return false;
        if (moneyCost > 0 && state.money < moneyCost) return false;
        const requirements = describeUpgradeRequirements(definition, state);
        if (requirements.some(req => req.met === false)) {
          return false;
        }
        return true;
      }
    };
  });
}

let catalogCache = null;

function getCatalogCache() {
  if (!catalogCache) {
    catalogCache = [
      ...buildAssetEntries(),
      ...buildQualityEntries(),
      ...buildHustleEntries(),
      ...buildUpgradeEntries()
    ];
  }
  return catalogCache;
}

function applyFilters(entry, filters = {}) {
  if (!filters) return true;
  if (filters.sourceTypes && !filters.sourceTypes.includes(entry.sourceType)) {
    return false;
  }
  if (filters.sourceId && entry.sourceId !== filters.sourceId) {
    return false;
  }
  if (filters.actionId && entry.actionId !== filters.actionId) {
    return false;
  }
  if (filters.category && entry.category !== filters.category) {
    return false;
  }
  if (filters.maxTime != null && entry.timeCost > filters.maxTime) {
    return false;
  }
  if (filters.groups && entry.tags?.group && !filters.groups.includes(entry.tags.group)) {
    return false;
  }
  return true;
}

export function evaluateCatalogEntry(entry, state = getState()) {
  const label = entry.resolveLabel(state);
  const requirements = entry.describeRequirements ? entry.describeRequirements(state) : [];
  const timeSatisfied = !entry.timeCost || (state ? state.timeLeft >= entry.timeCost : false);
  const moneySatisfied = !entry.moneyCost || (state ? state.money >= entry.moneyCost : false);
  const requirementSatisfied = requirements.every(req => req.met !== false);
  const available = Boolean(entry.isAvailable ? entry.isAvailable(state) : (timeSatisfied && moneySatisfied && requirementSatisfied));
  return {
    ...entry,
    label,
    requirements,
    available,
    timeSatisfied,
    moneySatisfied,
    requirementSatisfied
  };
}

export function listCatalog(state = getState(), filters = {}) {
  return getCatalogCache()
    .filter(entry => applyFilters(entry, filters))
    .map(entry => evaluateCatalogEntry(entry, state));
}
