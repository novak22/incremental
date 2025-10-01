import { formatMoney } from '../../../../core/helpers.js';

export function formatRoi(roi) {
  const numeric = Number(roi);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—';
  }
  return `$${formatMoney(numeric)} / h`;
}

export function createStat(label, value) {
  const stat = document.createElement('div');
  stat.className = 'browser-card__stat';
  const labelEl = document.createElement('span');
  labelEl.className = 'browser-card__stat-label';
  labelEl.textContent = label || 'Stat';
  const valueEl = document.createElement('span');
  valueEl.className = 'browser-card__stat-value';
  valueEl.textContent = value || '—';
  stat.append(labelEl, valueEl);
  return stat;
}

export default {
  createStat,
  formatRoi
};
