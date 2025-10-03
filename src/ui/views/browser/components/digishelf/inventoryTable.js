import createStatusBadge from './statusBadge.js';

const QUICK_ACTION_LABELS = {
  ebook: {
    writeChapter: 'Write Volume'
  },
  stockPhotos: {
    planShoot: 'Launch Gallery',
    batchEdit: 'Upload Batch'
  }
};

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function renderUpkeepCell(instance) {
  const wrapper = document.createElement('div');
  wrapper.className = 'digishelf-upkeep';
  const maintenance = instance.maintenance;
  if (maintenance?.parts?.length) {
    const value = document.createElement('strong');
    value.textContent = maintenance.parts.join(' + ');
    wrapper.appendChild(value);
  } else {
    const none = document.createElement('span');
    none.textContent = 'None';
    wrapper.appendChild(none);
  }

  const status = document.createElement('span');
  status.className = instance.maintenanceFunded
    ? 'digishelf-upkeep__status is-funded'
    : 'digishelf-upkeep__status is-missed';
  status.textContent = instance.maintenanceFunded ? 'Funded' : 'Skipped today';
  wrapper.appendChild(status);
  return wrapper;
}

function renderActionButton(label, { disabled = false, title = '', onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--ghost';
  button.textContent = label;
  button.disabled = Boolean(disabled);
  if (title) {
    button.title = title;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onClick?.();
  });
  return button;
}

function findActionById(instance, actionId) {
  if (!actionId) return null;
  return instance.actions?.find(action => action.id === actionId) || null;
}

