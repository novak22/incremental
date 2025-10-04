import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';

function createSummaryCard({ label, value, tone }) {
  const card = document.createElement('article');
  card.className = 'bankapp-summary__card';

  const labelNode = document.createElement('span');
  labelNode.className = 'bankapp-summary__label';
  labelNode.textContent = label;

  const valueNode = document.createElement('span');
  valueNode.className = 'bankapp-summary__value';
  valueNode.textContent = value;

  if (tone === 'positive') {
    valueNode.classList.add('is-positive');
  } else if (tone === 'negative') {
    valueNode.classList.add('is-negative');
  }

  card.append(labelNode, valueNode);
  return card;
}

export function renderSummaryCards(model = {}) {
  const summary = document.createElement('div');
  summary.className = 'bankapp-summary';

  const balanceValue = Number(model.currentBalance ?? model.cashOnHand ?? 0);
  const netValue = Number(model.netDaily || 0);
  const dailyIncomeValue = Number(model.dailyIncome || 0);
  const dailySpendValue = Number(model.dailySpend || 0);

  const cards = [
    { label: 'Current balance', value: formatCurrency(balanceValue), tone: 'neutral' },
    { label: 'Net / Day', value: formatSignedCurrency(netValue), tone: netValue > 0 ? 'positive' : netValue < 0 ? 'negative' : 'neutral' },
    { label: 'Daily +', value: formatCurrency(dailyIncomeValue), tone: dailyIncomeValue > 0 ? 'positive' : 'neutral' },
    { label: 'Daily -', value: formatCurrency(dailySpendValue > 0 ? -dailySpendValue : 0), tone: dailySpendValue > 0 ? 'negative' : 'neutral' }
  ];

  cards.forEach(entry => {
    summary.appendChild(createSummaryCard(entry));
  });

  return summary;
}

export function renderSummaryFootnote(model = {}) {
  const lifetimeEarnedValue = Number(model.lifetimeEarned || 0);
  const lifetimeSpentValue = Number(model.lifetimeSpent || 0);

  if (lifetimeEarnedValue <= 0 && lifetimeSpentValue <= 0) {
    return null;
  }

  const footnote = document.createElement('p');
  footnote.className = 'bankapp-summary__footnote';
  const earnedText = formatCurrency(lifetimeEarnedValue);
  const spentText = formatCurrency(lifetimeSpentValue > 0 ? -lifetimeSpentValue : 0);
  footnote.textContent = `Lifetime earned ${earnedText} • Lifetime spent ${spentText}`;
  return footnote;
}

export default {
  renderSummaryCards,
  renderSummaryFootnote
};
