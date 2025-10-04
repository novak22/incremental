import { countActiveAssetInstances, getState, getUpgradeState } from '../../core/state.js';
import { getAssetDefinition } from '../../core/state/registry.js';
import { KNOWLEDGE_TRACKS } from './knowledgeTracks.js';
import { getKnowledgeProgress } from './knowledgeProgress.js';
import { getDefinitionRequirements } from './definitionRequirements.js';

export function isEquipmentUnlocked(id, state = getState()) {
  if (!id) return true;
  return Boolean(getUpgradeState(id, state).purchased);
}

function isKnowledgeComplete(id, state = getState()) {
  if (!id) return true;
  const track = KNOWLEDGE_TRACKS[id];
  if (!track) return true;
  const progress = getKnowledgeProgress(id, state);
  return progress.completed;
}

function hasExperience(requirement, state = getState()) {
  if (!requirement?.assetId) return true;
  const targetCount = Number(requirement.count) || 0;
  if (targetCount <= 0) return true;
  const owned = countActiveAssetInstances(requirement.assetId, state);
  return owned >= targetCount;
}

export function isRequirementMet(requirement, state = getState()) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'equipment':
      return isEquipmentUnlocked(requirement.id, state);
    case 'knowledge':
      return isKnowledgeComplete(requirement.id, state);
    case 'experience':
      return hasExperience(requirement, state);
    default:
      return true;
  }
}

export function definitionRequirementsMet(definition, state = getState()) {
  const requirements = getDefinitionRequirements(definition);
  if (!requirements.hasAny) return true;
  return requirements.every(req => isRequirementMet(req, state));
}

export function assetRequirementsMetById(id, state = getState()) {
  const definition = getAssetDefinition(id);
  if (!definition) return true;
  return definitionRequirementsMet(definition, state);
}

