import {
  formatCurrency as baseFormatCurrency,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../../utils/formatting.js';

export const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'cent' });
export const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });

export function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function createProgressBar(percent, label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'aboutyou-progress';
  const clamped = clampPercent(percent);
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-valuemin', '0');
  wrapper.setAttribute('aria-valuemax', '100');
  wrapper.setAttribute('aria-valuenow', String(clamped));
  if (label) {
    wrapper.setAttribute('aria-label', label);
  }

  const fill = document.createElement('span');
  fill.className = 'aboutyou-progress__fill';
  fill.style.setProperty('--progress', `${clamped}%`);
  wrapper.appendChild(fill);
  return wrapper;
}

export function createBadge(text, variant = 'info') {
  const badge = document.createElement('span');
  badge.className = `aboutyou-badge aboutyou-badge--${variant}`;
  badge.textContent = text;
  return badge;
}

export function createSection(title, subtitle) {
  const section = document.createElement('section');
  section.className = 'aboutyou-section';

  const header = document.createElement('header');
  header.className = 'aboutyou-section__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  if (subtitle) {
    const note = document.createElement('p');
    note.textContent = subtitle;
    note.className = 'aboutyou-section__note';
    header.appendChild(note);
  }

  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'aboutyou-section__body';
  section.appendChild(body);

  return { section, body };
}

export function toTitleCase(value) {
  if (!value) return '';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
