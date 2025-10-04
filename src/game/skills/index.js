import { addLog } from '../../core/log.js';
import { getState } from '../../core/state.js';
import {
  CHARACTER_LEVELS,
  SKILL_DEFINITIONS,
  SKILL_LEVELS,
  calculateCharacterLevel,
  calculateSkillLevel,
  createEmptyCharacterState,
  createEmptySkillState,
  getSkillDefinition,
  normalizeCharacterState,
  normalizeSkillList,
  normalizeSkillState
} from './data.js';
import { markDirty } from '../../core/events/invalidationBus.js';

const SKILL_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

const TIME_XP_RATE = 5;
const MONEY_XP_INTERVAL = 25;

function findSkillTier(level) {
  return SKILL_LEVELS.find(tier => tier.level === level) || null;
}

function findCharacterTier(level) {
  return CHARACTER_LEVELS.find(tier => tier.level === level) || null;
}

function ensureSkillContainers(state) {
  if (!state.skills) {
    state.skills = createEmptySkillState();
  } else {
    state.skills = normalizeSkillState(state.skills);
  }
  if (!state.character) {
    state.character = createEmptyCharacterState();
  } else {
    state.character = normalizeCharacterState(state.character);
  }
}

function logSkillLevelUp(skillId, level) {
  const skill = getSkillDefinition(skillId) || { name: skillId };
  const tier = findSkillTier(level);
  const tierName = tier?.title || `Level ${level}`;
  addLog(`${skill.name} advanced to ${tierName}! Your toolkit sparkles with new tricks.`, 'progress');
}

function logCharacterLevelUp(level, label) {
  const tier = findCharacterTier(level);
  const tierName = tier?.title || `Level ${level}`;
  const suffix = label ? ` after ${label}` : '';
  addLog(`You rose to ${tierName}${suffix}! Keep the creative streak glowing.`, 'progress');
}

function computeBaseXp({ timeSpentHours = 0, moneySpent = 0, baseXp = null }) {
  if (Number.isFinite(Number(baseXp))) {
    const direct = Math.max(0, Math.round(Number(baseXp)));
    if (direct > 0) {
      return direct;
    }
  }

  const timeXp = Math.round(Math.max(0, Number(timeSpentHours) || 0) * TIME_XP_RATE);
  const costXp = Math.floor(Math.max(0, Number(moneySpent) || 0) / MONEY_XP_INTERVAL);
  const total = timeXp + costXp;
  if (total > 0) {
    return total;
  }
  if ((Number(timeSpentHours) || 0) > 0 || (Number(moneySpent) || 0) > 0) {
    return 1;
  }
  return 0;
}

export function awardSkillProgress({
  skills,
  timeSpentHours = 0,
  moneySpent = 0,
  baseXp = null,
  label,
  state = getState()
} = {}) {
  if (!state) return 0;
  const normalized = normalizeSkillList(skills);
  if (!normalized.length) return 0;

  ensureSkillContainers(state);

  const base = computeBaseXp({ timeSpentHours, moneySpent, baseXp });
  if (base <= 0) return 0;

  let totalAwarded = 0;
  for (const entry of normalized) {
    const container = state.skills[entry.id];
    if (!container) continue;
    const beforeLevel = container.level;
    const gain = Math.max(1, Math.round(base * entry.weight));
    container.xp += gain;
    container.level = calculateSkillLevel(container.xp);
    totalAwarded += gain;
    if (container.level > beforeLevel) {
      logSkillLevelUp(entry.id, container.level);
    }
  }

  if (totalAwarded <= 0) {
    return 0;
  }

  const character = state.character;
  const beforeCharacterLevel = character.level;
  character.xp += totalAwarded;
  character.level = calculateCharacterLevel(character.xp);
  if (character.level > beforeCharacterLevel) {
    logCharacterLevelUp(character.level, label);
  }

  if (totalAwarded > 0) {
    markDirty(SKILL_UI_SECTIONS);
  }

  return totalAwarded;
}
