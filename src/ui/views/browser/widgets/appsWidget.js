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

function describeTooltip(page, summary = {}) {
  const parts = [];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  if (summary?.meta) {
    parts.push(`Status: ${summary.meta}`);
  }
  return parts.join(' • ');
}

function describeAriaLabel(page, summary = {}) {
  const parts = [page?.label || 'Workspace'];
  if (summary?.meta) {
    parts.push(summary.meta);
  } else if (page?.tagline) {
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
    const summary = summaryMap.get(page.id) || {};
    const item = document.createElement('li');
    item.className = 'apps-widget__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'apps-widget__tile';
    button.dataset.siteTarget = page.id;
    button.title = describeTooltip(page, summary);
    button.setAttribute('aria-label', describeAriaLabel(page, summary));
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

    if (summary.meta) {
      const badge = document.createElement('span');
      badge.className = 'apps-widget__badge';
      badge.textContent = summary.meta;
      label.appendChild(badge);
    }

    button.append(icon, label);
    item.appendChild(button);
    elements.list.appendChild(item);
  });

  if (elements?.note) {
    elements.note.textContent = 'Hover to peek the description, click to launch instantly.';
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
