import { ensureArray, toCurrency } from './utils.js';

export function buildPulseSummary(summary = {}) {
  const entries = [];
  const passiveBreakdown = ensureArray(summary.passiveBreakdown);
  const offlinePortion = passiveBreakdown
    .filter(entry => entry?.stream === 'offline')
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  const passiveOnly = Math.max(0, toCurrency(summary.passiveEarnings) - offlinePortion);
  const active = toCurrency(summary.activeEarnings);
  if (active > 0) {
    entries.push({ id: 'active', label: 'Active', amount: active, direction: 'in', icon: '💼' });
  }
  if (passiveOnly > 0) {
    entries.push({ id: 'passive', label: 'Passive', amount: passiveOnly, direction: 'in', icon: '🌙' });
  }
  if (offlinePortion > 0) {
    entries.push({ id: 'offline', label: 'Offline', amount: offlinePortion, direction: 'in', icon: '🛰️' });
  }

  const upkeep = toCurrency(summary.upkeepSpend);
  if (upkeep > 0) {
    entries.push({ id: 'upkeep', label: 'Upkeep', amount: upkeep, direction: 'out', icon: '⚙️' });
  }

  const tuitionSpend = ensureArray(summary.spendBreakdown)
    .filter(entry => typeof entry?.key === 'string' && entry.key.includes(':tuition'))
    .reduce((sum, entry) => sum + toCurrency(entry?.amount), 0);
  if (tuitionSpend > 0) {
    entries.push({ id: 'tuition', label: 'Tuition', amount: tuitionSpend, direction: 'out', icon: '🎓' });
  }

  const otherSpend = Math.max(0, toCurrency(summary.totalSpend) - upkeep - tuitionSpend);
  if (otherSpend > 0) {
    entries.push({ id: 'investments', label: 'Invest', amount: otherSpend, direction: 'out', icon: '🚀' });
  }

  return entries;
}

export function computeTopEarner(summary = {}) {
  const pools = [
    ...ensureArray(summary.earningsBreakdown),
    ...ensureArray(summary.passiveBreakdown)
  ];
  let top = null;
  pools.forEach(entry => {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!top || amount > top.amount) {
      top = {
        label: entry?.label || entry?.definition?.label || 'Top earner',
        amount,
        stream: entry?.stream || entry?.category || 'income'
      };
    }
  });
  return top;
}

