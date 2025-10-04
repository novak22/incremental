import { formatSignedCurrency } from '../../utils/financeFormatting.js';

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

function createLedgerColumn(title, entries = [], direction = 'in') {
  const column = document.createElement('article');
  column.className = `bankapp-ledger__column bankapp-ledger__column--${direction}`;

  const heading = document.createElement('h3');
  heading.textContent = title;
  column.appendChild(heading);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = direction === 'out'
      ? 'No spending recorded yet.'
      : 'No earnings logged today.';
    column.appendChild(empty);
    return column;
  }

  entries.forEach(group => {
    const card = document.createElement('div');
    card.className = 'bankapp-ledger-group';

    const header = document.createElement('div');
    header.className = 'bankapp-ledger-group__header';

    const icon = document.createElement('span');
    icon.className = 'bankapp-ledger-group__icon';
    icon.textContent = group.icon || (direction === 'out' ? '📉' : '💵');

    const label = document.createElement('span');
    label.className = 'bankapp-ledger-group__title';
    label.textContent = group.label || 'Ledger';

    const total = document.createElement('span');
    total.className = 'bankapp-ledger-group__total';
    const signed = direction === 'out' ? -group.total : group.total;
    total.textContent = formatSignedCurrency(signed);

    header.append(icon, label, total);
    card.appendChild(header);

    if (group.entries?.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-ledger-group__list';

      group.entries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'bankapp-ledger-group__item';

        const name = document.createElement('span');
        name.className = 'bankapp-ledger-group__name';
        name.textContent = entry.label;

        const amount = document.createElement('span');
        amount.className = 'bankapp-ledger-group__amount';
        const signedAmount = direction === 'out' ? -entry.amount : entry.amount;
        amount.textContent = formatSignedCurrency(signedAmount);

        item.append(name, amount);

        if (entry.note) {
          const note = document.createElement('span');
          note.className = 'bankapp-ledger-group__note';
          note.textContent = entry.note;
          item.appendChild(note);
        }

        list.appendChild(item);
      });

      card.appendChild(list);
    }

    column.appendChild(card);
  });

  return column;
}

export default function renderFinanceLedger(model = {}) {
  const { section, body } = createBankSection(
    'Daily Cashflow (Ledger)',
    'Today’s earnings and spend straight from the classic dashboard breakdown.'
  );

  const ledger = document.createElement('div');
  ledger.className = 'bankapp-ledger';
  ledger.append(
    createLedgerColumn('Inflows', Array.isArray(model.inflows) ? model.inflows : [], 'in'),
    createLedgerColumn('Outflows', Array.isArray(model.outflows) ? model.outflows : [], 'out')
  );

  body.appendChild(ledger);
  return section;
}
