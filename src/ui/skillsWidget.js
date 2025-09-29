import elements from './elements.js';
import { getState } from '../core/state.js';
import { SKILL_DEFINITIONS } from '../game/skills/data.js';
import {
  describeCharacter,
  describeSkill,
  formatXp
} from './skills/helpers.js';

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
