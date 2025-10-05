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
  if (!definition.progress) {
    definition.progress = { ...overrides };
  }
  if (!definition.progress.type) {
    definition.progress.type = overrides.type || 'instant';
  }
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
