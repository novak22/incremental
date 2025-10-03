import { buildFinanceModel } from '../../../cards/model/index.js';
import { formatMoney } from '../../../../core/helpers.js';

let elements = null;
let initialized = false;

function ensureElements(widgetElements = {}) {
  if (elements) return;
  elements = widgetElements;
}

function formatCurrency(amount) {
  const numeric = Number(amount);
  const absolute = Math.abs(Number.isFinite(numeric) ? numeric : 0);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

function formatSignedCurrency(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return '$0';
  }
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const sign = numeric > 0 ? '+' : '-';
  return `${sign}$${formatted}`;
}

function decorateValue(element, tone) {
  element.classList.remove('is-positive', 'is-negative');
  if (tone === 'positive') {
    element.classList.add('is-positive');
  } else if (tone === 'negative') {
    element.classList.add('is-negative');
  }
}

function buildStat(label, value, tone = 'neutral') {
  const row = document.createElement('li');
  row.className = 'bank-widget__stat';

  const name = document.createElement('span');
  name.className = 'bank-widget__label';
  name.textContent = label;

  const amount = document.createElement('span');
  amount.className = 'bank-widget__value';
  amount.textContent = value;
  decorateValue(amount, tone);

  row.append(name, amount);
  return row;
}

function renderStats(header = {}) {
  if (!elements?.stats) return;
  const balance = Number(header?.currentBalance ?? header?.cashOnHand ?? 0);
  const netDaily = Number(header?.netDaily ?? 0);
  const income = Number(header?.dailyIncome ?? 0);
  const spend = Number(header?.dailySpend ?? 0);

  const stats = [
    buildStat('Current balance', formatCurrency(balance), 'neutral'),
    buildStat(
      'Net / Day',
      formatSignedCurrency(netDaily),
      netDaily > 0 ? 'positive' : netDaily < 0 ? 'negative' : 'neutral'
    ),
    buildStat('Daily +', formatCurrency(income), income > 0 ? 'positive' : 'neutral'),
    buildStat('Daily -', formatCurrency(spend > 0 ? -spend : 0), spend > 0 ? 'negative' : 'neutral')
  ];

  elements.stats.innerHTML = '';
  stats.forEach(stat => elements.stats.appendChild(stat));
}

function renderFootnote(header = {}) {
  if (!elements?.footnote) return;
  const earned = Number(header?.lifetimeEarned ?? 0);
  const spent = Number(header?.lifetimeSpent ?? 0);
  if (earned <= 0 && spent <= 0) {
    elements.footnote.hidden = true;
    elements.footnote.textContent = '';
    return;
  }
  const earnedText = formatCurrency(earned);
  const spentText = formatCurrency(spent > 0 ? -spent : 0);
  elements.footnote.hidden = false;
  elements.footnote.textContent = `Lifetime earned ${earnedText} • Lifetime spent ${spentText}`;
}

function createChip({ label, value, tone = 'neutral', note, position }) {
  const chip = document.createElement('span');
  chip.className = 'bank-widget__chip';
  chip.dataset.tone = tone;
  if (position) {
    chip.dataset.position = position;
  }

  const chipLabel = document.createElement('span');
  chipLabel.className = 'bank-widget__chip-label';
  chipLabel.textContent = label;

  const chipValue = document.createElement('span');
  chipValue.className = 'bank-widget__chip-value';
  chipValue.textContent = value;

  chip.append(chipLabel, chipValue);
  if (note) {
    chip.title = note;
  }
  return chip;
}

function extractPulseEntry(pulseEntries = [], preferredIds = []) {
  if (!pulseEntries.length) return null;
  if (preferredIds.length) {
    const matchIndex = pulseEntries.findIndex(entry => preferredIds.includes(entry?.id));
    if (matchIndex >= 0) {
      return pulseEntries.splice(matchIndex, 1)[0];
    }
  }
  return pulseEntries.shift() || null;
}

function resolvePulseChipConfig(entry, { fallbackLabel, fallbackDirection = 'in' }) {
  const amount = Number(entry?.amount ?? 0);
  const direction = entry?.direction || fallbackDirection;
  const tone = amount > 0 ? (direction === 'out' ? 'out' : 'in') : 'neutral';
  const signedAmount = direction === 'out' ? -Math.abs(amount) : Math.abs(amount);
  return {
    label: entry?.label || fallbackLabel,
    value: formatSignedCurrency(signedAmount),
    tone,
    note: entry?.note || 'Live cash pulse'
  };
}

function renderHighlights(header = {}) {
  if (!elements?.highlights) return;

  const chips = [];
  const quick = header?.quickObligation || null;
  const quickAmount = Math.max(0, Number(quick?.amount ?? 0));
  chips.push(
    createChip({
      label: quick?.label || 'Next due',
      value: formatCurrency(quickAmount),
      tone: quickAmount > 0 ? 'out' : 'neutral',
      note: quick?.note || '',
      position: 'left'
    })
  );

  const top = header?.topEarner || null;
  const topAmount = Math.max(0, Number(top?.amount ?? 0));
  const topLabel = top?.label || '—';
  chips.push(
    createChip({
      label: 'Top earner',
      value: `${topLabel} • ${formatCurrency(topAmount)}`,
      tone: topAmount > 0 ? 'in' : 'neutral',
      note: topAmount > 0 ? 'Highest payout logged today' : '',
      position: 'right'
    })
  );

  const pulseEntries = Array.isArray(header?.pulse) ? header.pulse.slice() : [];
  const primaryPulse = extractPulseEntry(pulseEntries, ['active', 'passive', 'offline']);
  const secondaryPulse = extractPulseEntry(pulseEntries, ['passive', 'offline', 'upkeep', 'tuition', 'investments']);

  const primaryConfig = resolvePulseChipConfig(primaryPulse, {
    fallbackLabel: 'Active',
    fallbackDirection: 'in'
  });
  chips.push(
    createChip({
      ...primaryConfig,
      position: 'left'
    })
  );

  const secondaryConfig = resolvePulseChipConfig(secondaryPulse, {
    fallbackLabel: 'Passive',
    fallbackDirection: 'in'
  });
  chips.push(
    createChip({
      ...secondaryConfig,
      position: 'right'
    })
  );

  elements.highlights.innerHTML = '';
  chips.forEach(chip => elements.highlights.appendChild(chip));
  elements.highlights.hidden = false;
}

function render(context = {}) {
  if (!initialized) return;
  if (!context?.state) {
    if (elements?.stats) {
      elements.stats.innerHTML = '';
    }
    if (elements?.footnote) {
      elements.footnote.hidden = true;
      elements.footnote.textContent = '';
    }
    if (elements?.highlights) {
      elements.highlights.hidden = true;
      elements.highlights.innerHTML = '';
    }
    return;
  }

  const model = buildFinanceModel(undefined, undefined, {
    getState: () => context.state
  });
  renderStats(model?.header || {});
  renderFootnote(model?.header || {});
  renderHighlights(model?.header || {});
}

function init(widgetElements = {}) {
  if (initialized) return;
  ensureElements(widgetElements);
  initialized = true;
}

export default {
  init,
  render
};
