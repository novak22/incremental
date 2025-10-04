import { formatHours, formatList, formatMoney } from '../../core/helpers.js';
import { getUpgrades } from '../../game/registryService.js';
import { countActiveAssetInstances, getUpgradeState } from '../../core/state.js';
import { SKILL_DEFINITIONS } from '../../game/skills/data.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../game/requirements.js';
import { describeCharacter, describeSkill, formatXp } from '../skills/helpers.js';

function clampDay(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return 1;
  return Math.floor(numeric);
}

function buildSummary(state = {}) {
  const character = describeCharacter(state?.character);
  const timeRemaining = Math.max(0, Number(state?.timeLeft) || 0);
  const activeAssets = countActiveAssetInstances(state);

  return {
    title: character.title || character.label,
    level: character.level || 1,
    xp: character.xp || 0,
    tier: character.label,
    note: character.note,
    money: {
      current: Math.max(0, Number(state?.money) || 0),
      earnedTotal: Math.max(0, Number(state?.totals?.earned) || 0),
      spentTotal: Math.max(0, Number(state?.totals?.spent) || 0)
    },
    formatted: {
      current: `$${formatMoney(state?.money || 0)}`,
      earned: `$${formatMoney(state?.totals?.earned || 0)}`,
      spent: `$${formatMoney(state?.totals?.spent || 0)}`,
      day: `Day ${clampDay(state?.day)}`,
      time: formatHours(timeRemaining)
    },
    timeRemaining,
    day: clampDay(state?.day),
    activeAssets
  };
}

function buildSkillList(state = {}) {
  const entries = SKILL_DEFINITIONS.map(definition => describeSkill(definition, state?.skills?.[definition.id]));
  const highlight = entries.reduce((best, skill) => {
    if (!best) return skill;
    if (skill.level > best.level) return skill;
    if (skill.level === best.level && skill.progressPercent > best.progressPercent) {
      return skill;
    }
    return best;
  }, null);
  const mastered = entries.filter(skill => !skill.nextTier).length;
  const summary = highlight
    ? {
        primary: `${highlight.name} is shining at Lv ${highlight.level}`,
        secondary: mastered > 0
          ? `${mastered} skill${mastered === 1 ? '' : 's'} mastered`
          : 'Keep stacking XP to master a discipline'
      }
    : {
        primary: 'Log XP to reveal your standout disciplines.',
        secondary: ''
      };

  return {
    summary,
    items: entries.map(skill => ({
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

function buildEquipmentList(state = {}) {
  const allUpgrades = getUpgrades().filter(upgrade => !upgrade.repeatable);
  const skillNameMap = new Map(SKILL_DEFINITIONS.map(def => [def.id, def.name]));
  const formatSkillFocus = skills => {
    if (!Array.isArray(skills) || !skills.length) return null;
    const names = skills
      .map(entry => (typeof entry === 'string' ? entry : entry?.id))
      .filter(Boolean)
      .map(id => skillNameMap.get(id) || id);
    if (!names.length) return null;
    return formatList(names);
  };

  const owned = allUpgrades.filter(upgrade => getUpgradeState(upgrade.id, state)?.purchased);
  const items = owned.map(upgrade => {
    const summaryParts = [];
    if (upgrade.unlocks) summaryParts.push(`Unlocks ${upgrade.unlocks}`);
    if (upgrade.boosts) summaryParts.push(upgrade.boosts);
    const summary = summaryParts.join(' • ') || upgrade.description || '';
    const focus = formatSkillFocus(upgrade.skills);
    return {
      id: upgrade.id,
      name: upgrade.name,
      summary,
      focus: focus ? `Skill focus: ${focus}` : 'Skill focus: Generalist boost',
      status: 'owned',
      cost: Number(upgrade.cost) || 0
    };
  });

  const ownedIds = new Set(items.map(item => item.id));
  const locked = allUpgrades
    .filter(upgrade => !ownedIds.has(upgrade.id))
    .map(upgrade => {
      const focus = formatSkillFocus(upgrade.skills);
      return {
        id: upgrade.id,
        name: upgrade.name,
        summary: upgrade.description || upgrade.boosts || '',
        focus: focus ? `Skill focus: ${focus}` : 'Skill focus: Generalist boost',
        status: 'locked',
        cost: Number(upgrade.cost) || 0
      };
    });

  if (!items.length) {
    return {
      items: [],
      locked,
      empty: 'No gear purchased yet. Explore Upgrades to expand your toolkit.'
    };
  }

  return { items, locked };
}

function describeEducationStatus(progress = {}) {
  if (progress.completed) return 'Completed';
  if (progress.enrolled) return progress.studiedToday ? 'Studied today' : 'In progress';
  return 'Not enrolled';
}

function buildEducationList(state = {}) {
  const tracks = Object.values(KNOWLEDGE_TRACKS);
  const items = tracks.map(track => {
    const progress = getKnowledgeProgress(track.id, state) || {};
    const status = describeEducationStatus(progress);
    const daysCompleted = Math.max(0, Number(progress.daysCompleted) || 0);
    const totalDays = Math.max(0, Number(progress.totalDays ?? track.days) || track.days || 0);
    const percent = totalDays > 0 ? Math.min(1, daysCompleted / totalDays) : progress.completed ? 1 : 0;
    return {
      id: track.id,
      name: track.name,
      status,
      summary: `${daysCompleted}/${totalDays} days • ${formatHours(track.hoursPerDay)} per day • Tuition ${
        Number(track.tuition) > 0 ? `$${formatMoney(track.tuition)}` : 'Free'
      }`,
      note: progress.completed
        ? 'Course complete—permanent bonuses unlocked!'
        : progress.enrolled
          ? progress.studiedToday
            ? 'Today’s session booked and underway.'
            : 'Session still waiting for focus time today.'
          : 'Enroll to unlock new perks and instant boosts.',
      state: progress.completed
        ? 'completed'
        : progress.enrolled
          ? 'active'
          : 'available',
      daysCompleted,
      totalDays,
      percent,
      tuition: Number(track.tuition) || 0,
      hoursPerDay: Number(track.hoursPerDay) || 0,
      enrolled: Boolean(progress.enrolled),
      completed: Boolean(progress.completed)
    };
  });

  return { items };
}

export function buildPlayerPanelModel(state = {}) {
  return {
    summary: buildSummary(state),
    skills: buildSkillList(state),
    equipment: buildEquipmentList(state),
    education: buildEducationList(state)
  };
}

