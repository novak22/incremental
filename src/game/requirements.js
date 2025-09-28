import { formatDays, formatHours, formatList, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import {
  getAssetDefinition,
  getAssetState,
  getState,
  getUpgradeDefinition,
  getUpgradeState
} from '../core/state.js';
import { spendMoney } from './currency.js';
import { spendTime } from './time.js';
import {
  recordCostContribution,
  recordTimeContribution
} from './metrics.js';

export const KNOWLEDGE_TRACKS = {
  outlineMastery: {
    id: 'outlineMastery',
    name: 'Outline Mastery Workshop',
    description: 'Deep-dive into narrative scaffolding for 5 days (2h/day). Tuition due upfront.',
    hoursPerDay: 2,
    days: 5,
    tuition: 140
  },
  photoLibrary: {
    id: 'photoLibrary',
    name: 'Photo Catalog Curation',
    description: 'Archive, tag, and light-edit your best work for 4 days (1.5h/day). Tuition due upfront.',
    hoursPerDay: 1.5,
    days: 4,
    tuition: 95
  },
  ecomPlaybook: {
    id: 'ecomPlaybook',
    name: 'E-Commerce Playbook',
    description: 'Shadow a pro operator for 7 days (2.5h/day) to master funnels and fulfillment math.',
    hoursPerDay: 2.5,
    days: 7,
    tuition: 260
  },
  automationCourse: {
    id: 'automationCourse',
    name: 'Automation Architecture Course',
    description: 'Pair-program with mentors for 10 days (3h/day) to architect a reliable micro-app.',
    hoursPerDay: 3,
    days: 10,
    tuition: 540
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

function isEquipmentUnlocked(id, state = getState()) {
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
  const assetState = getAssetState(requirement.assetId, state);
  return (assetState.instances || []).filter(instance => instance.status === 'active').length >= targetCount;
}

export function assetRequirementsMet(definition, state = getState()) {
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) return true;
  return requirements.every(req => requirementSatisfied(req, state));
}

export function assetRequirementsMetById(id, state = getState()) {
  const definition = getAssetDefinition(id);
  if (!definition) return true;
  return assetRequirementsMet(definition, state);
}

function requirementSatisfied(requirement, state = getState()) {
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

export function formatAssetRequirementLabel(assetId, state = getState()) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return 'Requirement Missing';
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) return 'Ready to Launch';
  const missing = requirements.filter(req => !requirementSatisfied(req, state));
  if (!missing.length) return 'Ready to Launch';
  const names = missing.map(req => requirementName(req, state));
  return `Requires ${names.join(' & ')}`;
}

export function renderAssetRequirementDetail(assetId, state = getState()) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return '';
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) {
    return '🔓 Requirements: <strong>None</strong>';
  }

  const parts = requirements.map(req => requirementDetail(req, state));
  return `Requirements: ${parts.join(' • ')}`;
}

function requirementDetail(requirement, state = getState()) {
  switch (requirement.type) {
    case 'equipment':
      return renderEquipmentRequirement(requirement.id, state);
    case 'knowledge':
      return renderKnowledgeRequirement(requirement.id, state);
    case 'experience':
      return renderExperienceRequirement(requirement, state);
    default:
      return 'Unknown requirement';
  }
}

function renderEquipmentRequirement(id, state = getState()) {
  const upgrade = getUpgradeDefinition(id);
  const purchased = isEquipmentUnlocked(id, state);
  const icon = purchased ? '✅' : '🔒';
  const label = upgrade?.name || id;
  return `${icon} <strong>${label}</strong>`;
}

function renderKnowledgeRequirement(id, state = getState()) {
  const track = KNOWLEDGE_TRACKS[id];
  if (!track) return `📘 <strong>${id}</strong>`;
  const progress = getKnowledgeProgress(id, state);
  const icon = progress.completed ? '✅' : progress.studiedToday ? '📗' : '📘';
  const detail = `${progress.daysCompleted}/${track.days} days`;
  return `${icon} <strong>${track.name}</strong> (${detail}, ${formatHours(track.hoursPerDay)}/day)`;
}

function renderExperienceRequirement(requirement, state = getState()) {
  const assetDef = getAssetDefinition(requirement.assetId);
  const assetState = getAssetState(requirement.assetId, state);
  const owned = (assetState.instances || []).filter(instance => instance.status === 'active').length;
  const target = Number(requirement.count) || 0;
  const icon = owned >= target ? '✅' : '🏆';
  const label = assetDef?.singular || assetDef?.name || requirement.assetId;
  return `${icon} <strong>${target} ${label}${target === 1 ? '' : 's'}</strong> (have ${owned})`;
}

