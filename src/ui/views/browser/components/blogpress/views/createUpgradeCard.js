import {
  collectUpgradeHighlights,
  describeUpgradeSnapshotTone
} from '../helpers/upgrades.js';

export default function createUpgradeCard(upgrade, state = {}, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    describeSnapshotTone = describeUpgradeSnapshotTone,
    collectHighlights = collectUpgradeHighlights,
    onSelect = () => {}
  } = dependencies;

  const card = document.createElement('article');
  card.className = 'blogpress-upgrade';
  const tone = describeSnapshotTone(upgrade.snapshot || {});
  if (tone) {
    card.dataset.status = tone;
  }
  if (upgrade.id === state.selectedUpgradeId) {
    card.classList.add('is-active');
  }
  card.tabIndex = 0;

  const handleSelect = event => {
    if (event) {
      const key = event.key;
      if (key && key !== 'Enter' && key !== ' ') {
        return;
      }
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
  header.className = 'blogpress-upgrade__header';

  const title = document.createElement('h3');
  title.textContent = upgrade.name;
  header.appendChild(title);

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'blogpress-upgrade__badge';
    badge.textContent = upgrade.tag.label;
    header.appendChild(badge);
  }

  const summary = document.createElement('p');
  summary.className = 'blogpress-upgrade__summary';
  summary.textContent = upgrade.description || 'Blog boost';

  const highlights = document.createElement('ul');
  highlights.className = 'blogpress-upgrade__highlights';
  const highlightEntries = collectHighlights(upgrade);
  if (!highlightEntries.length) {
    const fallback = document.createElement('li');
    fallback.textContent = 'Pairs with blog payouts and writing rituals.';
    highlights.appendChild(fallback);
  } else {
    highlightEntries.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlights.appendChild(item);
    });
  }

  const footer = document.createElement('div');
  footer.className = 'blogpress-upgrade__footer';

  const meta = document.createElement('div');
  meta.className = 'blogpress-upgrade__meta';

  const price = document.createElement('span');
  price.className = 'blogpress-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);

  const status = document.createElement('span');
  status.className = 'blogpress-upgrade__status';
  status.textContent = upgrade.status || 'Progress toward unlock requirements.';

  meta.append(price, status);

  const actions = document.createElement('div');
  actions.className = 'blogpress-upgrade__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'blogpress-button blogpress-button--ghost';
  viewButton.textContent = 'Review upgrade';
  viewButton.addEventListener('click', event => {
    event.stopPropagation();
    onSelect(upgrade.id);
  });

  actions.appendChild(viewButton);
  footer.append(meta, actions);

  card.append(header, summary, highlights, footer);
  return card;
}
