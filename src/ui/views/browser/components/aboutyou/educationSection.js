import { createBadge, createProgressBar, createSection } from './shared.js';

export function createEducationCard(entry) {
  const card = document.createElement('article');
  card.className = 'aboutyou-card aboutyou-card--education';
  card.dataset.state = entry?.state || 'available';

  const header = document.createElement('header');
  header.className = 'aboutyou-card__header';

  const name = document.createElement('h3');
  name.className = 'aboutyou-card__title';
  name.textContent = entry?.name || 'Study track';

  const status = createBadge(
    entry?.status || 'Available',
    entry?.completed ? 'success' : entry?.state === 'active' ? 'info' : 'muted'
  );

  header.append(name, status);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'aboutyou-card__meta';
  summary.textContent = entry?.summary || '';
  card.appendChild(summary);

  if (entry?.state === 'active') {
    const progress = createProgressBar((entry?.percent ?? 0) * 100, `${entry?.name || 'Track'} progress`);
    card.appendChild(progress);
  }

  const note = document.createElement('p');
  note.className = 'aboutyou-card__note';
  note.textContent = entry?.note || '';
  card.appendChild(note);

  if (entry?.state === 'completed') {
    card.appendChild(createBadge('Certification earned', 'success'));
  }

  return card;
}

export function renderEducationSection(education = {}) {
  const items = Array.isArray(education?.items) ? education.items : [];
  const visibleStates = new Set(['active', 'completed']);
  const earned = items.filter(entry => visibleStates.has(entry?.state));
  const { section, body } = createSection(
    'Education & Certifications',
    'Active study tracks + completed accolades.'
  );
  body.classList.add('aboutyou-grid');

  if (!earned.length) {
    const empty = document.createElement('p');
    empty.className = 'aboutyou-empty';
    empty.textContent =
      education?.empty || 'Browse Learnly to enroll in courses and unlock permanent bonuses.';
    body.appendChild(empty);
    return section;
  }

  const order = { active: 0, completed: 1, available: 2 };
  earned
    .slice()
    .sort((a, b) => (order[a?.state] ?? 3) - (order[b?.state] ?? 3))
    .forEach(entry => body.appendChild(createEducationCard(entry)));

  return section;
}