function renderEbookRow(instance, state, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    onSelectInstance = () => {},
    onRunQuickAction = () => {},
    quickActions = []
  } = dependencies;

  const row = document.createElement('tr');
  row.dataset.instanceId = instance.id;
  if (state.selectedType === 'ebook' && state.selectedId === instance.id) {
    row.classList.add('is-selected');
  }

  row.addEventListener('click', () => onSelectInstance('ebook', instance.id));

  const titleCell = document.createElement('td');
  titleCell.className = 'digishelf-cell digishelf-cell--label';
  const title = document.createElement('div');
  title.className = 'digishelf-label';
  const name = document.createElement('strong');
  name.textContent = instance.label;
  const status = createStatusBadge(instance);
  title.append(name, status);
  titleCell.appendChild(title);

  const earningsCell = document.createElement('td');
  earningsCell.className = 'digishelf-cell digishelf-cell--earnings';
  const payout = document.createElement('strong');
  payout.textContent = formatCurrency(instance.latestPayout || instance.averagePayout);
  const range = document.createElement('span');
  range.textContent = `${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  earningsCell.append(payout, range);

  const milestoneCell = document.createElement('td');
  milestoneCell.className = 'digishelf-cell';
  const milestone = document.createElement('div');
  milestone.className = 'digishelf-milestone';
  const level = document.createElement('strong');
  level.textContent = `Quality ${instance.milestone?.level ?? 0}`;
  const summary = document.createElement('span');
  summary.textContent = instance.milestone?.summary || 'Progress brewing.';
  milestone.append(level, summary);
  milestoneCell.appendChild(milestone);

  const upkeepCell = document.createElement('td');
  upkeepCell.className = 'digishelf-cell';
  upkeepCell.appendChild(renderUpkeepCell(instance));

  const actionsCell = document.createElement('td');
  actionsCell.className = 'digishelf-cell digishelf-cell--actions';
  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'digishelf-actions';

  quickActions.forEach(actionId => {
    const action = findActionById(instance, actionId);
    if (!action) return;
    const label = QUICK_ACTION_LABELS.ebook?.[actionId] || action.label;
    const button = renderActionButton(label, {
      disabled: !action.available,
      title: action.disabledReason,
      onClick: () => onRunQuickAction('ebook', instance.id, actionId)
    });
    actionWrapper.appendChild(button);
  });

  const detailButton = renderActionButton('View Details', {
    onClick: () => onSelectInstance('ebook', instance.id)
  });
  actionWrapper.appendChild(detailButton);

  actionsCell.appendChild(actionWrapper);

  row.append(titleCell, earningsCell, milestoneCell, upkeepCell, actionsCell);
  return row;
}

function renderStockRow(instance, state, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    onSelectInstance = () => {},
    onRunQuickAction = () => {},
    quickActions = []
  } = dependencies;

  const row = document.createElement('tr');
  row.dataset.instanceId = instance.id;
  if (state.selectedType === 'stockPhotos' && state.selectedId === instance.id) {
    row.classList.add('is-selected');
  }

  row.addEventListener('click', () => onSelectInstance('stockPhotos', instance.id));

  const titleCell = document.createElement('td');
  titleCell.className = 'digishelf-cell digishelf-cell--label';
  const label = document.createElement('div');
  label.className = 'digishelf-label';
  const name = document.createElement('strong');
  name.textContent = instance.label;
  const status = createStatusBadge(instance);
  label.append(name, status);
  titleCell.appendChild(label);

  const photosCell = document.createElement('td');
  photosCell.className = 'digishelf-cell';
  const totalShoots = clampNumber(instance.progress?.shoots);
  const totalEdits = clampNumber(instance.progress?.editing);
  const uploads = document.createElement('strong');
  uploads.textContent = `${totalShoots} shoots / ${totalEdits} edits`;
  const hint = document.createElement('span');
  hint.textContent = 'Shoots • Edits logged';
  photosCell.append(uploads, hint);

  const earningsCell = document.createElement('td');
  earningsCell.className = 'digishelf-cell digishelf-cell--earnings';
  const payout = document.createElement('strong');
  payout.textContent = formatCurrency(instance.latestPayout || instance.averagePayout);
  const range = document.createElement('span');
  range.textContent = `${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  earningsCell.append(payout, range);

  const upkeepCell = document.createElement('td');
  upkeepCell.className = 'digishelf-cell';
  upkeepCell.appendChild(renderUpkeepCell(instance));

  const actionsCell = document.createElement('td');
  actionsCell.className = 'digishelf-cell digishelf-cell--actions';
  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'digishelf-actions';

  quickActions.forEach(actionId => {
    const action = findActionById(instance, actionId);
    if (!action) return;
    const label = QUICK_ACTION_LABELS.stockPhotos?.[actionId] || action.label;
    const button = renderActionButton(label, {
      disabled: !action.available,
      title: action.disabledReason,
      onClick: () => onRunQuickAction('stockPhotos', instance.id, actionId)
    });
    actionWrapper.appendChild(button);
  });

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'digishelf-button digishelf-button--link';
  detailButton.textContent = 'View Details';
  detailButton.addEventListener('click', event => {
    event.stopPropagation();
    onSelectInstance('stockPhotos', instance.id);
  });
  actionWrapper.appendChild(detailButton);

  actionsCell.appendChild(actionWrapper);

  row.append(titleCell, photosCell, earningsCell, upkeepCell, actionsCell);
  return row;
}

export default function renderInventoryTable(options = {}) {
  const {
    instances = [],
    type = 'ebook',
    state = {},
    formatters = {},
    quickActions = {},
    handlers = {}
  } = options;

  const table = document.createElement('table');
  table.className = 'digishelf-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const headers = type === 'ebook'
    ? ['Title', 'Daily Earnings', 'Quality Milestone', 'Upkeep', 'Actions']
    : ['Gallery', 'Photos Uploaded', 'Daily Earnings', 'Upkeep', 'Actions'];

  headers.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!instances.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = headers.length;
    emptyCell.className = 'digishelf-empty';
    emptyCell.textContent = type === 'ebook'
      ? 'No e-book series live yet. Spin one up to start collecting royalties.'
      : 'No stock galleries live yet. Launch a collection to start syndicating shots.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    instances.forEach(instance => {
      const row = type === 'ebook'
        ? renderEbookRow(instance, state, {
            formatCurrency: formatters.formatCurrency,
            onSelectInstance: handlers.onSelectInstance,
            onRunQuickAction: handlers.onRunQuickAction,
            quickActions: quickActions.ebook || []
          })
        : renderStockRow(instance, state, {
            formatCurrency: formatters.formatCurrency,
            formatHours: formatters.formatHours,
            onSelectInstance: handlers.onSelectInstance,
            onRunQuickAction: handlers.onRunQuickAction,
            quickActions: quickActions.stockPhotos || []
          });
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
}
