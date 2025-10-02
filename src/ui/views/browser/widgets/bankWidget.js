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

function createChip({ label, value, tone = 'neutral', note }) {
  const chip = document.createElement('span');
  chip.className = 'bank-widget__chip';
  chip.dataset.tone = tone;

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

  if (header?.quickObligation) {
    chips.push(
      createChip({
        label: header.quickObligation.label || 'Next due',
        value: formatCurrency(header.quickObligation.amount || 0),
        tone: 'out',
        note: header.quickObligation.note || ''
      })
    );
  }

  if (header?.topEarner) {
    chips.push(
      createChip({
        label: 'Top earner',
        value: `${header.topEarner.label} • ${formatCurrency(header.topEarner.amount || 0)}`,
        tone: 'in',
        note: 'Highest payout logged today'
      })
    );
  }

  const pulse = Array.isArray(header?.pulse) ? header.pulse.slice(0, 2) : [];
  pulse.forEach(entry => {
    chips.push(
      createChip({
        label: entry.label || 'Pulse',
        value: formatSignedCurrency(entry.direction === 'out' ? -entry.amount : entry.amount),
        tone: entry.direction === 'out' ? 'out' : 'in',
        note: 'Live cash pulse'
      })
    );
  });

  elements.highlights.innerHTML = '';
  if (!chips.length) {
    elements.highlights.hidden = true;
    return;
  }

  chips.forEach(chip => elements.highlights.appendChild(chip));
  elements.highlights.hidden = false;
}

function renderHistory(history = []) {
  if (!elements?.historySection || !elements?.historyList) return;
  const entries = Array.isArray(history) ? history.slice(0, 7) : [];
  elements.historyList.innerHTML = '';
  if (!entries.length) {
    elements.historySection.hidden = true;
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bank-widget__history-item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const label = document.createElement('span');
    label.className = 'bank-widget__history-label';
    label.textContent = entry?.label || 'Day';

    const net = document.createElement('span');
    net.className = 'bank-widget__history-net';
    net.textContent = formatSignedCurrency(entry?.totals?.net || 0);

    const breakdown = document.createElement('span');
    breakdown.className = 'bank-widget__history-breakdown';
    const totals = entry?.totals || {};
    breakdown.textContent = `${formatCurrency(totals.income || 0)} / ${formatCurrency(
      totals.spend ? -totals.spend : 0
    )}`;

    item.append(label, net, breakdown);
    elements.historyList.appendChild(item);
  });

  elements.historySection.hidden = false;
}

function formatActivityTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch (err) {
    return '';
  }
}

function renderActivity(activity = []) {
  if (!elements?.activitySection || !elements?.activityList) return;
  const entries = Array.isArray(activity) ? activity.slice(0, 6) : [];
  elements.activityList.innerHTML = '';
  if (!entries.length) {
    elements.activitySection.hidden = true;
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bank-widget__activity-item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const message = document.createElement('span');
    message.className = 'bank-widget__activity-message';
    message.textContent = entry?.message || '';

    const time = document.createElement('time');
    time.className = 'bank-widget__activity-time';
    const timestampValue = Number(entry?.timestamp);
    const formatted = formatActivityTime(timestampValue);
    if (formatted) {
      time.dateTime = new Date(timestampValue).toISOString();
      time.textContent = formatted;
    }

    item.append(message);
    if (formatted) {
      item.appendChild(time);
    }
    elements.activityList.appendChild(item);
  });

  elements.activitySection.hidden = false;
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
    if (elements?.historySection) {
      elements.historySection.hidden = true;
      if (elements.historyList) {
        elements.historyList.innerHTML = '';
      }
    }
    if (elements?.activitySection) {
      elements.activitySection.hidden = true;
      if (elements.activityList) {
        elements.activityList.innerHTML = '';
      }
    }
    return;
  }

  const model = buildFinanceModel(undefined, {
    getState: () => context.state
  });
  renderStats(model?.header || {});
  renderFootnote(model?.header || {});
  renderHighlights(model?.header || {});
  renderHistory(model?.history || []);
  renderActivity(model?.activity || []);
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
