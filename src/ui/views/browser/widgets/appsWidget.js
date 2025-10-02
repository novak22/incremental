import { SERVICE_PAGES } from '../config.js';
import {
  getLatestServiceSummaries,
  subscribeToServiceSummaries
} from '../cardsPresenter.js';

let elements = null;
let initialized = false;
let latestSummaries = [];

function ensureElements(widgetElements = {}) {
  if (elements) return;
  elements = widgetElements;
}

function getSummaryMap() {
  return new Map(latestSummaries.map(entry => [entry?.id, entry]));
}

function isPageLocked(meta = '') {
  return /lock/i.test(meta || '');
}

function describeTooltip(page) {
  return page?.tagline ? page.tagline : '';
}

function describeAriaLabel(page) {
  const parts = [page?.label || 'Workspace'];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  return parts.join('. ');
}

function renderEmptyState() {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'apps-widget__empty';
  empty.textContent = 'Unlock more apps to populate this list.';
  elements.list.appendChild(empty);
  if (elements?.note) {
    elements.note.textContent = 'Unlock more workspaces through upgrades and courses.';
  }
}

function renderList() {
  if (!elements?.list) return;
  const summaryMap = getSummaryMap();
  const pages = SERVICE_PAGES.filter(page => !isPageLocked(summaryMap.get(page.id)?.meta));

  elements.list.innerHTML = '';

  if (!pages.length) {
    renderEmptyState();
    return;
  }

  pages.forEach(page => {
    const item = document.createElement('li');
    item.className = 'apps-widget__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'apps-widget__tile';
    button.dataset.siteTarget = page.id;
    const tooltip = describeTooltip(page);
    if (tooltip) {
      button.title = tooltip;
    }
    button.setAttribute('aria-label', describeAriaLabel(page));
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'apps-widget__icon';
    icon.textContent = page.icon || '✨';

    const label = document.createElement('span');
    label.className = 'apps-widget__label';

    const name = document.createElement('span');
    name.className = 'apps-widget__name';
    name.textContent = page.label;

    label.appendChild(name);

    button.append(icon, label);
    item.appendChild(button);
    elements.list.appendChild(item);
  });

  if (elements?.note) {
    elements.note.textContent = 'Hover to preview each workspace, click to launch instantly.';
  }
}

function handleServiceSummaries(summaries = []) {
  latestSummaries = Array.isArray(summaries) ? summaries.filter(entry => entry?.id) : [];
  renderList();
}

function init(widgetElements = {}) {
  if (initialized) return;
  ensureElements(widgetElements);
  initialized = true;
  subscribeToServiceSummaries(handleServiceSummaries);
  handleServiceSummaries(getLatestServiceSummaries());
}

function render() {
  renderList();
}

export default {
  init,
  render
};
