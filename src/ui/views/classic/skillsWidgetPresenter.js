import { getElement } from '../../elements/registry.js';

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
  progress.setAttribute('aria-valuenow', String(skill.progressPercent ?? 0));
  progress.setAttribute('aria-label', `${skill.name} progress toward mastery`);
  const bar = document.createElement('div');
  bar.className = 'skills-widget__progress-bar';
  bar.style.setProperty('--progress', `${skill.progressPercent ?? 0}%`);
  progress.appendChild(bar);

  const meta = document.createElement('div');
  meta.className = 'skills-widget__meta';
  const xp = document.createElement('span');
  xp.textContent = `${skill.xp} XP total`;
  const next = document.createElement('span');
  next.textContent = skill.isMaxed
    ? 'Max tier achieved—shine on!'
    : `${skill.remainingXp} XP to ${skill.nextTier}`;
  meta.append(xp, next);

  item.append(label, progress, meta);
  return item;
}

function renderSection(section, model) {
  if (!section?.container || !section?.list) return;
  section.container.hidden = false;
  section.list.innerHTML = '';
  const items = Array.isArray(model?.items) ? model.items : [];
  items.forEach(skill => {
    section.list.appendChild(renderSkillItem(skill));
  });
  if (section.tier) {
    section.tier.textContent = model?.summary?.tier || '';
  }
  if (section.note) {
    section.note.textContent = model?.summary?.note || '';
  }
}

export function render(model) {
  const sections = getElement('skillSections') || {};
  renderSection(sections.dashboard, model);
  renderSection(sections.education, model);
}

const skillsWidgetPresenter = {
  render
};

export default skillsWidgetPresenter;
