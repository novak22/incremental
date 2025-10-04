import { createSection, formatCurrency, toTitleCase } from './shared.js';

export function computeAssetHighlights(model = {}) {
  const groups = Array.isArray(model?.groups) ? model.groups : [];
  const highlights = [];

  groups.forEach(group => {
    const instances = Array.isArray(group?.instances) ? group.instances : [];
    instances.forEach(entry => {
      const instance = entry?.instance || {};
      if (!instance) return;
      const definition =
        entry?.definition || group?.definitions?.find(def => def?.id === entry?.definitionId) || {};
      const name =
        typeof instance.customName === 'string' && instance.customName.trim()
          ? instance.customName.trim()
          : `${definition.singular || definition.name || 'Asset'} #${(entry?.index ?? 0) + 1}`;
      const lifetime = Math.max(0, Number(instance.totalIncome) || 0);
      const lastPayout = Math.max(0, Number(instance.lastIncome) || 0);
      const status = entry?.status === 'active' ? 'Active' : 'In Setup';
      const nicheId = instance?.nicheId || null;
      highlights.push({
        id: instance.id || `${definition.id || 'asset'}-${entry?.index ?? 0}`,
        name,
        definitionName: definition.name || definition.id || 'Asset',
        lifetime,
        lastPayout,
        status,
        niche: nicheId ? toTitleCase(nicheId) : 'Generalist'
      });
    });
  });

  highlights.sort((a, b) => b.lifetime - a.lifetime);
  return highlights.slice(0, 3);
}

export function createAssetCard(entry) {
  const card = document.createElement('article');
  card.className = 'aboutyou-card aboutyou-card--asset';

  const header = document.createElement('header');
  header.className = 'aboutyou-card__header';

  const name = document.createElement('h3');
  name.className = 'aboutyou-card__title';
  name.textContent = entry?.name || 'Asset';

  const status = document.createElement('span');
  status.className = 'aboutyou-badge aboutyou-badge--info';
  status.textContent = entry?.status || 'Active';
  if (entry?.status === 'Active') {
    status.classList.replace('aboutyou-badge--info', 'aboutyou-badge--success');
  }

  header.append(name, status);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'aboutyou-card__meta';
  summary.textContent = `${entry?.definitionName || 'Venture'} • ${entry?.niche || 'Generalist'}`;
  card.appendChild(summary);

  const statRow = document.createElement('div');
  statRow.className = 'aboutyou-asset__stats';

  const lifetime = document.createElement('span');
  lifetime.className = 'aboutyou-asset__stat';
  lifetime.textContent = `${formatCurrency(entry?.lifetime || 0)} lifetime`;

  const last = document.createElement('span');
  last.className = 'aboutyou-asset__stat';
  last.textContent =
    entry?.lastPayout > 0 ? `${formatCurrency(entry.lastPayout)} last payout` : 'Next payout pending';

  statRow.append(lifetime, last);
  card.appendChild(statRow);

  return card;
}

export function renderAssetsSection(highlights = []) {
  const { section, body } = createSection('Portfolio Highlights', 'Spotlight your top performing builds.');
  body.classList.add('aboutyou-grid');

  if (!highlights.length) {
    const empty = document.createElement('p');
    empty.className = 'aboutyou-empty';
    empty.textContent = 'Launch a venture to showcase lifetime earnings here.';
    body.appendChild(empty);
    return section;
  }

  highlights.forEach(entry => body.appendChild(createAssetCard(entry)));
  return section;
}
