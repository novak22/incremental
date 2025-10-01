import { formatMoney } from '../../../../core/helpers.js';

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}

export function createMetricTile({ icon, label, value, note }) {
  const tile = createElement('article', 'browser-focus-metric');

  const header = createElement('header', 'browser-focus-metric__header');
  const iconSpan = createElement('span', 'browser-focus-metric__icon', icon || '✨');
  const title = createElement('span', 'browser-focus-metric__label', label || 'Metric');
  header.append(iconSpan, title);

  const valueEl = createElement('span', 'browser-focus-metric__value', value || '—');
  const noteEl = createElement('span', 'browser-focus-metric__note', note || '');

  tile.append(header, valueEl, noteEl);
  return tile;
}

export function createShortcutButton(entry) {
  const button = createElement('button', 'browser-shortcut');
  button.type = 'button';
  button.textContent = entry?.title || 'Action';
  if (entry?.buttonLabel && entry.buttonLabel !== entry.title) {
    button.dataset.actionLabel = entry.buttonLabel;
  }
  if (entry?.subtitle) {
    button.title = entry.subtitle;
  }
  button.disabled = Boolean(entry?.disabled);
  if (typeof entry?.onClick === 'function') {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      entry.onClick();
    });
  }
  return button;
}

export function createNotificationItem(entry, resolveAction) {
  const item = createElement('li', 'browser-update');

  const header = createElement('div', 'browser-update__info');
  const title = createElement('strong', 'browser-update__title', entry?.label || 'Update');
  const message = createElement('span', 'browser-update__message', entry?.message || '');
  header.append(title, message);

  const actionWrapper = createElement('div', 'browser-update__actions');
  const button = createElement('button', 'browser-update__button');
  button.type = 'button';
  button.textContent = entry?.action?.label || 'Open';
  const handler = resolveAction?.(entry);
  if (handler) {
    button.addEventListener('click', handler);
  } else {
    button.disabled = true;
  }

  actionWrapper.append(button);
  item.append(header, actionWrapper);
  return item;
}

export function formatRoi(roi) {
  const numeric = Number(roi);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—';
  }
  return `$${formatMoney(numeric)} / h`;
}

export function createStat(label, value) {
  const stat = createElement('div', 'browser-card__stat');
  const labelEl = createElement('span', 'browser-card__stat-label', label || 'Stat');
  const valueEl = createElement('span', 'browser-card__stat-value', value || '—');
  stat.append(labelEl, valueEl);
  return stat;
}

export default {
  createMetricTile,
  createShortcutButton,
  createNotificationItem,
  createStat,
  formatRoi
};
