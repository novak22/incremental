import { getElement } from './elements/registry.js';
import setText from './dom.js';
import { formatHours, formatList, formatMoney } from '../core/helpers.js';
import { registry } from '../game/registry.js';
import { countActiveAssetInstances, getUpgradeState } from '../core/state.js';
import { SKILL_DEFINITIONS } from '../game/skills/data.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../game/requirements.js';
import {
  describeCharacter,
  describeSkill,
  formatXp
} from './skills/helpers.js';

function renderSummary(state, summary) {
  const player = getElement('playerNodes') || {};
  const target = player.summary;
  if (!target) return;
  const info = describeCharacter(state?.character);
  setText(target.tier, info.label);
  setText(target.note, info.note);
  setText(target.money, `$${formatMoney(state?.money || 0)}`);
  setText(target.earned, `$${formatMoney(state?.totals?.earned || 0)}`);
  setText(target.spent, `$${formatMoney(state?.totals?.spent || 0)}`);
  setText(target.day, `Day ${Math.max(1, Number(state?.day) || 1)}`);
  setText(target.time, formatHours(Math.max(0, Number(state?.timeLeft) || 0)));
}

function renderSkillList(state) {
  const player = getElement('playerNodes') || {};
  const target = player.skills;
  if (!target?.list) return;

  const skills = SKILL_DEFINITIONS.map(def => describeSkill(def, state?.skills?.[def.id]));
  const topSkill = skills.reduce((best, skill) => {
    if (!best) return skill;
    if (skill.level > best.level) return skill;
    if (skill.level === best.level && skill.progressPercent > best.progressPercent) {
      return skill;
    }
    return best;
  }, null);
  const maxed = skills.filter(skill => !skill.nextTier).length;

  if (target.summary) {
    if (topSkill) {
      const highlight = `${topSkill.name} is shining at Lv ${topSkill.level}`;
      const completion = maxed > 0
        ? `${maxed} skill${maxed === 1 ? '' : 's'} mastered`
        : 'Keep stacking XP to master a discipline';
      target.summary.textContent = `${highlight} • ${completion}.`;
    } else {
      target.summary.textContent = 'Log XP to reveal your standout disciplines.';
    }
  }

  target.list.innerHTML = '';
  skills.forEach(skill => {
    const item = document.createElement('li');
    item.className = 'player-skill';

    const header = document.createElement('div');
    header.className = 'player-skill__header';
    const name = document.createElement('span');
    name.className = 'player-skill__name';
    name.textContent = skill.name;
    const badge = document.createElement('span');
    badge.className = 'player-skill__badge';
    badge.textContent = `LVL ${skill.level}`;
    header.append(name, badge);

    const tier = document.createElement('p');
    tier.className = 'player-skill__tier';
    tier.textContent = `${skill.tierTitle}`;

    const meter = document.createElement('div');
    meter.className = 'player-skill__meter';
    meter.setAttribute('role', 'progressbar');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', '100');
    meter.setAttribute('aria-valuenow', String(skill.progressPercent));
    meter.setAttribute('aria-label', `${skill.name} progress toward the next tier`);
    const fill = document.createElement('span');
    fill.style.setProperty('--progress', `${skill.progressPercent}%`);
    meter.appendChild(fill);

    const meta = document.createElement('p');
    meta.className = 'player-skill__meta';
    meta.textContent = skill.nextTier
      ? `${formatXp(skill.xp)} XP • ${formatXp(skill.remainingXp)} XP to ${skill.nextTier.title}`
      : `${formatXp(skill.xp)} XP • Max tier achieved`;

    item.append(header, tier, meter, meta);
    target.list.appendChild(item);
  });
}

const skillNameMap = new Map(SKILL_DEFINITIONS.map(def => [def.id, def.name]));

function formatSkillFocus(skills) {
  if (!Array.isArray(skills) || !skills.length) return null;
  const names = skills
    .map(entry => (typeof entry === 'string' ? entry : entry?.id))
    .filter(Boolean)
    .map(id => skillNameMap.get(id) || id);
  if (!names.length) return null;
  return formatList(names);
}

