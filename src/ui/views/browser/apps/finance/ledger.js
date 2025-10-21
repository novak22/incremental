import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';

export function createBankSection(title, note) {
  const section = document.createElement('section');
  section.className = 'bankapp-section';

  const header = document.createElement('header');
  header.className = 'bankapp-section__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  if (note) {
    const description = document.createElement('p');
    description.textContent = note;
    header.appendChild(description);
  }

  const body = document.createElement('div');
  body.className = 'bankapp-section__body';

  section.append(header, body);
  return { section, body };
}

export function createLedgerColumn(title, entries = [], direction = 'in') {
  const column = document.createElement('div');
  column.className = `bankapp-ledger__column bankapp-ledger__column--${direction}`;

  const heading = document.createElement('header');
  heading.className = 'bankapp-ledger__header';
  const titleNode = document.createElement('h3');
  titleNode.textContent = title;
  heading.appendChild(titleNode);
  column.appendChild(heading);

  const groups = Array.isArray(entries) ? entries : [];
  const items = [];

  groups.forEach(group => {
    const groupLabel = group?.label || '';
    const groupIcon = group?.icon || (direction === 'out' ? '📉' : '💵');
    if (Array.isArray(group?.entries)) {
      group.entries.forEach(entry => {
        const amount = Number(entry?.amount) || 0;
        if (amount <= 0) return;
        items.push({
          label: entry?.label || 'Entry',
          amount,
          note: entry?.note || '',
          groupLabel,
          icon: groupIcon
        });
      });
    }
  });

  const total = groups.reduce((sum, group) => sum + (Number(group?.total) || 0), 0);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty bankapp-ledger__empty';
    empty.textContent = direction === 'out'
      ? 'No spending recorded yet.'
      : 'No earnings logged today.';
    column.appendChild(empty);
    return { column, total };
  }

  const list = document.createElement('ul');
  list.className = 'bankapp-ledger__list';

  const maxAmount = items.reduce((max, entry) => Math.max(max, entry.amount), 0) || 1;

  items
    .sort((a, b) => b.amount - a.amount)
    .forEach(entry => {
      const item = document.createElement('li');
      item.className = 'bankapp-ledger__item';

      const marker = document.createElement('span');
      marker.className = 'bankapp-ledger__marker';
      marker.textContent = entry.icon;

      const labelWrap = document.createElement('span');
      labelWrap.className = 'bankapp-ledger__label';
      labelWrap.textContent = entry.label;

      const details = [entry.groupLabel, entry.note].filter(Boolean).join(' · ');
      if (details) {
        const detailNode = document.createElement('span');
        detailNode.className = 'bankapp-ledger__note';
        detailNode.textContent = details;
        labelWrap.appendChild(detailNode);
      }

      const amountNode = document.createElement('span');
      amountNode.className = 'bankapp-ledger__value';
      const signedAmount = direction === 'out' ? -entry.amount : entry.amount;
      amountNode.textContent = formatSignedCurrency(signedAmount);

      const bar = document.createElement('span');
      bar.className = 'bankapp-ledger__bar';
      const width = Math.max(6, Math.round((entry.amount / maxAmount) * 100));
      bar.style.setProperty('--ledger-bar-width', `${width}%`);

      item.append(marker, labelWrap, amountNode, bar);
      list.appendChild(item);
    });

  column.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'bankapp-ledger__total';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = direction === 'out' ? 'Total outflow' : 'Total inflow';
  const totalValue = document.createElement('span');
  totalValue.textContent = formatCurrency(total);
  footer.append(totalLabel, totalValue);
  column.appendChild(footer);

  return { column, total };
}

export default function renderFinanceLedger(model = {}) {
  const { section, body } = createBankSection(
    'Daily Cashflow',
    'Today’s earnings and spend split side by side.'
  );

  const ledger = document.createElement('div');
  ledger.className = 'bankapp-ledger';
  const inflows = createLedgerColumn('Inflows', Array.isArray(model.inflows) ? model.inflows : [], 'in');
  const outflows = createLedgerColumn('Outflows', Array.isArray(model.outflows) ? model.outflows : [], 'out');

  ledger.append(inflows.column, outflows.column);
  body.appendChild(ledger);

  const summary = document.createElement('p');
  summary.className = 'bankapp-ledger__summary';

  const earnedText = formatCurrency(inflows.total);
  const spentText = formatCurrency(outflows.total);
  const netValue = inflows.total - outflows.total;
  const tone = netValue > 0 ? 'positive' : netValue < 0 ? 'negative' : 'neutral';
  summary.dataset.tone = tone;
  summary.textContent = `${earnedText} earned vs ${spentText} spent → Net ${formatSignedCurrency(netValue)} ${
    tone === 'positive' ? '(positive)' : tone === 'negative' ? '(negative)' : '(even)'
  }.`;

  body.appendChild(summary);

  return section;
}
