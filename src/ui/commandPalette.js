import elements from './elements.js';
import { listCatalog } from '../game/content/catalog.js';
import { buildQuickActions } from './dashboard.js';
import { getState } from '../core/state.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { registry } from '../game/registry.js';

const paletteState = {
  actions: [],
  filtered: [],
  activeIndex: -1,
  query: ''
};

function init() {
  const search = elements.commandPaletteSearch;
  const results = elements.commandPaletteResults;
  if (!search || !results) return;

  search.addEventListener('input', event => {
    applyFilter(event.target.value || '');
  });
  search.addEventListener('keydown', handleKeyDown);
  search.addEventListener('focus', prepare);

  results.addEventListener('click', handleResultClick);
  results.addEventListener('mouseover', handleOptionHover);

  prepare();
}

function prepare() {
  refreshActions();
  const search = elements.commandPaletteSearch;
  applyFilter(search ? search.value || '' : '');
}

function refreshActions() {
  const search = elements.commandPaletteSearch;
  const results = elements.commandPaletteResults;
  if (!search || !results) return;

  const state = getState();
  if (!state) {
    paletteState.actions = [];
    paletteState.filtered = [];
    paletteState.activeIndex = -1;
    renderResults();
    return;
  }
  const map = new Map();

  const quickEntries = buildQuickActions(state) || [];
  quickEntries.forEach(entry => {
    const definition = registry.hustles.find(hustle => hustle.id === entry.id);
    const actionId = definition?.action?.id || 'action';
    const key = `hustle:${entry.id}:${actionId}`;
    const handler = typeof entry.onClick === 'function'
      ? entry.onClick
      : definition?.action?.onClick;
    if (typeof handler !== 'function') return;
    const label = entry.label || definition?.name || 'Quick action';
    map.set(key, {
      key,
      label,
      description: entry.description
        ? `Quick action • ${entry.description}`
        : 'Quick action',
      onSelect: () => handler(),
      celebrate: `Quick win locked in: ${label}. Keep the streak glowing!`
    });
  });

  const catalogEntries = listCatalog(state) || [];
  catalogEntries
    .filter(entry => entry.available)
    .forEach(entry => {
      const action = createCatalogAction(entry);
      if (!action) return;
      if (map.has(action.key)) {
        const existing = map.get(action.key);
        if (!existing.description && action.description) {
          existing.description = action.description;
        }
        if (!existing.celebrate && action.celebrate) {
          existing.celebrate = action.celebrate;
        }
        map.set(action.key, existing);
        return;
      }
      map.set(action.key, action);
    });

  paletteState.actions = Array.from(map.values())
    .map(enrichAction)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function createCatalogAction(entry) {
  const handler = resolveCatalogHandler(entry);
  if (typeof handler !== 'function') return null;
  const label = entry.label || entry.sourceName || 'Action';
  const description = formatCatalogDetail(entry);
  return enrichAction({
    key: entry.key,
    label,
    description,
    onSelect: () => handler(),
    celebrate: `${label} queued. Momentum rising!`
  });
}

function resolveCatalogHandler(entry) {
  switch (entry?.sourceType) {
    case 'asset': {
      const definition = registry.assets.find(item => item.id === entry.sourceId);
      const handler = definition?.action?.onClick;
      return typeof handler === 'function' ? () => handler() : null;
    }
    case 'hustle':
    case 'study': {
      const definition = registry.hustles.find(item => item.id === entry.sourceId);
      const handler = definition?.action?.onClick;
      return typeof handler === 'function' ? () => handler() : null;
    }
    case 'upgrade': {
      const definition = registry.upgrades.find(item => item.id === entry.sourceId);
      const handler = definition?.action?.onClick;
      return typeof handler === 'function' ? () => handler() : null;
    }
    default:
      return null;
  }
}

function formatCatalogDetail(entry) {
  if (!entry) return '';
  const segments = [];
  const typeLabel = formatSourceType(entry.sourceType);
  if (typeLabel) segments.push(typeLabel);
  if (entry.sourceName && entry.sourceName !== entry.label) {
    segments.push(entry.sourceName);
  }
  const costParts = [];
  if (entry.timeCost > 0) {
    costParts.push(formatHours(entry.timeCost));
  }
  if (entry.moneyCost > 0) {
    costParts.push(`$${formatMoney(entry.moneyCost)}`);
  }
  if (!costParts.length) {
    costParts.push('Instant');
  }
  segments.push(...costParts);
  return segments.join(' • ');
}

function formatSourceType(sourceType) {
  switch (sourceType) {
    case 'asset':
      return 'Asset setup';
    case 'hustle':
      return 'Hustle';
    case 'study':
      return 'Study enrollment';
    case 'upgrade':
      return 'Upgrade';
    default:
      return '';
  }
}

function enrichAction(action) {
  const base = action || {};
  const label = base.label || '';
  const description = base.description || '';
  return {
    ...base,
    searchText: `${label} ${description} ${base.key || ''}`.toLowerCase().trim()
  };
}

function applyFilter(rawQuery) {
  const search = elements.commandPaletteSearch;
  const results = elements.commandPaletteResults;
  if (!search || !results) return;
  const query = (rawQuery || '').trim().toLowerCase();
  paletteState.query = query;

  if (!query) {
    paletteState.filtered = paletteState.actions.slice();
  } else {
    paletteState.filtered = paletteState.actions.filter(action =>
      action.searchText.includes(query)
    );
  }

  paletteState.activeIndex = paletteState.filtered.length ? 0 : -1;
  renderResults();
}

function renderResults() {
  const results = elements.commandPaletteResults;
  if (!results) return;
  results.textContent = '';

  if (!paletteState.filtered.length) {
    const empty = document.createElement('li');
    empty.className = 'command-list__empty';
    empty.setAttribute('role', 'presentation');
    empty.textContent = paletteState.actions.length
      ? 'No matches yet. Try a different spark.'
      : 'Actions will appear once your day gets rolling.';
    results.appendChild(empty);
    updateActiveOption();
    return;
  }

  paletteState.filtered.forEach((action, index) => {
    const item = document.createElement('li');
    item.id = `command-palette-option-${index}`;
    item.role = 'option';
    item.tabIndex = -1;
    item.dataset.index = String(index);
    item.dataset.key = action.key || '';
    item.setAttribute('aria-selected', 'false');

    const title = document.createElement('div');
    title.className = 'command-list__title';
    title.textContent = action.label;
    item.appendChild(title);

    if (action.description) {
      const detail = document.createElement('p');
      detail.className = 'command-list__detail';
      detail.textContent = action.description;
      item.appendChild(detail);
    }

    results.appendChild(item);
  });

  updateActiveOption();
}

function updateActiveOption() {
  const search = elements.commandPaletteSearch;
  const results = elements.commandPaletteResults;
  if (!search || !results) return;
  const options = results.querySelectorAll('li[role="option"]');
  let activeId = '';
  options.forEach(option => {
    const index = Number(option.dataset.index);
    const isActive = index === paletteState.activeIndex;
    option.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      activeId = option.id;
      option.scrollIntoView({ block: 'nearest' });
    }
  });

  if (activeId) {
    search.setAttribute('aria-activedescendant', activeId);
  } else {
    search.removeAttribute('aria-activedescendant');
  }
}

