function getSummaryMap(summaries = []) {
  return new Map(summaries.map(entry => [entry?.id, entry]));
}

function isPageLocked(meta = '') {
  return /lock/i.test(meta || '');
}

function describeTooltip(page, summary) {
  const parts = [];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  if (summary?.meta) {
    parts.push(summary.meta);
  }
  return parts.join(' — ');
}

function describeAriaLabel(page, summary) {
  const parts = [page?.label || 'Workspace'];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  if (summary?.meta) {
    parts.push(summary.meta);
  }
  return parts.join('. ');
}

function renderEmptyState({ listElement, emptyText, noteElement, noteText }) {
  if (!listElement) return;
  listElement.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'apps-widget__empty';
  empty.textContent = emptyText;
  listElement.appendChild(empty);
  if (noteElement) {
    noteElement.textContent = noteText;
  }
}

function createTileElement(page, summary) {
  const item = document.createElement('li');
  item.className = 'apps-widget__item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'apps-widget__tile';
  button.dataset.siteTarget = page.id;

  const tooltip = describeTooltip(page, summary);
  if (tooltip) {
    button.title = tooltip;
  }
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
  button.append(icon, label);
  item.appendChild(button);

  return item;
}

export {
  getSummaryMap,
  isPageLocked,
  describeTooltip,
  describeAriaLabel,
  renderEmptyState,
  createTileElement
};
