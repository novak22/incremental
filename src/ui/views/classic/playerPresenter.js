import { getElement } from '../../elements/registry.js';
import setText from '../../dom.js';

function renderSummary(summary) {
  const nodes = getElement('playerNodes') || {};
  const target = nodes.summary;
  if (!target) return;
  setText(target.tier, summary?.tier);
  setText(target.note, summary?.note);
  setText(target.money, summary?.formatted?.current);
  setText(target.earned, summary?.formatted?.earned);
  setText(target.spent, summary?.formatted?.spent);
  setText(target.day, summary?.formatted?.day);
  setText(target.time, summary?.formatted?.time);
}

function renderSkillSummary(target, summary) {
  if (!target?.summary) return;
  const parts = [];
  if (summary?.primary) parts.push(summary.primary);
  if (summary?.secondary) parts.push(summary.secondary);
  target.summary.textContent = parts.filter(Boolean).join(' • ');
}

function renderSkillList(target, items = []) {
  if (!target?.list) return;
  target.list.innerHTML = '';
  items.forEach(skill => {
    if (!skill) return;
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
    tier.textContent = skill.tierTitle;

    const meter = document.createElement('div');
    meter.className = 'player-skill__meter';
    meter.setAttribute('role', 'progressbar');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', '100');
    meter.setAttribute('aria-valuenow', String(skill.progressPercent ?? 0));
    meter.setAttribute('aria-label', `${skill.name} progress toward the next tier`);
    const fill = document.createElement('span');
    fill.style.setProperty('--progress', `${skill.progressPercent ?? 0}%`);
    meter.appendChild(fill);

    const meta = document.createElement('p');
    meta.className = 'player-skill__meta';
    meta.textContent = skill.isMaxed
      ? `${skill.xp} XP • Max tier achieved`
      : `${skill.xp} XP • ${skill.remainingXp} XP to ${skill.nextTier}`;

    item.append(header, tier, meter, meta);
    target.list.appendChild(item);
  });
}

function renderSkills(skills) {
  const nodes = getElement('playerNodes') || {};
  const target = nodes.skills;
  if (!target) return;
  renderSkillSummary(target, skills?.summary);
  renderSkillList(target, skills?.items);
}

function renderEquipment(equipment) {
  const nodes = getElement('playerNodes') || {};
  const list = nodes.equipmentList;
  if (!list) return;
  list.innerHTML = '';

  const items = Array.isArray(equipment?.items) ? equipment.items : [];
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'player-equipment__empty';
    empty.textContent = equipment?.empty
      || 'No gear purchased yet. Explore Upgrades to expand your toolkit.';
    list.appendChild(empty);
    return;
  }

  items.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'player-equipment__item';

    const name = document.createElement('div');
    name.className = 'player-equipment__name';
    name.textContent = entry.name;

    const summary = document.createElement('p');
    summary.className = 'player-equipment__summary';
    summary.textContent = entry.summary || '';

    const note = document.createElement('p');
    note.className = 'player-equipment__note';
    note.textContent = entry.focus || '';

    item.append(name, summary, note);
    list.appendChild(item);
  });
}

function renderEducation(education) {
  const nodes = getElement('playerNodes') || {};
  const list = nodes.educationList;
  if (!list) return;
  list.innerHTML = '';

  const items = Array.isArray(education?.items) ? education.items : [];
  items.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'player-education__item';
    item.dataset.status = entry.state || 'available';

    const header = document.createElement('div');
    header.className = 'player-education__header';
    const name = document.createElement('span');
    name.className = 'player-education__name';
    name.textContent = entry.name;
    const badge = document.createElement('span');
    badge.className = 'player-education__status';
    badge.textContent = entry.status;
    header.append(name, badge);

    const meta = document.createElement('p');
    meta.className = 'player-education__meta';
    meta.textContent = entry.summary || '';

    const note = document.createElement('p');
    note.className = 'player-education__note';
    note.textContent = entry.note || '';

    item.append(header, meta, note);
    list.appendChild(item);
  });
}

export function render(model) {
  if (!model) return;
  renderSummary(model.summary);
  renderSkills(model.skills);
  renderEquipment(model.equipment);
  renderEducation(model.education);
}

const playerPresenter = {
  render
};

export default playerPresenter;
