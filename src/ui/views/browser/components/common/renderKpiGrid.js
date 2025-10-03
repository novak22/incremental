import { appendContent } from './domHelpers.js';

const DEFAULT_THEME = {
  container: 'asset-kpis',
  grid: 'asset-kpis__grid',
  card: 'asset-kpi',
  label: 'asset-kpi__label',
  value: 'asset-kpi__value',
  note: 'asset-kpi__note',
  empty: 'asset-kpis__empty'
};

function formatValue(item) {
  if (typeof item.formatValue === 'function') {
    return item.formatValue(item.value, item);
  }
  if (item.valueNode) {
    return item.valueNode;
  }
  if (item.value != null) {
    return String(item.value);
  }
  return '';
}

export function renderKpiGrid(options = {}) {
  const { items = [], className, theme: themeOverride = {}, emptyState } = options;
  const theme = { ...DEFAULT_THEME, ...themeOverride };

  const section = document.createElement('section');
  section.className = className || theme.container;

  if (!Array.isArray(items) || items.length === 0) {
    if (emptyState?.message) {
      const empty = document.createElement('p');
      empty.className = theme.empty;
      appendContent(empty, emptyState.message);
      section.appendChild(empty);
    }
    return section;
  }

  const grid = document.createElement('div');
  grid.className = theme.grid;

  items.forEach(item => {
    if (!item) return;
    const card = document.createElement('article');
    card.className = item.className || theme.card;
    if (item.id) {
      card.dataset.metricId = item.id;
    }
    if (item.tone) {
      card.dataset.tone = String(item.tone);
    }

    const label = document.createElement('span');
    label.className = theme.label;
    appendContent(label, item.label ?? '');

    const value = document.createElement('p');
    value.className = theme.value;
    appendContent(value, formatValue(item));

    card.append(label, value);

    if (item.note) {
      const note = document.createElement('span');
      note.className = theme.note;
      appendContent(note, item.note);
      card.appendChild(note);
    }

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

export default {
  renderKpiGrid
};
