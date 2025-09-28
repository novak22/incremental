import { formatDays, formatHours, formatList } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import {
  getAssetDefinition,
  getAssetState,
  getState,
  getUpgradeDefinition,
  getUpgradeState
} from '../core/state.js';

export const KNOWLEDGE_TRACKS = {
  outlineMastery: {
    id: 'outlineMastery',
    name: 'Outline Mastery Workshop',
    description: 'Study storytelling frameworks for 3 days (2h/day).',
    hoursPerDay: 2,
    days: 3
  },
  photoLibrary: {
    id: 'photoLibrary',
    name: 'Photo Catalog Curation',
    description: 'Practice tagging and keywording for 2 days (1.5h/day).',
    hoursPerDay: 1.5,
    days: 2
  },
  ecomPlaybook: {
    id: 'ecomPlaybook',
    name: 'E-Commerce Playbook',
    description: 'Read 5 days straight (2h/day) to master funnels and fulfillment math.',
    hoursPerDay: 2,
    days: 5
  },
  automationCourse: {
    id: 'automationCourse',
    name: 'Automation Architecture Course',
    description: 'Code-along for 7 days (3h/day) to architect a reliable micro-app.',
    hoursPerDay: 3,
    days: 7
  }
};

function normalizeAssetRequirement(definition) {
  if (!definition) return [];
  if (Array.isArray(definition.requirements)) {
    return definition.requirements;
  }
  if (!definition.requiresUpgrade) return [];
  const upgrades = Array.isArray(definition.requiresUpgrade)
    ? definition.requiresUpgrade
    : [definition.requiresUpgrade];
  return upgrades.map(id => ({ type: 'equipment', id }));
}

function isEquipmentUnlocked(id) {
  if (!id) return true;
  return Boolean(getUpgradeState(id).purchased);
}

function isKnowledgeComplete(id) {
  if (!id) return true;
  const track = KNOWLEDGE_TRACKS[id];
  if (!track) return true;
  const progress = getKnowledgeProgress(id);
  return progress.completed;
}

function hasExperience(requirement) {
  if (!requirement?.assetId) return true;
  const targetCount = Number(requirement.count) || 0;
  if (targetCount <= 0) return true;
  const assetState = getAssetState(requirement.assetId);
  return (assetState.instances || []).filter(instance => instance.status === 'active').length >= targetCount;
}

export function assetRequirementsMet(definition) {
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) return true;
  return requirements.every(req => requirementSatisfied(req));
}

export function assetRequirementsMetById(id) {
  const definition = getAssetDefinition(id);
  if (!definition) return true;
  return assetRequirementsMet(definition);
}

function requirementSatisfied(requirement) {
  switch (requirement.type) {
    case 'equipment':
      return isEquipmentUnlocked(requirement.id);
    case 'knowledge':
      return isKnowledgeComplete(requirement.id);
    case 'experience':
      return hasExperience(requirement);
    default:
      return true;
  }
}

export function formatAssetRequirementLabel(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return 'Requirement Missing';
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) return 'Ready to Launch';
  const missing = requirements.filter(req => !requirementSatisfied(req));
  if (!missing.length) return 'Ready to Launch';
  const names = missing.map(req => requirementName(req));
  return `Requires ${names.join(' & ')}`;
}

export function renderAssetRequirementDetail(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return '';
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) {
    return '🔓 Requirements: <strong>None</strong>';
  }

  const parts = requirements.map(requirementDetail);
  return `Requirements: ${parts.join(' • ')}`;
}

function requirementDetail(requirement) {
  switch (requirement.type) {
    case 'equipment':
      return renderEquipmentRequirement(requirement.id);
    case 'knowledge':
      return renderKnowledgeRequirement(requirement.id);
    case 'experience':
      return renderExperienceRequirement(requirement);
    default:
      return 'Unknown requirement';
  }
}

function renderEquipmentRequirement(id) {
  const upgrade = getUpgradeDefinition(id);
  const purchased = isEquipmentUnlocked(id);
  const icon = purchased ? '✅' : '🔒';
  const label = upgrade?.name || id;
  return `${icon} <strong>${label}</strong>`;
}