function requirementName(requirement, state = getState()) {
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

export function listAssetRequirementDescriptors(definitionOrId, state = getState()) {
  const definition = typeof definitionOrId === 'string'
    ? getAssetDefinition(definitionOrId)
    : definitionOrId;
  if (!definition) return [];
  const requirements = normalizeAssetRequirement(definition);
  if (!requirements.length) return [];

  return requirements.map(req => {
    switch (req.type) {
      case 'equipment': {
        const upgrade = getUpgradeDefinition(req.id);
        return {
          type: 'equipment',
          id: req.id,
          label: upgrade?.name || req.id,
          met: isEquipmentUnlocked(req.id, state)
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
            totalDays: track?.days ?? 0,
            studiedToday: Boolean(progress.studiedToday)
          }
        };
      }
      case 'experience': {
        const assetDef = getAssetDefinition(req.assetId);
        const need = Number(req.count) || 0;
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
      default:
        return { type: req.type || 'unknown', label: 'Unknown requirement', met: false };
    }
  });
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
      enrolled: false,
      totalDays: track?.days ?? 0,
      hoursPerDay: track?.hoursPerDay ?? 0,
      tuitionCost: track?.tuition ?? 0,
      enrolledOnDay: null
    };
  }
  const track = KNOWLEDGE_TRACKS[id];
  const progress = target.progress.knowledge[id];
  if (track) {
    progress.totalDays = track.days;
    progress.hoursPerDay = track.hoursPerDay;
    progress.tuitionCost = track.tuition ?? 0;
    progress.completed = progress.completed || progress.daysCompleted >= track.days;
  }
  return progress;
}

export function markKnowledgeStudied(id) {
  const progress = getKnowledgeProgress(id);
  if (progress.completed || !progress.enrolled) return;
  progress.studiedToday = true;
}

export function enrollInKnowledgeTrack(id) {
  const state = getState();
  const track = KNOWLEDGE_TRACKS[id];
  if (!state || !track) return { success: false, reason: 'missing' };

  const progress = getKnowledgeProgress(id);
  if (progress.completed) {
    addLog(`${track.name} is already complete. Grab a celebratory pastry instead.`, 'info');
    return { success: false, reason: 'completed' };
  }
  if (progress.enrolled) {
    addLog(`You're already enrolled in ${track.name}.`, 'info');
    return { success: false, reason: 'enrolled' };
  }

  const tuition = Number(track.tuition) || 0;
  if (tuition > 0 && state.money < tuition) {
    addLog(`You need $${formatMoney(tuition)} ready to enroll in ${track.name}.`, 'warning');
    return { success: false, reason: 'money' };
  }

  if (tuition > 0) {
    spendMoney(tuition);
    recordCostContribution({
      key: `study:${track.id}:tuition`,
      label: `🎓 ${track.name} tuition`,
      amount: tuition,
      category: 'investment'
    });
  }

  progress.enrolled = true;
  progress.enrolledOnDay = state.day;
  progress.studiedToday = false;

  addLog(`You enrolled in ${track.name}! Tuition paid${tuition > 0 ? ` for $${formatMoney(tuition)}` : ''}.`, 'info');

  allocateDailyStudy({ trackIds: [id], triggeredByEnrollment: true });

  return { success: true };
}

export function allocateDailyStudy({ trackIds, triggeredByEnrollment = false } = {}) {
  const state = getState();
  if (!state) return;

  const studied = [];
  const skipped = [];

  const tracks = trackIds
    ? trackIds.map(id => KNOWLEDGE_TRACKS[id]).filter(Boolean)
    : Object.values(KNOWLEDGE_TRACKS);

  for (const track of tracks) {
    const progress = getKnowledgeProgress(track.id);
    if (!progress.enrolled || progress.completed) continue;
    if (progress.studiedToday) continue;

    const hours = Number(track.hoursPerDay) || 0;
    if (hours <= 0) {
      progress.studiedToday = true;
      continue;
    }

    if (state.timeLeft < hours) {
      skipped.push(track.name);
      continue;
    }

    spendTime(hours);
    recordTimeContribution({
      key: `study:${track.id}:time`,
      label: `📘 ${track.name} study`,
      hours,
      category: 'study'
    });
    progress.studiedToday = true;
    studied.push(track.name);
  }

  if (studied.length) {
    const prefix = triggeredByEnrollment ? 'Class time booked today for' : 'Study sessions reserved for';
    addLog(`${prefix} ${formatList(studied)}.`, 'info');
  }

  if (skipped.length) {
    addLog(`${formatList(skipped)} could not fit into today\'s schedule.`, 'warning');
  }
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

    if (!progress.enrolled) {
      progress.studiedToday = false;
      return;
    }

    if (progress.studiedToday) {
      const before = progress.daysCompleted;
      progress.daysCompleted = Math.min(track.days, before + 1);
      progress.studiedToday = false;
      if (progress.daysCompleted >= track.days) {
        progress.completed = true;
        progress.enrolled = false;
        completedToday.push(track.name);
      }
    } else if (progress.daysCompleted > 0 || progress.enrolled) {
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
