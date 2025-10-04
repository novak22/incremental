import { SKILL_DEFINITIONS } from '../../game/skills/data.js';
import { describeCharacter, describeSkill, formatXp } from '../skills/helpers.js';

export function buildSkillsWidgetModel(state = {}) {
  const summary = describeCharacter(state?.character);
  const skills = SKILL_DEFINITIONS.map(definition => describeSkill(definition, state?.skills?.[definition.id]));

  return {
    summary: {
      tier: summary.label,
      note: summary.note
    },
    items: skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      tierTitle: skill.tierTitle,
      level: skill.level,
      progressPercent: skill.progressPercent,
      xp: formatXp(skill.xp),
      remainingXp: formatXp(skill.remainingXp),
      nextTier: skill.nextTier ? skill.nextTier.title : null,
      isMaxed: !skill.nextTier
    }))
  };
}

