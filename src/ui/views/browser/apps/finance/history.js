import { createBankSection } from './ledger.js';
import { formatCurrency, formatSignedCurrency } from '../../utils/financeFormatting.js';

export default function renderFinanceHistory(history = []) {
  const { section, body } = createBankSection(
    'Cashflow History',
    'Seven-day snapshots captured at day end.'
  );

  const entries = Array.isArray(history) ? history.slice(0, 7) : [];
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'Wrap a full day to start the rolling history.';
    body.appendChild(empty);
    return section;
  }

  const list = document.createElement('ol');
  list.className = 'bankapp-history';

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bankapp-history__item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const header = document.createElement('div');
    header.className = 'bankapp-history__header';
    const label = document.createElement('span');
    label.className = 'bankapp-history__label';
    label.textContent = entry?.label || 'Day';
    header.appendChild(label);

    if (Number.isFinite(entry?.recordedAt)) {
      const time = document.createElement('time');
      time.className = 'bankapp-history__time';
      const stamp = new Date(entry.recordedAt);
      time.dateTime = stamp.toISOString();
      time.textContent = stamp.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      header.appendChild(time);
    }

    const totals = document.createElement('div');
    totals.className = 'bankapp-history__totals';
    const net = document.createElement('span');
    net.className = 'bankapp-history__net';
    net.textContent = formatSignedCurrency(entry?.totals?.net || 0);
    totals.appendChild(net);

    const split = document.createElement('span');
    split.className = 'bankapp-history__split';
    const income = Number(entry?.totals?.income || 0);
    const spend = Number(entry?.totals?.spend || 0);
    split.textContent = `${formatCurrency(income)} • ${formatCurrency(spend > 0 ? -spend : 0)}`;
    totals.appendChild(split);

    const highlights = document.createElement('p');
    highlights.className = 'bankapp-history__highlights';
    const incomeTop = entry?.ledger?.payouts?.[0];
    const spendTop = entry?.ledger?.costs?.[0];
    const details = [];
    if (incomeTop) {
      details.push(
        `${incomeTop.label || 'Income'} ${formatSignedCurrency(incomeTop.amount || 0)}`
      );
    }
    if (spendTop) {
      details.push(
        `${spendTop.label || 'Spend'} ${formatSignedCurrency(
          spendTop.amount ? -spendTop.amount : 0
        )}`
      );
    }
    highlights.textContent = details.length
      ? details.join(' • ')
      : 'Cashflow steady without standout spikes.';

    item.append(header, totals, highlights);
    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}
