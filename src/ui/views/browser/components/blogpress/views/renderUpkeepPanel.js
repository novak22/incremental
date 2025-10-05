export default function renderUpkeepPanel({ instance }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--upkeep';
  const title = document.createElement('h3');
  title.textContent = 'Daily upkeep';
  panel.appendChild(title);

  const maintenance = instance.maintenance || {};
  const note = document.createElement('p');
  note.className = 'blogpress-panel__lead';
  note.textContent = maintenance.hasUpkeep ? maintenance.text : 'No upkeep required';
  panel.appendChild(note);

  if (instance.status?.id === 'active' && !instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'blogpress-panel__warning';
    warning.textContent = 'Upkeep missed today — fund it to unlock tomorrow’s payout.';
    panel.appendChild(warning);
  } else {
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Keep hours and cash funded to secure the next payday.';
    panel.appendChild(hint);
  }

  return panel;
}