function renderEquipment(state) {
  const player = getElement('playerNodes') || {};
  const list = player.equipmentList;
  if (!list) return;
  list.innerHTML = '';

  const owned = registry.upgrades
    .filter(upgrade => !upgrade.repeatable)
    .filter(upgrade => getUpgradeState(upgrade.id, state)?.purchased);

  if (!owned.length) {
    const empty = document.createElement('li');
    empty.className = 'player-equipment__empty';
    empty.textContent = 'No gear purchased yet. Explore Upgrades to expand your toolkit.';
    list.appendChild(empty);
    return;
  }

  owned.forEach(upgrade => {
    const item = document.createElement('li');
    item.className = 'player-equipment__item';

    const name = document.createElement('div');
    name.className = 'player-equipment__name';
    name.textContent = upgrade.name;

    const summary = document.createElement('p');
    summary.className = 'player-equipment__summary';
    const summaryParts = [];
    if (upgrade.unlocks) summaryParts.push(`Unlocks ${upgrade.unlocks}`);
    if (upgrade.boosts) summaryParts.push(upgrade.boosts);
    const summaryText = summaryParts.join(' • ') || upgrade.description;
    summary.textContent = summaryText;

    const skills = formatSkillFocus(upgrade.skills);
    const note = document.createElement('p');
    note.className = 'player-equipment__note';
    note.textContent = skills ? `Skill focus: ${skills}` : 'Skill focus: Generalist boost';

    item.append(name, summary, note);
    list.appendChild(item);
  });
}

function formatEducationStatus(progress) {
  if (progress.completed) return 'Completed';
  if (progress.enrolled) return progress.studiedToday ? 'Studied today' : 'In progress';
  return 'Not enrolled';
}

function renderEducation(state) {
  const player = getElement('playerNodes') || {};
  const list = player.educationList;
  if (!list) return;
  list.innerHTML = '';

  const tracks = Object.values(KNOWLEDGE_TRACKS);
  tracks.forEach(track => {
    const progress = getKnowledgeProgress(track.id, state);
    const status = formatEducationStatus(progress);
    const item = document.createElement('li');
    item.className = 'player-education__item';
    item.dataset.status = progress.completed
      ? 'completed'
      : progress.enrolled
      ? 'active'
      : 'available';

    const header = document.createElement('div');
    header.className = 'player-education__header';
    const name = document.createElement('span');
    name.className = 'player-education__name';
    name.textContent = track.name;
    const badge = document.createElement('span');
    badge.className = 'player-education__status';
    badge.textContent = status;
    header.append(name, badge);

    const meta = document.createElement('p');
    meta.className = 'player-education__meta';
    const tuition = Number(track.tuition) > 0 ? `$${formatMoney(track.tuition)}` : 'Free';
    meta.textContent = `${progress.daysCompleted}/${track.days} days • ${formatHours(track.hoursPerDay)} per day • Tuition ${tuition}`;

    const note = document.createElement('p');
    note.className = 'player-education__note';
    if (progress.completed) {
      note.textContent = 'Course complete—permanent bonuses unlocked!';
    } else if (progress.enrolled) {
      note.textContent = progress.studiedToday
        ? 'Today’s session booked and underway.'
        : 'Session still waiting for focus time today.';
    } else {
      note.textContent = 'Enroll when you’re ready for a new boost.';
    }

    item.append(header, meta, note);
    list.appendChild(item);
  });
}

function countActiveAssets(state) {
  return registry.assets.reduce(
    (total, asset) => total + countActiveAssetInstances(asset.id, state),
    0
  );
}

function renderStats(state, summary) {
  const player = getElement('playerNodes') || {};
  const list = player.statsList;
  if (!list) return;
  list.innerHTML = '';

  const assistantState = getUpgradeState('assistant', state);
  const stats = [
    {
      label: 'Active ventures',
      value: String(countActiveAssets(state))
    },
    {
      label: 'Assistants on payroll',
      value: String(Math.max(0, Number(assistantState?.count) || 0))
    },
    {
      label: 'Passive earnings today',
      value: `$${formatMoney(summary?.passiveEarnings || 0)}`
    },
    {
      label: 'Daily upkeep spend',
      value: `$${formatMoney(summary?.upkeepSpend || 0)}`
    },
    {
      label: 'Active study tracks',
      value: summary?.knowledgeInProgress
        ? `${summary.knowledgeInProgress} active (${summary.knowledgePendingToday} waiting today)`
        : 'None scheduled'
    },
    {
      label: 'Focus booked today',
      value: formatHours(Math.max(0, Number(state?.baseTime || 0) + Number(state?.dailyBonusTime || 0) - Number(state?.timeLeft || 0)))
    }
  ];

  stats.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'player-stats__item';
    const label = document.createElement('span');
    label.className = 'player-stats__label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'player-stats__value';
    value.textContent = entry.value;
    item.append(label, value);
    list.appendChild(item);
  });
}

export function renderPlayerPanel(state, summary) {
  if (!state) return;
  renderSummary(state, summary);
  renderSkillList(state);
  renderEducation(state);
  renderEquipment(state);
  renderStats(state, summary);
}

