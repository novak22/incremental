import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';

function resolveTone(amount) {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
}

function createSummaryMetric({ label, value, tone, subtext }) {
  const cell = document.createElement('div');
  cell.className = 'bankapp-summary-strip__metric';
  cell.dataset.tone = tone || 'neutral';

  const title = document.createElement('span');
  title.className = 'bankapp-summary-strip__label';
  title.textContent = label;

  const numeric = document.createElement('span');
  numeric.className = 'bankapp-summary-strip__value';
  numeric.textContent = value;

  const context = document.createElement('span');
  context.className = 'bankapp-summary-strip__subtext';
  context.textContent = subtext;

  cell.append(title, numeric, context);
  return cell;
}

export function renderSummaryCards(model = {}) {
  const strip = document.createElement('div');
  strip.className = 'bankapp-summary-strip';

  const balanceValue = Number(model.currentBalance ?? model.cashOnHand ?? 0);
  const netValue = Number(model.netDaily || 0);
  const dailyIncomeValue = Number(model.dailyIncome || 0);
  const dailySpendValue = Number(model.dailySpend || 0);

  const metrics = [
    {
      label: 'Balance',
      value: formatCurrency(balanceValue),
      tone: resolveTone(balanceValue),
      subtext: 'On hand now'
    },
    {
      label: 'Inflow',
      value: formatCurrency(dailyIncomeValue),
      tone: resolveTone(dailyIncomeValue),
      subtext: 'Earned today'
    },
    {
      label: 'Outflow',
      value: formatCurrency(dailySpendValue > 0 ? dailySpendValue : 0),
      tone: dailySpendValue > 0 ? 'negative' : 'neutral',
      subtext: 'Spent today'
    },
    {
      label: 'Net flow',
      value: formatSignedCurrency(netValue),
      tone: resolveTone(netValue),
      subtext: netValue > 0 ? 'Ahead today' : netValue < 0 ? 'Down today' : 'Holding even'
    }
  ];

  metrics.forEach(entry => {
    strip.appendChild(createSummaryMetric(entry));
  });

  return strip;
}

export function renderSummaryFootnote(model = {}) {
  const notes = [];

  if (typeof model.metaSummary === 'string' && model.metaSummary.trim().length) {
    const meta = document.createElement('p');
    meta.className = 'bankapp-summary-strip__meta';
    meta.textContent = model.metaSummary.trim();
    notes.push(meta);
  }

  const lifetimeEarnedValue = Number(model.lifetimeEarned || 0);
  const lifetimeSpentValue = Number(model.lifetimeSpent || 0);

  if (lifetimeEarnedValue > 0 || lifetimeSpentValue > 0) {
    const footnote = document.createElement('p');
    footnote.className = 'bankapp-summary-strip__lifetime';
    const earnedText = formatCurrency(lifetimeEarnedValue);
    const spentText = formatCurrency(lifetimeSpentValue > 0 ? lifetimeSpentValue : 0);
    footnote.textContent = `Lifetime earned ${earnedText} · Lifetime spent ${spentText}`;
    notes.push(footnote);
  }

  if (!notes.length) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'bankapp-summary-strip__notes';
  notes.forEach(note => container.appendChild(note));
  return container;
}

export default {
  renderSummaryCards,
  renderSummaryFootnote
};
