export default function renderUpkeepPanel({ instance }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--upkeep';
  const title = document.createElement('h3');
  title.textContent = 'Daily upkeep';
  panel.appendChild(title);

  const maintenance = instance.maintenance || {};
  const status = document.createElement('span');
  status.className = 'blogpress-upkeep__status';
  if (!maintenance.hasUpkeep) {
    status.dataset.state = 'none';
    status.textContent = 'No upkeep required';
  } else if (instance.maintenanceFunded) {
    status.dataset.state = 'funded';
    status.textContent = 'Funded today';
  } else {
    status.dataset.state = 'due';
    status.textContent = 'Due today';
  }
  panel.appendChild(status);

  const note = document.createElement('p');
  note.className = 'blogpress-panel__lead';
  note.textContent = maintenance.hasUpkeep ? maintenance.text : 'Keep vibing — no upkeep costs yet.';
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
