import { getState } from '../../../core/state.js';
import { formatHours } from '../../../core/helpers.js';
import {
  KNOWLEDGE_TRACKS,
  KNOWLEDGE_REWARDS,
  getKnowledgeProgress
} from '../../../game/requirements.js';
import { getTimeCap } from '../../../game/time.js';
import { normalizeSkillList, getSkillDefinition } from '../../../game/skills/data.js';
import { getUpgradeSnapshot } from './upgrades.js';

export function buildSkillRewards(trackId) {
  const reward = KNOWLEDGE_REWARDS[trackId];
  if (!reward) {
    return { xp: 0, skills: [] };
  }
  const xp = Number.isFinite(Number(reward.baseXp)) ? Number(reward.baseXp) : 0;
  const normalized = normalizeSkillList(reward.skills);
  const skills = normalized.map(entry => {
    const definition = getSkillDefinition(entry.id);
    return {
      id: entry.id,
      name: definition?.name || entry.id,
      weight: Number(entry.weight) || 0
    };
  });
  return { xp, skills };
}

export function resolveTrack(definition) {
  if (!definition) {
    return {
      id: '',
      name: '',
      summary: '',
      description: '',
      days: 1,
      hoursPerDay: 1,
      tuition: 0,
      action: null,
      skillXp: 0,
      skills: []
    };
  }

  const canonicalId = definition.studyTrackId || definition.id;
  const canonical = KNOWLEDGE_TRACKS[canonicalId];
  const skillRewards = buildSkillRewards(canonical?.id || canonicalId);

  const summary = definition.description || canonical?.description || '';
  const description = canonical?.description || definition.description || '';
  const days = Number(canonical?.days ?? definition.days ?? definition.action?.durationDays) || 1;
  const hoursPerDay = Number(
    canonical?.hoursPerDay ?? definition.hoursPerDay ?? definition.time ?? definition.action?.timeCost
  ) || 1;
  const tuition = Number(canonical?.tuition ?? definition.tuition ?? definition.action?.moneyCost) || 0;

  return {
    id: canonical?.id || canonicalId,
    name: canonical?.name || definition.name || canonicalId,
    summary,
    description,
    days,
    hoursPerDay,
    tuition,
    action: definition.action,
    skillXp: skillRewards.xp,
    skills: skillRewards.skills
  };
}

export function buildLearnlyAddons(definitions = [], helpers = {}) {
  const {
    state: providedState = null,
    getState: getStateFn = getState,
    getUpgradeSnapshot: getUpgradeSnapshotFn = getUpgradeSnapshot
  } = helpers;

  const state = providedState || getStateFn();

  return (definitions || [])
    .filter(definition => definition?.surface === 'learnly')
    .map(definition => {
      const snapshot = getUpgradeSnapshotFn(definition, state);
      const action = definition?.action || null;
      const label =
        typeof action?.label === 'function'
          ? action.label(state)
          : action?.label || definition?.actionLabel || 'Purchase';
      const disabled =
        typeof action?.disabled === 'function'
          ? action.disabled(state)
          : Boolean(action?.disabled);
      const onClick = typeof action?.onClick === 'function' ? action.onClick : null;
      return {
        id: definition.id,
        name: definition.name || definition.id,
        description: definition.description || '',
        tag: definition.tag || null,
        cost: snapshot.cost,
        snapshot,
        action: onClick
          ? {
              label,
              disabled,
              onClick
            }
          : null
      };
    });
}

export function buildEducationModels(definitions = [], helpers = {}) {
  const {
    getState: getStateFn = getState,
    getKnowledgeProgress: getKnowledgeProgressFn = getKnowledgeProgress,
    getTimeCap: getTimeCapFn = getTimeCap,
    getUpgradeSnapshot: getUpgradeSnapshotFn = getUpgradeSnapshot,
    upgradeDefinitions = []
  } = helpers;

  const state = getStateFn();
  const tracks = definitions.map(definition => {
    const info = resolveTrack(definition);
    const progress = getKnowledgeProgressFn(info.id, state) || {};
    const active = Boolean(progress.enrolled && !progress.completed);
    const completed = Boolean(progress.completed);
    return {
      definitionId: definition.id,
      id: info.id,
      name: info.name,
      summary: info.summary,
      description: info.description,
      days: info.days,
      hoursPerDay: info.hoursPerDay,
      tuition: info.tuition,
      skillXp: info.skillXp,
      skills: info.skills,
      progress: {
        enrolled: Boolean(progress.enrolled),
        completed,
        studiedToday: Boolean(progress.studiedToday),
        daysCompleted: Number(progress.daysCompleted) || 0,
        totalDays: Number(progress.totalDays ?? info.days) || info.days
      },
      action: info.action
        ? {
            label: typeof info.action.label === 'function' ? info.action.label(state) : info.action.label || 'Study',
            disabled: typeof info.action.disabled === 'function' ? info.action.disabled(state) : Boolean(info.action.disabled)
          }
        : null,
      filters: {
        active,
        completed,
        track: info.id
      }
    };
  });

  const queueEntries = tracks.filter(track => track.progress.enrolled && !track.progress.completed);
  const totalHours = queueEntries.reduce((sum, track) => sum + track.hoursPerDay, 0);
  const capHours = state ? getTimeCapFn(state) : 0;

  const addons = buildLearnlyAddons(upgradeDefinitions, {
    state,
    getUpgradeSnapshot: getUpgradeSnapshotFn
  });

  return {
    tracks,
    addons,
    queue: {
      entries: queueEntries.map(track => ({ id: track.id, name: track.name, hoursPerDay: track.hoursPerDay })),
      totalHours,
      totalLabel: `Total ETA: ${formatHours(totalHours)}`,
      capHours,
      capLabel: `Daily cap: ${formatHours(capHours)}`
    }
  };
}

export default buildEducationModels;