function renderKnowledgeRequirement(id) {
  const track = KNOWLEDGE_TRACKS[id];
  if (!track) return `📘 <strong>${id}</strong>`;
  const progress = getKnowledgeProgress(id);
  const icon = progress.completed ? '✅' : progress.studiedToday ? '📗' : '📘';
  const detail = `${progress.daysCompleted}/${track.days} days`;
  return `${icon} <strong>${track.name}</strong> (${detail}, ${formatHours(track.hoursPerDay)}/day)`;
}

function renderExperienceRequirement(requirement) {
  const assetDef = getAssetDefinition(requirement.assetId);
  const assetState = getAssetState(requirement.assetId);
  const owned = (assetState.instances || []).filter(instance => instance.status === 'active').length;
  const target = Number(requirement.count) || 0;
  const icon = owned >= target ? '✅' : '🏆';
  const label = assetDef?.singular || assetDef?.name || requirement.assetId;
  return `${icon} <strong>${target} ${label}${target === 1 ? '' : 's'}</strong> (have ${owned})`;
}

function requirementName(requirement) {
  switch (requirement.type) {
    case 'equipment':
      return getUpgradeDefinition(requirement.id)?.name || requirement.id;
    case 'knowledge':
      return KNOWLEDGE_TRACKS[requirement.id]?.name || requirement.id;
    case 'experience': {
      const assetDef = getAssetDefinition(requirement.assetId);
      const label = assetDef?.singular || assetDef?.name || requirement.assetId;
      const count = Number(requirement.count) || 0;
      return `${count} ${label}${count === 1 ? '' : 's'}`;
    }
    default:
      return 'Unknown Requirement';
  }
}

export function updateAssetCardLock(assetId, card) {
  const definition = getAssetDefinition(assetId);
  if (!definition || !card) return;
  const locked = !assetRequirementsMet(definition);
  card.classList.toggle('locked', locked);
}

export function getKnowledgeProgress(id, target = getState()) {
  target.progress = target.progress || {};
  target.progress.knowledge = target.progress.knowledge || {};
  if (!target.progress.knowledge[id]) {
    const track = KNOWLEDGE_TRACKS[id];
    target.progress.knowledge[id] = {
      daysCompleted: 0,
      studiedToday: false,
      completed: false,
      totalDays: track?.days ?? 0,
      hoursPerDay: track?.hoursPerDay ?? 0
    };
  }
  const track = KNOWLEDGE_TRACKS[id];
  const progress = target.progress.knowledge[id];
  if (track) {
    progress.totalDays = track.days;
    progress.hoursPerDay = track.hoursPerDay;
    progress.completed = progress.completed || progress.daysCompleted >= track.days;
  }
  return progress;
}

export function markKnowledgeStudied(id) {
  const progress = getKnowledgeProgress(id);
  if (progress.completed) return;
  progress.studiedToday = true;
}

export function knowledgeRequirementMet(id) {
  return isKnowledgeComplete(id);
}

export function advanceKnowledgeTracks() {
  const state = getState();
  if (!state) return;

  const completedToday = [];
  const stalled = [];

  Object.entries(state.progress.knowledge || {}).forEach(([id, progress]) => {
    const track = KNOWLEDGE_TRACKS[id];
    if (!track) {
      progress.studiedToday = false;
      return;
    }
    if (progress.completed) {
      progress.studiedToday = false;
      return;
    }

    if (progress.studiedToday) {
      const before = progress.daysCompleted;
      progress.daysCompleted = Math.min(track.days, before + 1);
      progress.studiedToday = false;
      if (progress.daysCompleted >= track.days) {
        progress.completed = true;
        completedToday.push(track.name);
      }
    } else if (progress.daysCompleted > 0) {
      stalled.push(track.name);
    }
  });

  if (completedToday.length) {
    addLog(`Finished ${formatList(completedToday)}! New opportunities unlocked.`, 'info');
  }
  if (stalled.length) {
    addLog(`${formatList(stalled)} did not get study time today. Progress paused.`, 'warning');
  }
}
