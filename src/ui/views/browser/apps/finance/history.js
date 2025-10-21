import { createBankSection } from './ledger.js';
import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';

function buildContext(entry) {
  if (entry?.summary) {
    return entry.summary;
  }
  const incomeTop = entry?.ledger?.payouts?.[0];
  const spendTop = entry?.ledger?.costs?.[0];
  const details = [];
  if (incomeTop) {
    details.push(`${incomeTop.label || 'Income'} ${formatSignedCurrency(incomeTop.amount || 0)}`);
  }
  if (spendTop) {
    const spendAmount = spendTop.amount ? -spendTop.amount : 0;
    details.push(`${spendTop.label || 'Spend'} ${formatSignedCurrency(spendAmount)}`);
  }
  return details.length ? details.join(' · ') : 'Cashflow steady without standout spikes.';
}

export default function renderFinanceHistory(history = []) {
  const { section, body } = createBankSection(
    'Cashflow History',
    'Quick timeline of recent daily totals.'
  );

  const entries = Array.isArray(history) ? history.slice(0, 7) : [];
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'Wrap a full day to start the rolling history.';
    body.appendChild(empty);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'bankapp-timeline';

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bankapp-timeline__item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const marker = document.createElement('span');
    marker.className = 'bankapp-timeline__marker';
    item.appendChild(marker);

    const header = document.createElement('div');
    header.className = 'bankapp-timeline__header';

    const label = document.createElement('span');
    label.className = 'bankapp-timeline__label';
    label.textContent = entry?.label || 'Day';
    header.appendChild(label);

    if (Number.isFinite(entry?.recordedAt)) {
      const time = document.createElement('time');
      const stamp = new Date(entry.recordedAt);
      time.className = 'bankapp-timeline__time';
      time.dateTime = stamp.toISOString();
      time.textContent = stamp.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      header.appendChild(time);
    }

    const net = document.createElement('span');
    net.className = 'bankapp-timeline__net';
    net.textContent = formatSignedCurrency(entry?.totals?.net || 0);
    header.appendChild(net);

    item.appendChild(header);

    const detail = document.createElement('p');
    detail.className = 'bankapp-timeline__detail';
    const income = Number(entry?.totals?.income || 0);
    const spend = Number(entry?.totals?.spend || 0);
    const totals = `${formatCurrency(income)} earned · ${formatCurrency(spend > 0 ? spend : 0)} spent`;
    const context = buildContext(entry);
    detail.textContent = `${totals} — ${context}`;
    item.appendChild(detail);

    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}
