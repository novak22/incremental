import { formatDays, formatHours, formatList, formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import {
  countActiveAssetInstances,
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
import { buildRequirementBundle, resolveRequirementConfig } from './schema/requirements.js';
import { awardSkillProgress } from './skills/index.js';

export const KNOWLEDGE_TRACKS = {
  outlineMastery: {
    id: 'outlineMastery',
    name: 'Outline Mastery Workshop',
    description: 'Deep-dive into narrative scaffolding for 5 days (2h/day). Tuition due upfront.',
    hoursPerDay: 2,
    days: 5,
    tuition: 140,
    instantBoosts: [
      {
        hustleId: 'freelance',
        hustleName: 'Freelance Writing',
        type: 'multiplier',
        amount: 0.25
      },
      {
        hustleId: 'audiobookNarration',
        hustleName: 'Audiobook Narration Gig',
        type: 'multiplier',
        amount: 0.15
      }
    ]
  },
  photoLibrary: {
    id: 'photoLibrary',
    name: 'Photo Catalog Curation',
    description: 'Archive, tag, and light-edit your best work for 4 days (1.5h/day). Tuition due upfront.',
    hoursPerDay: 1.5,
    days: 4,
    tuition: 95,
    instantBoosts: [
      {
        hustleId: 'eventPhotoGig',
        hustleName: 'Event Photo Gig',
        type: 'multiplier',
        amount: 0.2
      }
    ]
  },
  ecomPlaybook: {
    id: 'ecomPlaybook',
    name: 'E-Commerce Playbook',
    description: 'Shadow a pro operator for 7 days (2.5h/day) to master funnels and fulfillment math.',
    hoursPerDay: 2.5,
    days: 7,
    tuition: 260,
    instantBoosts: [
      {
        hustleId: 'bundlePush',
        hustleName: 'Bundle Promo Push',
        type: 'flat',
        amount: 6
      },
      {
        hustleId: 'dropshipPackParty',
        hustleName: 'Dropship Pack Party',
        type: 'multiplier',
        amount: 0.2
      }
    ]
  },
  automationCourse: {
    id: 'automationCourse',
    name: 'Automation Architecture Course',
    description: 'Pair-program with mentors for 10 days (3h/day) to architect a reliable micro-app.',
    hoursPerDay: 3,
    days: 10,
    tuition: 540,
    instantBoosts: [
      {
        hustleId: 'saasBugSquash',
        hustleName: 'SaaS Bug Squash',
        type: 'flat',
        amount: 12
      }
    ]
  },
  brandVoiceLab: {
    id: 'brandVoiceLab',
    name: 'Brand Voice Lab',
    description: 'Work with pitch coaches for 4 days (1h/day) to sharpen live Q&A charisma.',
    hoursPerDay: 1,
    days: 4,
    tuition: 120,
    instantBoosts: [
      {
        hustleId: 'audienceCall',
        hustleName: 'Audience Q&A Blast',
        type: 'flat',
        amount: 4
      }
    ]
  },
  guerillaBuzzWorkshop: {
    id: 'guerillaBuzzWorkshop',
    name: 'Guerrilla Buzz Workshop',
    description: 'Field-test hype hooks for 6 days (1.5h/day) with a crew of street marketers.',
    hoursPerDay: 1.5,
    days: 6,
    tuition: 180,
    instantBoosts: [
      {
        hustleId: 'streetPromoSprint',
        hustleName: 'Street Promo Sprint',
        type: 'multiplier',
        amount: 0.25
      },
      {
        hustleId: 'surveySprint',
        hustleName: 'Micro Survey Dash',
        type: 'flat',
        amount: 1.5
      }
    ]
  }
};

export const KNOWLEDGE_REWARDS = {
  outlineMastery: { baseXp: 120, skills: ['writing'] },
  photoLibrary: {
    baseXp: 120,
    skills: [
      { id: 'visual', weight: 0.5 },
      { id: 'editing', weight: 0.5 }
    ]
  },
  ecomPlaybook: {
    baseXp: 120,
    skills: [
      { id: 'research', weight: 0.5 },
      { id: 'commerce', weight: 0.5 }
    ]
  },
  automationCourse: {
    baseXp: 120,
    skills: [
      { id: 'software', weight: 0.6 },
      { id: 'infrastructure', weight: 0.4 }
    ]
  },
  brandVoiceLab: {
    baseXp: 100,
    skills: [
      { id: 'audience', weight: 0.6 },
      { id: 'promotion', weight: 0.4 }
    ]
  },
  guerillaBuzzWorkshop: {
    baseXp: 110,
    skills: [
      { id: 'promotion', weight: 0.6 },
      { id: 'audience', weight: 0.4 }
    ]
  }
};

const EMPTY_REQUIREMENTS = buildRequirementBundle();
const requirementCache = new WeakMap();

export function getDefinitionRequirements(definition) {
  if (!definition) return EMPTY_REQUIREMENTS;
  if (requirementCache.has(definition)) {
    return requirementCache.get(definition);
  }
  const config = resolveRequirementConfig(definition);
  if (!config) {
    requirementCache.set(definition, EMPTY_REQUIREMENTS);
    return EMPTY_REQUIREMENTS;
  }
  const bundle = buildRequirementBundle(config);
  requirementCache.set(definition, bundle);
  return bundle;
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

export function describeRequirement(requirement, state = getState()) {
  if (!requirement) {
    return {
      type: 'unknown',
      status: 'unknown',
      icon: '❓',
      label: 'Unknown Requirement',
      detail: '❓ <strong>Unknown requirement</strong>'
    };
  }

  const status = isRequirementMet(requirement, state) ? 'met' : 'pending';

  if (requirement.type === 'equipment') {
    const upgrade = getUpgradeDefinition(requirement.id);
    const label = upgrade?.name || requirement.id;
    const icon = status === 'met' ? '✅' : '🔒';
    return {
      type: 'equipment',
      status,
      icon,
      label,
      detail: `${icon} <strong>${label}</strong>`
    };
  }

  if (requirement.type === 'knowledge') {
    const track = KNOWLEDGE_TRACKS[requirement.id];
    const label = track?.name || requirement.id;
    const progress = getKnowledgeProgress(requirement.id, state);
    const icon = progress.completed ? '✅' : progress.studiedToday ? '📗' : '📘';
    const hoursPerDay = Number(track?.hoursPerDay) || 0;
    const detail = track
      ? `${progress.daysCompleted}/${track.days} days, ${formatHours(hoursPerDay)}/day`
      : 'Progress tracked';
    return {
      type: 'knowledge',
      status,
      icon,
      label,
      detail: `${icon} <strong>${label}</strong> (${detail})`
    };
  }

  if (requirement.type === 'experience') {
    const assetDef = getAssetDefinition(requirement.assetId);
    const owned = countActiveAssetInstances(requirement.assetId, state);
    const target = Number(requirement.count) || 0;
    const baseLabel = assetDef?.singular || assetDef?.name || requirement.assetId;
    const label = `${target} ${baseLabel}${target === 1 ? '' : 's'}`;
    const icon = owned >= target ? '✅' : '🏆';
    return {
      type: 'experience',
      status,
      icon,
      label,
      detail: `${icon} <strong>${label}</strong> (have ${owned})`
    };
  }

  return {
    type: requirement.type,
    status,
    icon: status === 'met' ? '✅' : '❔',
    label: 'Unknown Requirement',
    detail: `${status === 'met' ? '✅' : '❔'} <strong>Unknown requirement</strong>`
  };
}

export function definitionRequirementsMet(definition, state = getState()) {
  const requirements = getDefinitionRequirements(definition);
  if (!requirements.hasAny) return true;
  return requirements.every(req => isRequirementMet(req, state));
}

export function assetRequirementsMet(definition, state = getState()) {
  return definitionRequirementsMet(definition, state);
}

export function assetRequirementsMetById(id, state = getState()) {
  const definition = getAssetDefinition(id);
  if (!definition) return true;
  return definitionRequirementsMet(definition, state);
}

export function formatAssetRequirementLabel(assetId, state = getState()) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return 'Requirement Missing';
  const requirements = getDefinitionRequirements(definition);
  if (!requirements.hasAny) return 'Ready to Launch';
  const missing = requirements.missing(req => isRequirementMet(req, state));
  if (!missing.length) return 'Ready to Launch';
  const names = missing.map(req => describeRequirement(req, state).label);
  return `Requires ${names.join(' & ')}`;
}

export function renderAssetRequirementDetail(assetId, state = getState()) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return '';
  const requirements = getDefinitionRequirements(definition);
  if (!requirements.hasAny) {
    return '🔓 Requirements: <strong>None</strong>';
  }
  const parts = requirements.map(req => describeRequirement(req, state).detail);
  return `Requirements: ${parts.join(' • ')}`;
}

export function listAssetRequirementDescriptors(definitionOrId, state = getState()) {
  const definition = typeof definitionOrId === 'string'
    ? getAssetDefinition(definitionOrId)
    : definitionOrId;
  if (!definition) return [];
  const requirements = getDefinitionRequirements(definition);
  if (!requirements.hasAny) return [];

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
        const have = countActiveAssetInstances(req.assetId, state);
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

export function updateAssetCardLock(assetId, card, state = getState()) {
  const definition = getAssetDefinition(assetId);
  if (!definition || !card) return;
  const requirements = getDefinitionRequirements(definition);
  const locked = requirements.hasAny && !requirements.every(req => isRequirementMet(req, state));
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
      enrolledOnDay: null,
      skillRewarded: false
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
  progress.skillRewarded = Boolean(progress.skillRewarded);
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
        if (!progress.skillRewarded) {
          const reward = KNOWLEDGE_REWARDS[id];
          if (reward) {
            awardSkillProgress({
              skills: reward.skills,
              baseXp: reward.baseXp,
              label: track.name
            });
          }
          progress.skillRewarded = true;
        }
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
