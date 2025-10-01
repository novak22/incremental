let elements = null;
let initialized = false;

function init(widgetElements = {}) {
  if (initialized) return;
  elements = widgetElements;
  initialized = true;
}

function createStat(entry) {
  const card = document.createElement('div');
  card.className = 'browser-earnings-stat';
  if (entry.tone) {
    card.dataset.tone = entry.tone;
  }

  const label = document.createElement('span');
  label.className = 'browser-earnings-stat__label';
  label.textContent = entry.label;

  const value = document.createElement('span');
  value.className = 'browser-earnings-stat__value';
  value.textContent = entry.value || '—';

  const note = document.createElement('span');
  note.className = 'browser-earnings-stat__note';
  note.textContent = entry.note || '';

  card.append(label, value, note);
  return card;
}

export function render(model = {}) {
  if (!initialized) {
    init(elements || {});
  }
  if (!elements?.list) return;

  const entries = [
    {
      key: 'inflow',
      label: "Today's inflow",
      value: model.inflow?.value,
      note: model.inflow?.note || 'Waiting on payouts',
      tone: 'positive'
    },
    {
      key: 'outflow',
      label: "Today's outflow",
      value: model.outflow?.value,
      note: model.outflow?.note || 'No spending logged yet'
    },
    {
      key: 'net',
      label: 'Net momentum',
      value: model.net?.value,
      note: model.net?.note || 'Earn more than you spend to push momentum.',
      tone: model.net?.value?.startsWith('-') ? 'negative' : 'positive'
    }
  ];

  elements.list.innerHTML = '';
  entries.forEach(entry => {
    elements.list.appendChild(createStat(entry));
  });

  if (elements.note) {
    elements.note.textContent = 'Snapshot updates with every Bankly tick.';
  }
}

export default {
  init,
  render
};
