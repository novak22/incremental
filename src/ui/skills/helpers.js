import {
  SKILL_LEVELS,
  CHARACTER_LEVELS
} from '../../game/skills/data.js';

export const numberFormatter = new Intl.NumberFormat('en-US');

export function formatXp(value) {
  return numberFormatter.format(Math.max(0, Math.round(Number(value) || 0)));
}

export function findSkillTier(level) {
  return SKILL_LEVELS.find(tier => tier.level === level) || SKILL_LEVELS[0];
}

export function findNextSkillTier(level) {
  return SKILL_LEVELS.find(tier => tier.level === level + 1) || null;
}

function findCharacterTier(level) {
  return CHARACTER_LEVELS.find(tier => tier.level === level) || CHARACTER_LEVELS[0];
}

export function describeSkill(definition, stateEntry = {}) {
  const xp = Math.max(0, Number(stateEntry.xp) || 0);
  const level = Math.max(0, Number(stateEntry.level) || 0);
  const tier = findSkillTier(level);
  const nextTier = findNextSkillTier(level);
  const currentFloor = tier?.xp ?? 0;
  const nextFloor = nextTier?.xp ?? currentFloor;
  const range = Math.max(1, nextFloor - currentFloor);
  const progress = nextTier ? Math.min(1, Math.max(0, (xp - currentFloor) / range)) : 1;
  const remaining = nextTier ? Math.max(0, nextFloor - xp) : 0;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    xp,
    level,
    tierTitle: tier?.title || `Level ${level}`,
    nextTier,
    progressPercent: Math.round(progress * 100),
    remainingXp: remaining
  };
}

export function describeCharacter(character = {}) {
  const xp = Math.max(0, Number(character.xp) || 0);
  const level = Math.max(1, Number(character.level) || 1);
  const tier = findCharacterTier(level);
  const nextTier = CHARACTER_LEVELS.find(entry => entry.level === level + 1) || null;
  const remaining = nextTier ? Math.max(0, nextTier.xp - xp) : 0;
  const note = nextTier
    ? `${formatXp(xp)} XP logged • ${formatXp(remaining)} XP to ${nextTier.title}`
    : `${formatXp(xp)} XP logged • Top tier achieved—legendary!`;
  return {
    label: `${tier.title} · Level ${level}`,
    note
  };
}

