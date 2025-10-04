import { ensureArray } from '../../../../../../core/helpers.js';
import {
  buildDetailSections,
  buildHighlights,
  createBadge,
  createDetailCta,
  createDetailHeader,
  createDetailPricing,
  createEmptyDetail,
  createStatusBadge,
  describeStatus,
  formatPrice
} from '../detail/index.js';
import { collectCatalogItems, filterCatalogItems, findCatalogItem } from '../catalogData.js';

function createCatalogCard({ item, state, definitionMap, onSelect, onBuy }) {
  const status = describeStatus(item.model?.snapshot || {});
  const card = document.createElement('article');
  card.className = 'shopstack-card';
  card.dataset.upgradeId = item.model.id;
  card.dataset.upgrade = item.model.id;
  if (status.tone === 'owned') card.classList.add('is-owned');
  if (status.tone === 'locked') card.classList.add('is-locked');
  if (status.tone === 'unaffordable') card.classList.add('is-unaffordable');
  if (state.selectedItemId === item.model.id) card.classList.add('is-active');
  card.tabIndex = 0;

  card.addEventListener('click', event => {
    if (event.target.closest('.shopstack-card__buy')) return;
    onSelect?.(item.model.id);
  });
  card.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(item.model.id);
    }
  });

  const header = document.createElement('header');
  header.className = 'shopstack-card__header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'shopstack-card__titleblock';

  const title = document.createElement('h3');
  title.className = 'shopstack-card__title';
  title.textContent = item.model.name;
  headerLeft.appendChild(title);

  const metaRow = document.createElement('div');
  metaRow.className = 'shopstack-card__meta';
  const tagBadge = createBadge(item.model?.tag?.label, item.model?.tag?.type || 'default');
  if (tagBadge) {
    metaRow.appendChild(tagBadge);
  }
  const categoryBadge = createBadge(item.category?.copy?.label, 'category');
  if (categoryBadge) {
    metaRow.appendChild(categoryBadge);
  }
  const familyBadge = createBadge(item.family?.copy?.label, 'family');
  if (familyBadge) {
    metaRow.appendChild(familyBadge);
  }
  if (metaRow.children.length) {
    headerLeft.appendChild(metaRow);
  }

  header.append(headerLeft, createStatusBadge(status));

  const description = document.createElement('p');
  description.className = 'shopstack-card__description';
  description.textContent = item.model?.description || 'Preview the perks this upgrade unlocks.';

  const price = document.createElement('p');
  price.className = 'shopstack-card__price';
  price.textContent = formatPrice(item.model?.cost);

  const highlights = buildHighlights(item.definition, { definitionMap });

  const actions = document.createElement('div');
  actions.className = 'shopstack-card__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopstack-button shopstack-card__buy';
  if (status.tone === 'owned') {
    button.textContent = 'Owned';
    button.disabled = true;
  } else if (status.tone === 'ready') {
    button.textContent = 'Buy now';
  } else if (status.tone === 'unaffordable') {
    button.textContent = 'Save up';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onBuy?.(item.definition, button);
  });

  actions.appendChild(button);

  card.append(header, description, price, highlights, actions);
  return card;
}

function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'shopstack-empty';
  empty.textContent = 'No upgrades match the current filters. Adjust your search to explore more boosts.';
  return empty;
}

function createCatalogGrid({ items, state, definitionMap, onSelect, onBuy }) {
  const grid = document.createElement('div');
  grid.className = 'shopstack-grid';
  if (!items.length) {
    grid.appendChild(renderEmptyState());
    return grid;
  }
  items.forEach(item => {
    grid.appendChild(createCatalogCard({ item, state, definitionMap, onSelect, onBuy }));
  });
  return grid;
}

function buildCategoryToolbar({ model, state, onSelectCategory }) {
  const categories = document.createElement('div');
  categories.className = 'shopstack-categories';

  const makeButton = (id, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopstack-chip';
    if (state.category === id) {
      button.classList.add('is-active');
    }
    button.textContent = label;
    button.addEventListener('click', () => {
      onSelectCategory?.(id);
    });
    return button;
  };

  categories.appendChild(makeButton('all', 'All categories'));
  ensureArray(model.categories).forEach(category => {
    const label = category?.copy?.label || category?.name || 'Category';
    categories.appendChild(makeButton(category?.id, label));
  });

  return categories;
}

function buildCatalogToolbar({ model, state, onSearch, onSelectCategory }) {
  const toolbar = document.createElement('div');
  toolbar.className = 'shopstack-toolbar';

  const search = document.createElement('div');
  search.className = 'shopstack-search';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search ShopStack inventory';
  input.value = state.search || '';
  input.addEventListener('input', event => {
    onSearch?.(event.target.value);
  });

  const icon = document.createElement('span');
  icon.className = 'shopstack-search__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🔍';

  search.append(icon, input);

  toolbar.append(search, buildCategoryToolbar({ model, state, onSelectCategory }));
  return toolbar;
}

export default function renderCatalogView({ model, state, definitionMap, handlers = {} }) {
  const items = collectCatalogItems(model, definitionMap);
  const filtered = filterCatalogItems(items, state);
  const selected = findCatalogItem(filtered, state.selectedItemId) || filtered[0] || null;

  const section = document.createElement('section');
  section.className = 'shopstack__layout';

  const catalog = document.createElement('div');
  catalog.className = 'shopstack-catalog';
  catalog.appendChild(
    buildCatalogToolbar({
      model,
      state,
      onSearch: handlers.onSearch,
      onSelectCategory: handlers.onSelectCategory
    })
  );
  catalog.appendChild(
    createCatalogGrid({
      items: filtered,
      state,
      definitionMap,
      onSelect: handlers.onSelectItem,
      onBuy: handlers.onBuy
    })
  );

  const detail = document.createElement('aside');
  detail.className = 'shopstack-detail';

  if (!selected) {
    detail.appendChild(createEmptyDetail());
  } else {
    const status = describeStatus(selected.model?.snapshot || {});
    const header = createDetailHeader({ item: selected, status });
    const priceRow = createDetailPricing({ item: selected });

    const statusRow = document.createElement('div');
    statusRow.className = 'shopstack-detail__status-row';
    statusRow.appendChild(createStatusBadge(status));

    const cta = createDetailCta({
      status,
      onClick: button => handlers.onBuy?.(selected.definition, button)
    });

    const sections = buildDetailSections(selected.definition, { definitionMap });
    detail.append(header, priceRow, statusRow, cta, ...sections);
  }

  section.append(catalog, detail);
  return section;
}
