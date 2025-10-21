import { createBankSection } from './ledger.js';
import { formatCurrency } from '../../utils/financeFormatting.js';

function createStatusPill(status) {
  const pill = document.createElement('span');
  pill.className = `bankapp-status bankapp-status--${status}`;
  pill.textContent = status;
  return pill;
}

function formatSegments(segments = []) {
  return segments.length ? segments.join(' · ') : 'All clear';
}

function normalizeLabel(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map(word => {
      const uppercase = word.replace(/[^A-Z]/g, '').length;
      return uppercase > 1 ? word : word.toLowerCase();
    })
    .join(' ');
}

function buildObligationSegments(entries = []) {
  if (!Array.isArray(entries) || !entries.length) {
    return ['No upkeep due'];
  }
  return entries.map(entry => {
    const label = normalizeLabel(entry.label || 'obligation');
    return `${formatCurrency(Number(entry.amount) || 0)} ${label}`;
  });
}

function groupPendingIncome(entries = []) {
  const map = new Map();
  entries.forEach(entry => {
    const key = normalizeLabel(entry.assetName || entry.label || 'asset');
    const amount = Number(entry.amount) || 0;
    if (amount <= 0) return;
    map.set(key, (map.get(key) || 0) + amount);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, amount]) => `${formatCurrency(amount)} ${label}`);
}

export default function renderFinanceObligations(obligations = {}, pendingIncome = []) {
  const { section, body } = createBankSection(
    'Pending & In-Flight',
    'Track obligations alongside queued payouts.'
  );

  const obligationEntries = Array.isArray(obligations.entries) ? obligations.entries : [];
  const obligationSegments = buildObligationSegments(obligationEntries);
  const totalObligation = obligationEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const pendingSegments = groupPendingIncome(Array.isArray(pendingIncome) ? pendingIncome : []);
  if (!pendingSegments.length) {
    pendingSegments.push('No earnings queued');
  }
  const totalPending = (Array.isArray(pendingIncome) ? pendingIncome : []).reduce(
    (sum, entry) => sum + (Number(entry.amount) || 0),
    0
  );

  const list = document.createElement('ul');
  list.className = 'bankapp-flow';

  const obligationItem = document.createElement('li');
  obligationItem.className = 'bankapp-flow__item';
  obligationItem.appendChild(createStatusPill(totalObligation > 0 ? 'queued' : 'paid'));
  const obligationLine = document.createElement('span');
  obligationLine.className = 'bankapp-flow__descriptor';
  obligationLine.textContent = `Pending obligations — ${formatSegments(obligationSegments)}`;
  obligationItem.appendChild(obligationLine);
  list.appendChild(obligationItem);

  const earningsItem = document.createElement('li');
  earningsItem.className = 'bankapp-flow__item';
  earningsItem.appendChild(createStatusPill(totalPending > 0 ? 'clearing' : 'paid'));
  const earningsLine = document.createElement('span');
  earningsLine.className = 'bankapp-flow__descriptor';
  earningsLine.textContent = `Earnings in flight — ${formatSegments(pendingSegments)}`;
  earningsItem.appendChild(earningsLine);
  list.appendChild(earningsItem);

  body.appendChild(list);
  return section;
}
