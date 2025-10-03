export function renderSummaryBar(model = {}) {
  const summary = document.createElement('div');
  summary.className = 'blogpress-summary';
  const total = model.summary?.total || 0;
  const active = model.summary?.active || 0;
  const needsUpkeep = model.summary?.needsUpkeep || 0;
  const summaryItems = [
    `${active} active`,
    `${total} total`,
    needsUpkeep > 0 ? `${needsUpkeep} need upkeep` : 'Upkeep funded'
  ];
  summary.textContent = summaryItems.join(' • ');
  return summary;
}

export function createTableCell(content, className) {
  const cell = document.createElement('td');
  if (className) {
    cell.className = className;
  }
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

export default function renderHomeView(options = {}) {
  const {
    model = {},
    state = {},
    formatters = {},
    handlers = {}
  } = options;

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatHours = formatters.formatHours || (value => String(value ?? ''));

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--home';

  container.appendChild(renderSummaryBar(model));

  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) {
    const empty = document.createElement('div');
    empty.className = 'blogpress-empty';
    const message = document.createElement('p');
    message.textContent = 'No blogs live yet. Launch a blueprint to start earning cozy ad pennies.';
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'blogpress-button blogpress-button--primary';
    cta.textContent = 'Launch first blog';
    cta.addEventListener('click', handlers.onShowBlueprints || (() => {}));
    empty.append(message, cta);
    container.appendChild(empty);
    return container;
  }

  const table = document.createElement('table');
  table.className = 'blogpress-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Blog', 'Niche', 'Status', 'Latest payout', 'Upkeep', 'Quality', 'Quick action'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(instance => {
    const row = document.createElement('tr');
    row.dataset.blogId = instance.id;
    if (instance.id === state.selectedBlogId) {
      row.classList.add('is-selected');
    }

    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'blogpress-table__link';
    nameButton.textContent = instance.label;
    nameButton.addEventListener('click', () => (handlers.onViewDetail || (() => {}))(instance.id));
    row.appendChild(createTableCell(nameButton, 'blogpress-table__cell blogpress-table__cell--label'));

    const niche = instance.niche;
    const nicheCell = document.createElement('div');
    nicheCell.className = 'blogpress-niche';
    const nicheName = document.createElement('span');
    nicheName.className = 'blogpress-niche__name';
    nicheName.textContent = niche?.name || 'Unassigned';
    nicheCell.appendChild(nicheName);
    if (niche?.label) {
      const tone = (niche.label || 'steady').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const badge = document.createElement('span');
      badge.className = `blogpress-badge blogpress-badge--tone-${tone}`;
      badge.textContent = niche.label;
      nicheCell.appendChild(badge);
    }
    row.appendChild(createTableCell(nicheCell));

    const status = document.createElement('span');
    status.className = `blogpress-status blogpress-status--${instance.status?.id || 'setup'}`;
    status.textContent = instance.status?.label || 'Setup';
    row.appendChild(createTableCell(status));

    const payoutCell = document.createElement('div');
    payoutCell.className = 'blogpress-payout';
    const latest = document.createElement('strong');
    latest.textContent = instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : '—';
    const average = document.createElement('span');
    average.textContent = instance.averagePayout > 0
      ? `Avg ${formatCurrency(instance.averagePayout)}`
      : instance.status?.id === 'active'
        ? 'No earnings yet'
        : 'Launch pending';
    payoutCell.append(latest, average);
    row.appendChild(createTableCell(payoutCell));

    const upkeep = document.createElement('span');
    const parts = [];
    const maintenanceHours = instance.maintenance?.parts?.find(part => part.includes('h'));
    if (maintenanceHours) parts.push(maintenanceHours);
    const maintenanceCost = instance.maintenance?.parts?.find(part => part.includes('$'));
    if (maintenanceCost) parts.push(maintenanceCost);
    upkeep.textContent = parts.length ? parts.join(' • ') : 'None';
    row.appendChild(createTableCell(upkeep));

    const qualityCell = document.createElement('div');
    qualityCell.className = 'blogpress-quality';
    const levelBadge = document.createElement('span');
    levelBadge.className = 'blogpress-quality__level';
    levelBadge.textContent = `Q${instance.qualityLevel}`;
    const levelLabel = document.createElement('span');
    levelLabel.className = 'blogpress-quality__label';
    levelLabel.textContent = instance.qualityInfo?.name || 'Skeleton Drafts';
    qualityCell.append(levelBadge, levelLabel);
    row.appendChild(createTableCell(qualityCell));

    const actionCell = document.createElement('div');
    actionCell.className = 'blogpress-table__actions';
    if (instance.quickAction) {
      const quick = instance.quickAction;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'blogpress-button blogpress-button--ghost';
      button.textContent = quick.label;
      button.disabled = !quick.available;
      if (quick.disabledReason) {
        button.title = quick.disabledReason;
      }
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (button.disabled) return;
        (handlers.onRunQuickAction || (() => {}))(instance.id, quick.id);
      });
      const effort = document.createElement('span');
      effort.className = 'blogpress-table__meta';
      const partsMeta = [];
      if (quick.time > 0) partsMeta.push(formatHours(quick.time));
      if (quick.cost > 0) partsMeta.push(formatCurrency(quick.cost));
      effort.textContent = partsMeta.length ? partsMeta.join(' • ') : 'Instant';
      actionCell.append(button, effort);
    } else {
      const none = document.createElement('span');
      none.className = 'blogpress-table__meta';
      none.textContent = 'No actions unlocked yet';
      actionCell.appendChild(none);
    }
    row.appendChild(createTableCell(actionCell, 'blogpress-table__cell blogpress-table__cell--actions'));

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}
