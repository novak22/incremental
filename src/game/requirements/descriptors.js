import { countActiveAssetInstances, getState } from '../../core/state.js';
import { DEFAULT_DAY_HOURS } from '../../core/constants.js';
import { getAssetDefinition, getUpgradeDefinition } from '../../core/state/registry.js';
import { formatHours, toNumber } from '../../core/helpers.js';
import { KNOWLEDGE_TRACKS } from './knowledgeTracks.js';
import { getDefinitionRequirements } from './definitionRequirements.js';
import { getKnowledgeProgress } from './knowledgeProgress.js';
import { isEquipmentUnlocked, isRequirementMet } from './checks.js';
import { estimateManualMaintenanceReserve } from './maintenanceReserve.js';

function computeDailyBufferHours(state = getState()) {
  const baseHours = Number(state?.baseTime);
  const resolvedBase = Number.isFinite(baseHours) && baseHours > 0 ? baseHours : DEFAULT_DAY_HOURS;
  return Math.max(2, Math.round(resolvedBase * 0.25));
}

function buildStudyScheduleDetails({ track, progress, state = getState() }) {
  const hoursPerDay = Math.max(
    0,
    Number(track?.hoursPerDay) || Number(progress?.hoursPerDay) || 0
  );
  const manualReserveHours = estimateManualMaintenanceReserve(state);
  const bufferHours = computeDailyBufferHours(state);
  const availableFocusHours = Math.max(
    0,
    Number(state?.timeLeft || 0) - manualReserveHours - bufferHours
  );

  return {
    hoursPerDay,
    manualReserveHours,
    bufferHours,
    availableFocusHours
  };
}

export function buildAssetRequirementDescriptor(requirement, state = getState(), typeOverride) {
  if (!requirement || !requirement.assetId) {
    return {
      type: typeOverride ?? requirement?.type ?? 'unknown',
      label: 'Unknown requirement',
      met: false
    };
  }

  const assetDefinition = getAssetDefinition(requirement.assetId);
  const baseLabel = assetDefinition?.singular || assetDefinition?.name || requirement.assetId;
  const parsedCount = Number(requirement.count);
  const defaultNeed = requirement?.type === 'experience' ? 0 : 1;
  const normalizedNeed = Number.isFinite(parsedCount)
    ? Math.max(0, parsedCount)
    : defaultNeed;
  const need = normalizedNeed || defaultNeed;
  const have = countActiveAssetInstances(requirement.assetId, state);

  return {
    type: typeOverride ?? requirement?.type ?? 'experience',
    assetId: requirement.assetId,
    label: `${need} ${baseLabel}${need === 1 ? '' : 's'}`,
    met: have >= need,
    progress: { have, need }
  };
}

function describeRequirement(requirement, state = getState()) {
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
    const schedule = buildStudyScheduleDetails({ track, progress, state });
    const detailSegments = [`${icon} <strong>${label}</strong> (${detail})`];
    if (schedule.hoursPerDay > 0) {
      detailSegments.push(`${formatHours(schedule.hoursPerDay)}/day study`);
    }
    const reserveSegments = [];
    if (schedule.manualReserveHours > 0) {
      reserveSegments.push(`${formatHours(schedule.manualReserveHours)} upkeep reserve`);
    }
    if (schedule.bufferHours > 0) {
      reserveSegments.push(`${formatHours(schedule.bufferHours)} daily buffer`);
    }
    if (reserveSegments.length) {
      detailSegments.push(`Reserve ${reserveSegments.join(' + ')}`);
    }
    return {
      type: 'knowledge',
      status,
      icon,
      label,
      detail: detailSegments.join(' • '),
      schedule
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

export function summarizeAssetRequirements(requirements = [], state = getState()) {
  if (!requirements?.length) return 'None';
  return requirements
    .map(req => {
      const definition = getAssetDefinition(req.assetId);
      const label = definition?.singular || definition?.name || req.assetId;
      const need = toNumber(req.count, 1);
      const have = countActiveAssetInstances(req.assetId, state);
      return `${label}: ${have}/${need} active`;
    })
    .join(' • ');
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
        const schedule = buildStudyScheduleDetails({ track, progress, state });
        return {
          type: 'knowledge',
          id: req.id,
          label: track?.name || req.id,
          met: progress.completed,
          progress: {
            daysCompleted: progress.daysCompleted,
            totalDays: track?.days ?? 0,
            studiedToday: Boolean(progress.studiedToday)
          },
          schedule
        };
      }
      case 'experience': {
        return buildAssetRequirementDescriptor(req, state);
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

