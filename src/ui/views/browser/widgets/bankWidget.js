import { buildFinanceModel } from '../../../cards/model/index.js';
import { formatCurrency, formatSignedCurrency } from '../utils/financeFormatting.js';

let elements = null;
let initialized = false;

function ensureElements(widgetElements = {}) {
  if (elements) return;
  elements = widgetElements;
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

function createChip({ id, label, value, tone = 'neutral', note, position }) {
  const chip = document.createElement('span');
  chip.className = 'bank-widget__chip';
  chip.dataset.tone = tone;
  if (position) {
    chip.dataset.position = position;
  }
  if (id) {
    chip.dataset.id = id;
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

  const chipDefinitions = [];

  function scheduleChip({
    id,
    label,
    amount = 0,
    direction = 'in',
    note = '',
    position = 'left',
    valueFormatter = formatSignedCurrency
  }) {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    const normalizedDirection = direction === 'out' ? 'out' : 'in';
    const tone = safeAmount === 0 ? 'neutral' : normalizedDirection === 'out' ? 'out' : 'in';
    const signedAmount = normalizedDirection === 'out' ? -Math.abs(safeAmount) : Math.abs(safeAmount);
    const resolvedPosition = position === 'right' ? 'right' : 'left';
    const resolvedValueFormatter = typeof valueFormatter === 'function' ? valueFormatter : formatSignedCurrency;

    chipDefinitions.push({
      id,
      label,
      value: resolvedValueFormatter(signedAmount),
      tone,
      note,
      position: resolvedPosition
    });
  }

  const quick = header?.quickObligation || {};
  scheduleChip({
    id: 'quick-obligation',
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
  scheduleChip({
    id: 'top-earner',
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
    scheduleChip({
      id: `pulse-${slot.id}`,
      label: entry?.label || slot.fallbackLabel,
      amount: entry?.amount ?? 0,
      direction: entry?.direction || slot.fallbackDirection,
      note: entry?.note || 'Live cash pulse',
      position: slot.position
    });
  });

  const leftDefinitions = chipDefinitions.filter(definition => definition.position === 'left');
  const rightDefinitions = chipDefinitions.filter(definition => definition.position === 'right');

  const topEarnerIndex = rightDefinitions.findIndex(definition => definition.id === 'top-earner');
  if (topEarnerIndex >= 0) {
    const [topDefinition] = rightDefinitions.splice(topEarnerIndex, 1);
    rightDefinitions.push(topDefinition);
  }

  elements.highlights.innerHTML = '';

  const columns = [];
  if (leftDefinitions.length > 0) {
    const leftColumn = document.createElement('div');
    leftColumn.className = 'bank-widget__column bank-widget__column--left';
    leftDefinitions.forEach(definition => leftColumn.appendChild(createChip(definition)));
    columns.push(leftColumn);
  }

  if (rightDefinitions.length > 0) {
    const rightColumn = document.createElement('div');
    rightColumn.className = 'bank-widget__column bank-widget__column--right';
    rightDefinitions.forEach(definition => rightColumn.appendChild(createChip(definition)));
    columns.push(rightColumn);
  }

  if (columns.length === 0) {
    elements.highlights.hidden = true;
    return;
  }

  columns.forEach(column => elements.highlights.appendChild(column));
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
