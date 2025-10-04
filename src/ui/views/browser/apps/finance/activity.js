import { createBankSection } from './ledger.js';

export default function renderFinanceActivity(entries = []) {
  const { section, body } = createBankSection(
    'Recent Activity Log',
    'Latest timeline pulled from the shared activity feed.'
  );

  const activity = Array.isArray(entries) ? entries.slice(0, 10) : [];
  if (!activity.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No recent entries yet—start hustling to fill the log!';
    body.appendChild(empty);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'bankapp-activity';

  activity.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bankapp-activity__item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const message = document.createElement('span');
    message.className = 'bankapp-activity__message';
    message.textContent = entry?.message || '';
    item.appendChild(message);

    if (Number.isFinite(entry?.timestamp)) {
      const time = document.createElement('time');
      const stamp = new Date(entry.timestamp);
      time.className = 'bankapp-activity__time';
      time.dateTime = stamp.toISOString();
      time.textContent = stamp.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      item.appendChild(time);
    }

    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}
