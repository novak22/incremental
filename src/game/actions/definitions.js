import { createInstantHustle } from '../content/schema.js';
import { getInstantHustleDefinitions } from '../hustles/definitions/instantHustles.js';
import { createKnowledgeHustles } from '../hustles/knowledgeHustles.js';

function applyAvailabilityMetadata(definition) {
  if (!definition) return definition;
  if (!definition.availability) {
    if (definition.dailyLimit) {
      definition.availability = {
        type: 'dailyLimit',
        limit: definition.dailyLimit
      };
    } else {
      definition.availability = { type: 'always' };
    }
  }
  return definition;
}

function applyExpiryMetadata(definition) {
  if (!definition) return definition;
  if (!definition.expiry) {
    definition.expiry = { type: 'permanent' };
  }
  return definition;
}

function applyProgressMetadata(definition, overrides = {}) {
  if (!definition) return definition;
  const base = typeof definition.progress === 'object' && definition.progress !== null
    ? { ...definition.progress }
    : {};
  const merged = { ...overrides, ...base };
  if (!merged.type) {
    merged.type = overrides.type || 'instant';
  }
  if (!merged.completion) {
    merged.completion = overrides.completion || (merged.type === 'instant' ? 'instant' : 'deferred');
  }
  if (overrides.hoursRequired != null && merged.hoursRequired == null) {
    merged.hoursRequired = overrides.hoursRequired;
  }
  if (overrides.hoursPerDay != null && merged.hoursPerDay == null) {
    merged.hoursPerDay = overrides.hoursPerDay;
  }
  if (overrides.daysRequired != null && merged.daysRequired == null) {
    merged.daysRequired = overrides.daysRequired;
  }
  definition.progress = merged;
  return definition;
}

function ensureDefaultActionState(definition) {
  if (!definition) return definition;
  const baseState = typeof definition.defaultState === 'object' && definition.defaultState !== null
    ? definition.defaultState
    : {};
  if (!Array.isArray(baseState.instances)) {
    baseState.instances = [];
  }
  definition.defaultState = baseState;
  return definition;
}

function prepareInstantActions() {
  return getInstantHustleDefinitions().map(config => {
    const definition = createInstantHustle(config);
    definition.kind = 'action';
    ensureDefaultActionState(definition);
    applyAvailabilityMetadata(definition);
    applyExpiryMetadata(definition);
    applyProgressMetadata(definition, {
      type: 'instant',
      completion: 'instant',
      hoursRequired: Number(definition.time || definition.action?.timeCost || 0)
    });
    return definition;
  });
}

function prepareStudyActions() {
  return createKnowledgeHustles().map(definition => {
    const prepared = { ...definition };
    prepared.kind = 'action';
    ensureDefaultActionState(prepared);
    if (!prepared.availability) {
      prepared.availability = { type: 'enrollable' };
    }
    applyExpiryMetadata(prepared);
    applyProgressMetadata(prepared, {
      type: 'study',
      completion: 'deferred',
      hoursPerDay: prepared.studyHoursPerDay || prepared.hoursPerDay || null,
      daysRequired: prepared.studyDays || prepared.days || null
    });
    return prepared;
  });
}

const INSTANT_ACTIONS = prepareInstantActions();
const STUDY_ACTIONS = prepareStudyActions();

export const ACTIONS = [...INSTANT_ACTIONS, ...STUDY_ACTIONS];

export { INSTANT_ACTIONS, STUDY_ACTIONS };

export function getActionDefinitions() {
  return ACTIONS;
}
