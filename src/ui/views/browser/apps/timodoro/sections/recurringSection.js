import { createCard } from '../components/card.js';
import { createTaskList } from '../components/lists.js';

export function createRecurringCard(model = {}) {
  const card = createCard({
    title: 'Recurring / Assistant Work',
    summary: 'Upkeep, maintenance, and study sessions auto-logged for you.'
  });

  const list = createTaskList(
    Array.isArray(model.recurringEntries) ? model.recurringEntries : [],
    model.recurringEmpty || 'No upkeep logged yet. Assistants will report here.',
    'timodoro-recurring'
  );

  card.appendChild(list);
  return card;
}
