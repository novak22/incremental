import elements from './elements.js';
import { getState } from '../core/state.js';
import { enableAssetInstanceList } from './assetInstances.js';

const ASSET_CATEGORY_KEYS = {
  foundation: 'foundation',
  creative: 'creative',
  commerce: 'commerce',
  advanced: 'advanced'
};

const UPGRADE_GROUPS = {
  assistant: 'automation',
  course: 'automation',
  camera: 'equipment',
  studio: 'equipment',
  coffee: 'consumables'
};

export function renderCardCollections({ hustles, education, assets, upgrades }) {
  renderCollection(hustles, elements.hustleGrid);
  renderCollection(education, elements.educationGrid);
  renderAssetCollections(assets);
  renderUpgradeCollections(upgrades);
}

export function updateCard(definition) {
  if (!definition.ui) return;
  const state = getState();
  for (const detail of definition.ui.details) {
    if (typeof detail.render === 'function') {
      detail.element.innerHTML = detail.render(state);
    }
  }
  if (definition.action && definition.ui.button) {
    const label = typeof definition.action.label === 'function' ? definition.action.label(state) : definition.action.label;
    definition.ui.button.textContent = label;
    const disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    definition.ui.button.disabled = disabled;
    definition.ui.card.classList.toggle('unavailable', disabled);
  }
  if (typeof definition.cardState === 'function') {
    definition.cardState(state, definition.ui.card);
  }
  if (typeof definition.update === 'function') {
    definition.update(state, definition.ui);
  }
}

export function updateAllCards({ hustles, education, assets, upgrades }) {
  for (const definition of hustles) {
    updateCard(definition);
  }
  for (const definition of education) {
    updateCard(definition);
  }
  for (const definition of assets) {
    updateCard(definition);
  }
  for (const definition of upgrades) {
    updateCard(definition);
  }
}

function renderAssetCollections(definitions) {
  if (!elements.assetCategoryGrids) return;
  for (const container of Object.values(elements.assetCategoryGrids)) {
    if (container) container.innerHTML = '';
  }

  for (const definition of definitions) {
    const categoryKey = normalizeCategory(definition.tag?.label);
    const container = elements.assetCategoryGrids[categoryKey] || elements.assetGridRoot;
    if (!container) continue;
    enableAssetInstanceList(definition);
    createCard(definition, container, { category: categoryKey });
  }
}

function renderUpgradeCollections(definitions) {
  if (!elements.upgradeGroupGrids) return;
  for (const container of Object.values(elements.upgradeGroupGrids)) {
    if (container) container.innerHTML = '';
  }

  for (const definition of definitions) {
    const groupKey = UPGRADE_GROUPS[definition.id] || 'misc';
    const container = elements.upgradeGroupGrids[groupKey] || elements.upgradeGrid;
    if (!container) continue;
    createCard(definition, container, { group: groupKey });
  }
}

function renderCollection(definitions, container) {
  if (!container) return;
  container.innerHTML = '';
  for (const def of definitions) {
    createCard(def, container);
  }
}

function createCard(definition, container, metadata = {}) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `${definition.id}-card`;
  if (Array.isArray(definition.initialClasses)) {
    for (const cls of definition.initialClasses) {
      card.classList.add(cls);
    }
  }
  if (metadata.category) {
    card.dataset.category = metadata.category;
  }
  if (metadata.group) {
    card.dataset.group = metadata.group;
  }

  const header = document.createElement('div');
  header.className = 'card-header';
  const title = document.createElement('h3');
  title.textContent = definition.name;
  header.appendChild(title);
  if (definition.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = `tag ${definition.tag.type || ''}`.trim();
    tagEl.textContent = definition.tag.label;
    header.appendChild(tagEl);
  }
  card.appendChild(header);

  if (definition.description) {
    const description = document.createElement('p');
    description.textContent = definition.description;
    card.appendChild(description);
  }

  const detailEntries = [];
  if (definition.details && definition.details.length) {
    const list = document.createElement('ul');
    list.className = 'details';
    for (const detail of definition.details) {
      const li = document.createElement('li');
      li.innerHTML = typeof detail === 'function' ? detail(state) : detail;
      list.appendChild(li);
      detailEntries.push({ render: detail, element: li });
    }
    card.appendChild(list);
  }

  let button = null;
  if (definition.action) {
    button = document.createElement('button');
    button.className = definition.action.className || 'primary';
    const label = typeof definition.action.label === 'function' ? definition.action.label(state) : definition.action.label;
    button.textContent = label;
    const disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    button.disabled = disabled;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      definition.action.onClick();
    });
    card.classList.toggle('unavailable', disabled);
    card.appendChild(button);
  }

  const extra = typeof definition.extraContent === 'function' ? (definition.extraContent(card, state) || {}) : {};

  container.appendChild(card);
  definition.ui = {
    card,
    button,
    details: detailEntries,
    extra
  };
}

function normalizeCategory(label = '') {
  const key = label.toLowerCase();
  if (ASSET_CATEGORY_KEYS[key]) {
    return ASSET_CATEGORY_KEYS[key];
  }
  if (key === 'knowledge') {
    return 'creative';
  }
  return 'foundation';
}
