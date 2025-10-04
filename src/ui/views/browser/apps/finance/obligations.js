import { createBankSection } from './ledger.js';
import { formatCurrency } from '../../utils/financeFormatting.js';

export default function renderFinanceObligations(model = {}) {
  const { section, body } = createBankSection(
    'Pending & Upcoming Obligations',
    'Keep upkeep, payroll, and tuition funded.'
  );
  const entries = Array.isArray(model.entries) ? model.entries : [];

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No obligations queued. Everything is funded!';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-obligations';

  entries.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--obligation';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.label || 'Obligation';
    const amount = document.createElement('span');
    amount.className = 'bankapp-card__amount';
    amount.textContent = formatCurrency(entry.amount || 0);
    header.append(title, amount);
    card.appendChild(header);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'bankapp-card__note';
      note.textContent = entry.note;
      card.appendChild(note);
    }

    if (Array.isArray(entry.items) && entry.items.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-card__list';
      entry.items.forEach(item => {
        const row = document.createElement('li');
        row.className = 'bankapp-card__list-item';
        const name = document.createElement('span');
        name.textContent = item.label || 'Entry';
        const value = document.createElement('span');
        value.textContent = formatCurrency(item.amount || 0);
        row.append(name, value);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}
