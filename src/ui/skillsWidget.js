import elements from './elements.js';
import { getState } from '../core/state.js';
import {
  SKILL_DEFINITIONS,
  SKILL_LEVELS,
  CHARACTER_LEVELS
} from '../game/skills/data.js';

const numberFormatter = new Intl.NumberFormat('en-US');

function formatXp(value) {
  return numberFormatter.format(Math.max(0, Math.round(Number(value) || 0)));
}

function findSkillTier(level) {
  return SKILL_LEVELS.find(tier => tier.level === level) || SKILL_LEVELS[0];
}

function findNextSkillTier(level) {
  return SKILL_LEVELS.find(tier => tier.level === level + 1) || null;
}

function describeSkill(definition, stateEntry = {}) {
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

function findCharacterTier(level) {
  return CHARACTER_LEVELS.find(tier => tier.level === level) || CHARACTER_LEVELS[0];
}

function describeCharacter(character = {}) {
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

function renderSkillItem(skill) {
  const item = document.createElement('li');
  item.className = 'skills-widget__item';

  const label = document.createElement('div');
  label.className = 'skills-widget__label';
  const name = document.createElement('span');
  name.className = 'skills-widget__name';
  name.textContent = skill.name;
  const tier = document.createElement('span');
  tier.className = 'skills-widget__tier';
  tier.textContent = `${skill.tierTitle} · Lv ${skill.level}`;
  label.append(name, tier);

  const progress = document.createElement('div');
  progress.className = 'skills-widget__progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(skill.progressPercent));
  progress.setAttribute('aria-label', `${skill.name} progress toward mastery`);
  const bar = document.createElement('div');
  bar.className = 'skills-widget__progress-bar';
  bar.style.setProperty('--progress', `${skill.progressPercent}%`);
  progress.appendChild(bar);

  const meta = document.createElement('div');
  meta.className = 'skills-widget__meta';
  const xp = document.createElement('span');
  xp.textContent = `${formatXp(skill.xp)} XP total`;
  const next = document.createElement('span');
  next.textContent = skill.nextTier
    ? `${formatXp(skill.remainingXp)} XP to ${skill.nextTier.title}`
    : 'Max tier achieved—shine on!';
  meta.append(xp, next);

  item.append(label, progress, meta);
  return item;
}

function renderSkillList(target, skillState = {}) {
  const list = target?.list;
  if (!list) return;
  list.innerHTML = '';

  SKILL_DEFINITIONS.forEach(definition => {
    const skill = describeSkill(definition, skillState[definition.id]);
    const item = renderSkillItem(skill);
    list.appendChild(item);
  });
}

function renderSkillSummary(target, character) {
  if (!target?.tier || !target?.note) return;
  const summary = describeCharacter(character);
  target.tier.textContent = summary.label;
  target.note.textContent = summary.note;
}

function renderTarget(target, state) {
  if (!target?.container) return;
  renderSkillSummary(target, state.character);
  renderSkillList(target, state.skills);
}

export function renderSkillWidgets(state = getState()) {
  if (!state) return;
  renderTarget(elements.skills?.dashboard, state);
  renderTarget(elements.skills?.education, state);
}

export default { renderSkillWidgets };