function handleKeyDown(event) {
  if (!paletteState.filtered.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveActiveIndex(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveActiveIndex(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (paletteState.activeIndex >= 0) {
      selectAction(paletteState.activeIndex);
    }
  }
}

function moveActiveIndex(step) {
  const total = paletteState.filtered.length;
  if (!total) return;
  let next = paletteState.activeIndex;
  if (next < 0) {
    next = step > 0 ? 0 : total - 1;
  } else {
    next = Math.max(0, Math.min(total - 1, next + step));
  }
  paletteState.activeIndex = next;
  updateActiveOption();
}

function handleResultClick(event) {
  const option = event.target.closest('li[role="option"]');
  if (!option) return;
  const index = Number(option.dataset.index);
  if (!Number.isFinite(index)) return;
  paletteState.activeIndex = index;
  updateActiveOption();
  selectAction(index);
}

function handleOptionHover(event) {
  const option = event.target.closest('li[role="option"]');
  if (!option) return;
  const index = Number(option.dataset.index);
  if (!Number.isFinite(index)) return;
  if (index === paletteState.activeIndex) return;
  paletteState.activeIndex = index;
  updateActiveOption();
}

function selectAction(index) {
  const action = paletteState.filtered[index];
  if (!action || typeof action.onSelect !== 'function') return;
  let success = true;
  try {
    action.onSelect();
  } catch (error) {
    success = false;
    console.error('Command palette action failed', error);
  }
  announce(action, success);
  elements.commandPalette?.hidePalette?.();
}

function announce(action, success) {
  const status = elements.sessionStatus;
  if (!status || !action) return;
  if (success) {
    const message = action.celebrate || `Command launched: ${action.label}. Keep the flywheel humming!`;
    status.textContent = message;
  } else {
    status.textContent = `We hit a snag launching ${action.label}. Check the log for clues.`;
  }
}

const commandPalette = {
  init,
  prepare
};

export default commandPalette;
