import { ensureArray } from '../../../../../../../core/helpers.js';

function createQuickAction(instance, actionId, label, { onQuickAction }) {
  const action = instance?.actionsById?.[actionId]
    || ensureArray(instance?.actions).find(entry => entry.id === actionId);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-button serverhub-button--quiet serverhub-button--compact';
  button.textContent = label;
  if (!action || !action.available) {
    button.disabled = true;
  }
  if (action?.disabledReason) {
    button.title = action.disabledReason;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onQuickAction(instance.id, action?.id || actionId);
  });
  return button;
}

function renderNameCell(instance, { selectInstance }) {
  const nameButton = document.createElement('button');
  nameButton.type = 'button';
  nameButton.className = 'serverhub-table__link';
  nameButton.textContent = instance.label;
  nameButton.addEventListener('click', event => {
    event.stopPropagation();
    selectInstance(instance.id);
  });
  return nameButton;
}

function renderStatusCell(instance) {
  const status = document.createElement('span');
  status.className = 'serverhub-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Setup';
  return status;
}

function renderActionsCell(instance, helpers) {
  const { selectInstance } = helpers;
  const group = document.createElement('div');
  group.className = 'serverhub-action-group';
  group.append(
    createQuickAction(instance, 'shipFeature', 'Scale Up', helpers),
    createQuickAction(instance, 'improveStability', 'Optimize', helpers)
  );
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'serverhub-button serverhub-button--ghost serverhub-button--compact';
  details.textContent = 'View Details';
  details.addEventListener('click', event => {
    event.stopPropagation();
    selectInstance(instance.id);
  });
  group.appendChild(details);
  return group;
}

function renderEmptyTable(onLaunch) {
  const empty = document.createElement('div');
  empty.className = 'serverhub-empty';
  const message = document.createElement('p');
  message.textContent = 'No SaaS apps live yet. Deploy a new instance to kickstart recurring revenue.';
  empty.appendChild(message);
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'serverhub-button serverhub-button--primary';
  cta.textContent = 'Deploy New App';
  cta.addEventListener('click', async () => {
    await onLaunch();
  });
  empty.appendChild(cta);
  return empty;
}

export function createAppsTable({ renderNicheCell }) {
  const columnRenderers = {
    name: renderNameCell,
    status: renderStatusCell,
    niche: renderNicheCell,
    payout(instance, { formatCurrency }) {
      const value = document.createElement('span');
      value.textContent = formatCurrency(instance.latestPayout);
      return value;
    },
    upkeep(instance, { formatCurrency }) {
      const value = document.createElement('span');
      value.textContent = formatCurrency(instance.upkeepCost);
      return value;
    },
    roi(instance, { formatPercent }) {
      const value = document.createElement('span');
      value.textContent = formatPercent(instance.roi);
      return value;
    },
    actions: renderActionsCell
  };

  return function renderAppsTable(instances, state, helpers, updateState) {
    const wrapper = document.createElement('div');
    wrapper.className = 'serverhub-table-wrapper';

    if (!instances.length) {
      wrapper.appendChild(renderEmptyTable(helpers.onLaunch));
      return wrapper;
    }

    const table = document.createElement('table');
    table.className = 'serverhub-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    helpers.tableColumns.forEach(column => {
      if (!column) return;
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = column.headerClassName || 'serverhub-table__heading';
      th.textContent = column.label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    instances.forEach(instance => {
      const row = document.createElement('tr');
      row.dataset.appId = instance.id;
      row.className = 'serverhub-table__row';
      if (instance.id === state.selectedAppId) {
        row.classList.add('is-selected');
      }

      const selectInstance = id => {
        updateState(current => ({ ...current, selectedAppId: id }));
      };

      helpers.tableColumns.forEach(column => {
        if (!column) return;
        const cell = document.createElement('td');
        cell.className = column.cellClassName
          ? `serverhub-table__cell ${column.cellClassName}`.trim()
          : 'serverhub-table__cell';
        const renderer = columnRenderers[column.renderer] || (value => value);
        const content = renderer(instance, { ...helpers, selectInstance });
        if (content != null) {
          if (typeof content === 'string') {
            cell.textContent = content;
          } else {
            cell.appendChild(content);
          }
        }
        row.appendChild(cell);
      });

      row.addEventListener('click', () => {
        selectInstance(instance.id);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  };
}

export default createAppsTable;
