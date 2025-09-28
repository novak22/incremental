import elements from './elements.js';
import { getState } from '../core/state.js';

export function renderCardCollections({ hustles, assets, upgrades }) {
  renderCollection(hustles, elements.hustleGrid);
  renderCollection(assets, elements.assetGrid);
  renderCollection(upgrades, elements.upgradeGrid);
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
  }
  if (typeof definition.cardState === 'function') {
    definition.cardState(state, definition.ui.card);
  }
  if (typeof definition.update === 'function') {
    definition.update(state, definition.ui);
  }
}

export function updateAllCards({ hustles, assets, upgrades }) {
  for (const definition of hustles) {
    updateCard(definition);
  }
  for (const definition of assets) {
    updateCard(definition);
  }
  for (const definition of upgrades) {
    updateCard(definition);
  }
}

function renderCollection(definitions, container) {
  container.innerHTML = '';
  for (const def of definitions) {
    createCard(def, container);
  }
}

function createCard(definition, container) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `${definition.id}-card`;
  if (Array.isArray(definition.initialClasses)) {
    for (const cls of definition.initialClasses) {
      card.classList.add(cls);
    }
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
    button.disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      definition.action.onClick();
    });
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
