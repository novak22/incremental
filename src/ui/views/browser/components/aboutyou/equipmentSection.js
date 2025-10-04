import { createBadge, createSection, formatCurrency } from './shared.js';

export function createEquipmentCard(entry) {
  const card = document.createElement('article');
  card.className = 'aboutyou-card aboutyou-card--equipment';

  const header = document.createElement('header');
  header.className = 'aboutyou-card__header';

  const name = document.createElement('h3');
  name.className = 'aboutyou-card__title';
  name.textContent = entry?.name || 'Equipment';

  const status = typeof entry?.status === 'string' ? entry.status : 'Ready';
  const normalized = status.trim().toLowerCase();
  let badgeVariant = 'info';
  if (normalized === 'active') badgeVariant = 'success';
  if (normalized === 'retired' || normalized === 'stored') badgeVariant = 'muted';
  const badgeLabel = normalized === 'active' ? 'In loadout' : status || 'Ready';
  const badge = createBadge(badgeLabel, badgeVariant);

  header.append(name, badge);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'aboutyou-card__meta';
  summary.textContent = entry?.summary || '';
  card.appendChild(summary);

  const focus = document.createElement('p');
  focus.className = 'aboutyou-card__note';
  focus.textContent = entry?.focus || '';
  card.appendChild(focus);

  const cost = Number(entry?.cost) || 0;
  if (cost > 0) {
    const costNote = document.createElement('p');
    costNote.className = 'aboutyou-card__note aboutyou-card__note--cost';
    costNote.textContent = `Purchased for ${formatCurrency(cost)}`;
    card.appendChild(costNote);
  }

  return card;
}

export function renderEquipmentSection(equipment = {}) {
  const owned = Array.isArray(equipment?.items)
    ? equipment.items.filter(item => item?.status !== 'locked')
    : [];
  const { section, body } = createSection(
    'Equipment Locker',
    'Tools, rigs, and future upgrades powering your empire.'
  );
  body.classList.add('aboutyou-grid');

  if (!owned.length) {
    const empty = document.createElement('p');
    empty.className = 'aboutyou-empty';
    empty.textContent =
      equipment?.empty || 'No gear purchased yet. Explore Upgrades to expand your toolkit.';
    body.appendChild(empty);
    return section;
  }

  owned.forEach(entry => body.appendChild(createEquipmentCard(entry)));

  return section;
}
