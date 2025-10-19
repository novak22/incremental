import { createCard } from '../components/card.js';
import { createTaskList } from '../components/lists.js';

export function createRecurringCard(model = {}) {
  const card = createCard({
    title: 'Automations & rituals',
    summary: 'Assistants, maintenance, and study loops that keep momentum rolling.'
  });

  const list = createTaskList(
    Array.isArray(model.recurringEntries) ? model.recurringEntries : [],
    model.recurringEmpty || 'No upkeep logged yet. Assistants will report here.',
    'timodoro-recurring'
  );

  card.appendChild(list);
  return card;
}
