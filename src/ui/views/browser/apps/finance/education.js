import { formatHours } from '../../../../../core/helpers.js';
import { createBankSection } from './ledger.js';
import { formatCurrency } from '../../utils/financeFormatting.js';

export default function renderFinanceEducation(entries = []) {
  const { section, body } = createBankSection(
    'Education Investments',
    'Courses in progress with tuition already committed.'
  );
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active courses. Enroll in a study track to plan tuition.';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-education';

  list.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--education';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.name || 'Course';
    const tuition = document.createElement('span');
    tuition.className = 'bankapp-card__amount';
    tuition.textContent = entry.tuition > 0 ? formatCurrency(entry.tuition) : 'Free';
    header.append(title, tuition);
    card.appendChild(header);

    const note = document.createElement('p');
    note.className = 'bankapp-card__note';
    note.textContent = `${entry.remainingDays} day${entry.remainingDays === 1 ? '' : 's'} left • ${formatHours(entry.hoursPerDay || 0)}/day`;
    card.appendChild(note);

    if (entry.bonus) {
      const bonus = document.createElement('p');
      bonus.className = 'bankapp-card__note bankapp-card__note--muted';
      bonus.textContent = entry.bonus;
      card.appendChild(bonus);
    }

    const status = document.createElement('p');
    status.className = 'bankapp-card__status';
    status.textContent = entry.studiedToday
      ? 'Today’s study scheduled'
      : 'Waiting for today’s study slot';
    card.appendChild(status);

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}
