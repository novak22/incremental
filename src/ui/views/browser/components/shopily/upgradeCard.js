import {
  collectUpgradeHighlights,
  describeUpgradeSnapshotTone
} from './helpers/upgrades.js';

export default function createUpgradeCard(upgrade, state = {}, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    describeSnapshotTone = describeUpgradeSnapshotTone,
    collectHighlights = collectUpgradeHighlights,
    onSelect = () => {}
  } = dependencies;

  const card = document.createElement('article');
  card.className = 'shopily-upgrade';
  const tone = describeSnapshotTone(upgrade.snapshot);
  card.dataset.status = tone;
  if (upgrade.id === state.selectedUpgradeId) {
    card.classList.add('is-active');
  }
  card.tabIndex = 0;

  const handleSelect = event => {
    if (event) {
      const key = event.key;
      if (key && key !== 'Enter' && key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
    }
    onSelect(upgrade.id);
  };

  card.addEventListener('click', () => handleSelect());
  card.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      handleSelect(event);
    }
  });

  const header = document.createElement('header');
  header.className = 'shopily-upgrade__header';

  const title = document.createElement('h3');
  title.textContent = upgrade.name;
  header.appendChild(title);

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'shopily-upgrade__badge';
    badge.textContent = upgrade.tag.label;
    header.appendChild(badge);
  }

  const summary = document.createElement('p');
  summary.className = 'shopily-upgrade__summary';
  summary.textContent = upgrade.description || 'Commerce boost';

  const highlights = document.createElement('ul');
  highlights.className = 'shopily-upgrade__highlights';
  const highlightEntries = collectHighlights(upgrade);
  if (!highlightEntries.length) {
    const fallback = document.createElement('li');
    fallback.textContent = 'Stacks with dropshipping payouts and progress.';
    highlights.appendChild(fallback);
  } else {
    highlightEntries.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlights.appendChild(item);
    });
  }

  const footer = document.createElement('div');
  footer.className = 'shopily-upgrade__footer';

  const meta = document.createElement('div');
  meta.className = 'shopily-upgrade__meta';

  const price = document.createElement('span');
  price.className = 'shopily-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);

  const status = document.createElement('span');
  status.className = 'shopily-upgrade__status';
  status.textContent = upgrade.status || 'Progress for this soon';

  meta.append(price, status);

  const actions = document.createElement('div');
  actions.className = 'shopily-upgrade__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'shopily-button shopily-button--ghost';
  viewButton.textContent = 'View product';
  viewButton.addEventListener('click', event => {
    event.stopPropagation();
    onSelect(upgrade.id);
  });

  actions.appendChild(viewButton);
  footer.append(meta, actions);

  card.append(header, summary, highlights, footer);
  return card;
}
