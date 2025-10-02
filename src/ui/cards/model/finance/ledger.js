import { ensureArray, toCurrency } from './utils.js';

function formatSourceNote(source) {
  if (!source || typeof source !== 'object') return '';
  const count = Number(source.count);
  const name = source.name || source.label || '';
  if (!Number.isFinite(count) || count <= 0 || !name) return name || '';
  return `${count} ${name}${count === 1 ? '' : 's'}`;
}

export function buildInflowLedger(summary = {}) {
  const groups = new Map();

  function pushEntry(groupId, groupLabel, icon, entry) {
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label: groupLabel,
        icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(groupId);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Income',
      amount,
      note: formatSourceNote(entry?.source) || ''
    });
  }

  ensureArray(summary.earningsBreakdown).forEach(entry => {
    pushEntry('active', 'Active Hustles', '💼', entry);
  });

  ensureArray(summary.passiveBreakdown).forEach(entry => {
    const stream = entry?.stream === 'offline' ? 'offline' : 'passive';
    const label = stream === 'offline' ? 'Offline Windfalls' : 'Passive Streams';
    const icon = stream === 'offline' ? '🛰️' : '🌙';
    pushEntry(stream, label, icon, entry);
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

const SPEND_CATEGORY_META = {
  maintenance: { id: 'maintenance', label: 'Upkeep', icon: '⚙️' },
  payroll: { id: 'payroll', label: 'Payroll', icon: '🤖' },
  investment: { id: 'investment', label: 'Investments', icon: '🚀' },
  setup: { id: 'setup', label: 'Setup', icon: '🛠️' },
  upgrade: { id: 'upgrade', label: 'Upgrades', icon: '⬆️' },
  consumable: { id: 'consumable', label: 'Boosts', icon: '☕' },
  tuition: { id: 'tuition', label: 'Tuition', icon: '🎓' }
};

function resolveSpendCategory(entry = {}) {
  if (typeof entry?.key === 'string' && entry.key.includes(':tuition')) {
    return SPEND_CATEGORY_META.tuition;
  }
  const category = String(entry?.category || '').split(':')[0];
  if (SPEND_CATEGORY_META[category]) {
    return SPEND_CATEGORY_META[category];
  }
  return { id: 'other', label: 'Other', icon: '📉' };
}

export function buildOutflowLedger(summary = {}) {
  const groups = new Map();

  ensureArray(summary.spendBreakdown).forEach(entry => {
    const meta = resolveSpendCategory(entry);
    const amount = toCurrency(entry?.amount);
    if (amount <= 0) return;
    if (!groups.has(meta.id)) {
      groups.set(meta.id, {
        id: meta.id,
        label: meta.label,
        icon: meta.icon,
        total: 0,
        entries: []
      });
    }
    const group = groups.get(meta.id);
    group.total += amount;
    group.entries.push({
      label: entry?.label || entry?.definition?.label || 'Spending',
      amount,
      note: entry?.definition?.category || entry?.category || ''
    });
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    total: toCurrency(group.total),
    entries: group.entries.sort((a, b) => b.amount - a.amount)
  }));
}

export default {
  buildInflowLedger,
  buildOutflowLedger
};
