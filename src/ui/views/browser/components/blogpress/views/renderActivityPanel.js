export default function renderActivityPanel({
  instance = {},
  formatCurrency = value => String(value ?? ''),
  formatHours = value => String(value ?? '')
} = {}) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--activity';

  const title = document.createElement('h3');
  title.textContent = 'Activity log';
  panel.appendChild(title);

  const logItems = [];

  if (instance.daysActive > 0) {
    const daysLabel = instance.daysActive === 1 ? 'Live for 1 day' : `Live for ${instance.daysActive} days`;
    logItems.push({
      label: 'Lifecycle',
      detail: daysLabel
    });
  }

  if (instance.latestPayout > 0) {
    logItems.push({
      label: 'Payout landed',
      detail: `${formatCurrency(instance.latestPayout)} yesterday`
    });
  }

  if (instance.quickAction) {
    const quick = instance.quickAction;
    logItems.push({
      label: quick.available ? 'Sprint ready' : 'Next sprint',
      detail: quick.available
        ? `${quick.label} is primed to run.`
        : quick.disabledReason || `${quick.label} unlocks soon.`
    });
  }

  if (instance.milestone?.summary) {
    logItems.push({
      label: 'Milestone',
      detail: instance.milestone.summary
    });
  }

  const maintenance = instance.maintenance || {};
  if (maintenance.hasUpkeep) {
    const upkeepSummary = maintenance.text
      || [
        maintenance.hours > 0 ? `${formatHours(maintenance.hours)}/day` : null,
        maintenance.cost > 0 ? `${formatCurrency(maintenance.cost)}/day` : null
      ].filter(Boolean).join(' • ');
    logItems.push({
      label: instance.maintenanceFunded ? 'Upkeep funded' : 'Upkeep pending',
      detail: instance.maintenanceFunded
        ? `Today’s upkeep (${upkeepSummary}) is covered.`
        : `Cover ${upkeepSummary || 'daily upkeep'} to keep payouts flowing.`
    });
  }

  if (logItems.length) {
    const list = document.createElement('ul');
    list.className = 'blogpress-activity';
    logItems.slice(0, 5).forEach(item => {
      const entry = document.createElement('li');
      entry.className = 'blogpress-activity__item';
      const label = document.createElement('span');
      label.className = 'blogpress-activity__label';
      label.textContent = item.label;
      const detail = document.createElement('span');
      detail.className = 'blogpress-activity__detail';
      detail.textContent = item.detail;
      entry.append(label, detail);
      list.appendChild(entry);
    });
    panel.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'blogpress-panel__hint';
    empty.textContent = 'Run a sprint or publish a post to seed your activity timeline.';
    panel.appendChild(empty);
  }

  return panel;
}
