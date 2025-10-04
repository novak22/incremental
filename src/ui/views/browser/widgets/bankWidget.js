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

function renderHighlights(header = {}) {
  if (!elements?.highlights) return;

  const chips = [];

  function addChip({ label, amount = 0, direction = 'in', note = '', position = 'left', valueFormatter = formatSignedCurrency }) {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    const normalizedDirection = direction === 'out' ? 'out' : 'in';
    const tone = safeAmount === 0 ? 'neutral' : normalizedDirection === 'out' ? 'out' : 'in';
    const signedAmount = normalizedDirection === 'out' ? -Math.abs(safeAmount) : Math.abs(safeAmount);

    chips.push(
      createChip({
        label,
        value: valueFormatter(signedAmount),
        tone,
        note,
        position
      })
    );
  }

  const quick = header?.quickObligation || {};
  addChip({
    label: quick?.label || 'Next due',
    amount: quick?.amount ?? 0,
    direction: quick?.direction || 'out',
    note: quick?.note || '',
    position: 'left'
  });

  const top = header?.topEarner || {};
  const topLabel = top?.label || '—';
  const topAmount = Number(top?.amount ?? 0);
  const topNote = top?.note || (Number.isFinite(topAmount) && topAmount > 0 ? 'Highest payout logged today' : '');
  addChip({
    label: 'Top earner',
    amount: topAmount,
    direction: top?.direction || 'in',
    note: topNote,
    position: 'right',
    valueFormatter: amount => `${topLabel} • ${formatSignedCurrency(amount)}`
  });

  const pulseEntries = Array.isArray(header?.pulse) ? header.pulse : [];
  const pulseMap = new Map();
  pulseEntries.forEach(entry => {
    if (!entry?.id) return;
    pulseMap.set(entry.id, entry);
  });

  const orderedPulseSlots = [
    { id: 'active', fallbackLabel: 'Active', fallbackDirection: 'in', position: 'left' },
    { id: 'passive', fallbackLabel: 'Passive', fallbackDirection: 'in', position: 'right' },
    { id: 'offline', fallbackLabel: 'Offline', fallbackDirection: 'in', position: 'left' },
    { id: 'upkeep', fallbackLabel: 'Upkeep', fallbackDirection: 'out', position: 'left' },
    { id: 'tuition', fallbackLabel: 'Tuition', fallbackDirection: 'out', position: 'right' },
    { id: 'investments', fallbackLabel: 'Investments', fallbackDirection: 'out', position: 'right' }
  ];

  orderedPulseSlots.forEach(slot => {
    const entry = pulseMap.get(slot.id) || {};
    addChip({
      label: entry?.label || slot.fallbackLabel,
      amount: entry?.amount ?? 0,
      direction: entry?.direction || slot.fallbackDirection,
      note: entry?.note || 'Live cash pulse',
      position: slot.position
    });
  });

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
