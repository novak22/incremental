import { appendContent } from './domHelpers.js';

const DEFAULT_THEME = {
  container: 'asset-table',
  table: 'asset-table__table',
  headCell: 'asset-table__heading',
  row: 'asset-table__row',
  cell: 'asset-table__cell',
  actionsCell: 'asset-table__cell--actions',
  actions: 'asset-table__actions',
  actionButton: 'asset-table__action',
  empty: 'asset-table__empty'
};

function applyDataset(element, dataset = {}) {
  if (!element || !dataset || typeof dataset !== 'object') return;
  Object.entries(dataset).forEach(([key, value]) => {
    if (value != null) {
      element.dataset[key] = String(value);
    }
  });
}

function createActionButton(action = {}, theme, row) {
  const button = document.createElement('button');
  button.type = action.type || 'button';
  button.className = action.className || theme.actionButton;
  button.dataset.rowAction = 'true';
  if (action.id) {
    button.dataset.actionId = action.id;
  }
  if (action.title) {
    button.title = action.title;
  }
  if (action.disabled) {
    button.disabled = true;
  }
  appendContent(button, action.label ?? '');
  if (typeof action.onSelect === 'function') {
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (button.disabled) return;
      action.onSelect(row.id, action, event);
    });
  }
  return button;
}

function renderEmptyState(emptyState, theme) {
  if (!emptyState) return null;
  const wrapper = document.createElement('div');
  wrapper.className = theme.empty;
  if (emptyState.title) {
    const heading = document.createElement('h3');
    appendContent(heading, emptyState.title);
    wrapper.appendChild(heading);
  }
  if (emptyState.message) {
    const message = document.createElement('p');
    appendContent(message, emptyState.message);
    wrapper.appendChild(message);
  }
  if (Array.isArray(emptyState.actions)) {
    const actions = document.createElement('div');
    actions.className = theme.actions;
    emptyState.actions.forEach(action => {
      if (!action) return;
      actions.appendChild(createActionButton(action, theme, {}));
    });
    wrapper.appendChild(actions);
  }
  return wrapper;
}

function resolveCellConfig(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return cell;
  }
  return { content: cell };
}

export function renderInstanceTable(options = {}) {
  const {
    className,
    columns = [],
    rows = [],
    selectedId,
    onSelect,
    caption,
    theme: themeOverride = {},
    emptyState
  } = options;

  const theme = { ...DEFAULT_THEME, ...themeOverride };

  const container = document.createElement('div');
  container.className = className || theme.container;

  if (!Array.isArray(rows) || rows.length === 0) {
    const empty = renderEmptyState(emptyState, theme);
    if (empty) {
      container.appendChild(empty);
    }
    return container;
  }

  const table = document.createElement('table');
  table.className = theme.table;

  if (caption) {
    const captionNode = document.createElement('caption');
    appendContent(captionNode, caption);
    table.appendChild(captionNode);
  }

  if (columns.length) {
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    columns.forEach(column => {
      if (!column) return;
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = column.className || theme.headCell;
      appendContent(th, column.label ?? '');
      if (column.dataset) {
        applyDataset(th, column.dataset);
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
  }

  const tbody = document.createElement('tbody');

  rows.forEach(row => {
    if (!row) return;
    const tr = document.createElement('tr');
    tr.className = row.className ? `${theme.row} ${row.className}`.trim() : theme.row;
    if (row.id) {
      tr.dataset.rowId = row.id;
    }
    if (row.tone) {
      tr.dataset.tone = String(row.tone);
    }
    const isSelected = row.isSelected ?? (selectedId != null && row.id === selectedId);
    if (isSelected) {
      tr.classList.add('is-selected');
      tr.setAttribute('aria-selected', 'true');
    }

    if (typeof onSelect === 'function' && row.selectable !== false) {
      tr.addEventListener('click', event => {
        const actionTarget = event.target.closest('[data-row-action]');
        if (actionTarget) return;
        onSelect(row.id, row, event);
      });
    }

    row.cells.forEach(cell => {
      const cellConfig = resolveCellConfig(cell);
      const td = document.createElement('td');
      td.className = cellConfig.className
        ? `${theme.cell} ${cellConfig.className}`.trim()
        : theme.cell;
      if (cellConfig.align) {
        td.dataset.align = cellConfig.align;
      }
      if (cellConfig.dataset) {
        applyDataset(td, cellConfig.dataset);
      }
      appendContent(td, cellConfig.content ?? '');
      tr.appendChild(td);
    });

    if (Array.isArray(row.actions) && row.actions.length) {
      const actionCell = document.createElement('td');
      actionCell.className = `${theme.cell} ${theme.actionsCell}`.trim();
      const actionGroup = document.createElement('div');
      actionGroup.className = theme.actions;
      row.actions.forEach(action => {
        if (!action) return;
        actionGroup.appendChild(createActionButton(action, theme, row));
      });
      actionCell.appendChild(actionGroup);
      tr.appendChild(actionCell);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

