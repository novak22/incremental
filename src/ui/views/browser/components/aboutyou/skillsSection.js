import { createBadge, createProgressBar, createSection } from './shared.js';

export function createSkillCard(skill) {
  const card = document.createElement('article');
  card.className = 'aboutyou-card aboutyou-card--skill';
  if (skill?.isMaxed) {
    card.classList.add('is-maxed');
  }

  const header = document.createElement('header');
  header.className = 'aboutyou-card__header';

  const name = document.createElement('h3');
  name.className = 'aboutyou-card__title';
  name.textContent = skill?.name || 'Skill';

  const level = document.createElement('span');
  level.className = 'aboutyou-card__badge';
  level.textContent = `Lv ${skill?.level ?? 0}`;

  header.append(name, level);
  card.appendChild(header);

  const tier = document.createElement('p');
  tier.className = 'aboutyou-card__subtitle';
  tier.textContent = skill?.tierTitle || '';
  card.appendChild(tier);

  const progress = createProgressBar(skill?.progressPercent ?? 0, `${skill?.name || 'Skill'} progress`);
  card.appendChild(progress);

  const meta = document.createElement('p');
  meta.className = 'aboutyou-card__meta';
  meta.textContent = skill?.isMaxed
    ? `${skill?.xp} XP • Mastered`
    : `${skill?.xp} XP • ${skill?.remainingXp} XP to ${skill?.nextTier || 'next tier'}`;
  card.appendChild(meta);

  if (skill?.isMaxed) {
    card.appendChild(createBadge('Milestone achieved', 'success'));
  }

  return card;
}

export function renderSkillsSection(skills = {}) {
  const items = Array.isArray(skills?.items) ? skills.items : [];
  const summaryText = [skills?.summary?.primary, skills?.summary?.secondary]
    .filter(Boolean)
    .join(' • ');
  const { section, body } = createSection('Skills & Endorsements', summaryText);
  body.classList.add('aboutyou-grid');

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'aboutyou-empty';
    empty.textContent = 'Log XP across your hustles to reveal skill milestones.';
    body.appendChild(empty);
    return section;
  }

  items.forEach(skill => {
    body.appendChild(createSkillCard(skill));
  });

  return section;
}
