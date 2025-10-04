import { ensureArray } from '../../../../../../core/helpers.js';

const KPI_THEME = {
  container: 'serverhub-kpis',
  grid: 'serverhub-kpis__grid',
  card: 'serverhub-kpi',
  label: 'serverhub-kpi__label',
  value: 'serverhub-kpi__value',
  note: 'serverhub-kpi__note',
  empty: 'serverhub-kpis__empty'
};

const TABLE_THEME = {
  container: 'serverhub-table-wrapper',
  table: 'serverhub-table',
  headCell: 'serverhub-table__heading',
  row: 'serverhub-table__row',
  cell: 'serverhub-table__cell',
  actionsCell: 'serverhub-table__cell--actions',
  actions: 'serverhub-action-group',
  actionButton: 'serverhub-button serverhub-button--quiet serverhub-button--compact',
  empty: 'serverhub-empty'
};

const DETAIL_THEME = {
  container: 'serverhub-sidebar',
  header: 'serverhub-detail__header',
  title: 'serverhub-detail__title',
  subtitle: 'serverhub-detail__subtitle',
  status: 'serverhub-status',
  tabs: 'serverhub-detail__tabs',
  stats: 'serverhub-detail__stats',
  stat: 'serverhub-detail__stat',
  statLabel: 'serverhub-detail__stat-label',
  statValue: 'serverhub-detail__stat-value',
  statNote: 'serverhub-detail__stat-note',
  sections: 'serverhub-detail__grid',
  section: 'serverhub-panel',
  sectionTitle: 'serverhub-panel__title',
  sectionBody: 'serverhub-panel__body',
  actions: 'serverhub-detail__actions',
  actionButton: 'serverhub-button serverhub-button--ghost',
  empty: 'serverhub-detail__empty'
};

function formatKpiValue(metric, descriptor, helpers) {
  const { formatCurrency, formatNetCurrency } = helpers;
  const formatter = descriptor?.formatter || descriptor?.format;
  if (typeof formatter === 'function') {
    return formatter(metric, helpers);
  }
  switch (descriptor?.formatter) {
    case 'activeCount':
      return `${metric.value || 0} deployed`;
    case 'netCurrency':
      return formatNetCurrency(metric.value || 0);
    case 'currency':
    default:
      return formatCurrency(metric.value || 0);
  }
}

function createRowAction(instance, actionId, label, helpers) {
  const { onQuickAction } = helpers;
  const action = instance?.actionsById?.[actionId]
    || ensureArray(instance?.actions).find(entry => entry.id === actionId);
  if (!action && !label) {
    return null;
  }
  return {
    id: action?.id || actionId,
    label,
    className: 'serverhub-button serverhub-button--quiet serverhub-button--compact',
    disabled: !action?.available,
    ...(action?.disabledReason ? { title: action.disabledReason } : {}),
    onSelect(rowId) {
      if (!rowId) return;
      onQuickAction?.(rowId, action?.id || actionId);
    }
  };
}

function createViewDetailsAction(selectInstance) {
  return {
    id: 'view-details',
    label: 'View Details',
    className: 'serverhub-button serverhub-button--ghost serverhub-button--compact',
    onSelect(rowId) {
      selectInstance(rowId);
    }
  };
}

function renderNameCell(instance, selectInstance) {
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

function renderNicheCell(instance, helpers) {
  const fragment = document.createDocumentFragment();
  if (instance.niche) {
    const name = document.createElement('strong');
    name.className = 'serverhub-niche__name';
    name.textContent = instance.niche.name;
    const note = document.createElement('span');
    note.className = 'serverhub-niche__note';
    note.textContent = instance.niche.label
      ? `${instance.niche.label}`
      : 'Trend data pending';
    fragment.append(name, note);
    return fragment;
  }
  if (instance.nicheLocked) {
    const locked = document.createElement('span');
    locked.className = 'serverhub-niche__locked';
    locked.textContent = 'Locked';
    fragment.appendChild(locked);
    return fragment;
  }
  const select = document.createElement('select');
  select.className = 'serverhub-select serverhub-select--inline';
  select.ariaLabel = `Assign niche to ${instance.label}`;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Assign niche';
  select.appendChild(placeholder);
  ensureArray(instance.nicheOptions).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
    select.appendChild(opt);
  });
  select.addEventListener('click', event => event.stopPropagation());
  select.addEventListener('change', event => {
    const value = event.target.value;
    if (!value) return;
    helpers.onNicheSelect(instance.id, value);
  });
  fragment.appendChild(select);
  return fragment;
}

function renderPayoutCell(value, { formatCurrency }) {
  const span = document.createElement('span');
  span.textContent = formatCurrency(value);
  return span;
}

function renderPercentCell(value, { formatPercent }) {
  const span = document.createElement('span');
  span.textContent = formatPercent(value);
  return span;
}

function mapKpiGrid(model, helpers) {
  const hero = ensureArray(model.summary?.hero).filter(Boolean);
  const items = hero.map(metric => {
    const descriptor = helpers.kpiDescriptors.get(metric.id)
      || helpers.kpiDescriptors.get('default')
      || {};
    return {
      id: metric.id,
      label: metric.label,
      value: formatKpiValue(metric, descriptor, helpers),
      note: metric.note
    };
  });
  return { items, theme: KPI_THEME };
}

function mapTableColumns(columns = []) {
  return columns
    .filter(Boolean)
    .map(column => ({
      id: column.id,
      label: column.label,
      className: column.headerClassName
    }));
}

function mapTableRows(instances, state, helpers, updateState) {
  const rows = [];
  const columns = ensureArray(helpers.tableColumns);
  const selectInstance = id => {
    updateState(current => ({ ...current, selectedAppId: id }));
  };
  instances.forEach(instance => {
    const cells = [];
    const actions = [];
    columns.forEach(column => {
      if (!column) return;
      const cellConfig = { className: column.cellClassName };
      switch (column.renderer) {
        case 'name':
          cellConfig.content = renderNameCell(instance, selectInstance);
          break;
        case 'status':
          cellConfig.content = renderStatusCell(instance);
          break;
        case 'niche':
          cellConfig.content = renderNicheCell(instance, helpers);
          break;
        case 'payout':
          cellConfig.content = renderPayoutCell(instance.latestPayout, helpers);
          break;
        case 'upkeep':
          cellConfig.content = renderPayoutCell(instance.upkeepCost, helpers);
          break;
        case 'roi':
          cellConfig.content = renderPercentCell(instance.roi, helpers);
          break;
        case 'actions':
          actions.push(
            createRowAction(instance, 'shipFeature', 'Scale Up', helpers),
            createRowAction(instance, 'improveStability', 'Optimize', helpers),
            createViewDetailsAction(selectInstance)
          );
          return;
        default:
          cellConfig.content = instance[column.id];
      }
      cells.push(cellConfig);
    });
    rows.push({
      id: instance.id,
      cells,
      actions: actions.filter(Boolean),
      isSelected: instance.id === state.selectedAppId
    });
  });
  return rows;
}

function mapInstanceTable(instances, state, helpers, updateState) {
  const rows = mapTableRows(instances, state, helpers, updateState);
  return {
    className: 'serverhub-table-wrapper',
    theme: TABLE_THEME,
    columns: mapTableColumns(helpers.tableColumns),
    rows,
    selectedId: state.selectedAppId,
    onSelect(id) {
      if (!id) return;
      updateState(current => ({ ...current, selectedAppId: id }));
    },
    emptyState: {
      message: 'No SaaS apps live yet. Deploy a new instance to kickstart recurring revenue.',
      actions: [
        {
          id: 'launch-app',
          label: 'Deploy New App',
          className: 'serverhub-button serverhub-button--primary',
          onSelect() {
            helpers.onLaunch?.();
          }
        }
      ]
    }
  };
}

function mapDetailStats(instance, helpers) {
  const daysLive = Number(instance.daysLive) || 0;
  return [
    { label: 'Daily earnings', value: helpers.formatCurrency(instance.latestPayout) },
    { label: 'Average daily', value: helpers.formatCurrency(instance.averagePayout) },
    { label: 'Pending income', value: helpers.formatCurrency(instance.pendingIncome) },
    { label: 'Lifetime revenue', value: helpers.formatCurrency(instance.lifetimeIncome) },
    { label: 'Lifetime spend', value: helpers.formatCurrency(instance.lifetimeSpend) },
    { label: 'Net profit', value: helpers.formatNetCurrency(instance.profit) },
    { label: 'ROI', value: helpers.formatPercent(instance.roi) },
    { label: 'Days live', value: `${daysLive} day${daysLive === 1 ? '' : 's'}` }
  ];
}

function createQualitySection(instance) {
  if (!instance.milestone) {
    return null;
  }
  const fragment = document.createDocumentFragment();
  const header = document.createElement('div');
  header.className = 'serverhub-panel__header';
  const title = document.createElement('h3');
  title.textContent = 'Quality tier';
  const badge = document.createElement('span');
  badge.className = 'serverhub-panel__badge';
  badge.textContent = `Tier ${instance.milestone.level}`;
  header.append(title, badge);

  const progress = document.createElement('div');
  progress.className = 'serverhub-progress';
  progress.style.setProperty('--serverhub-progress', String(Math.round((instance.milestone.percent || 0) * 100)));
  const progressFill = document.createElement('span');
  progressFill.className = 'serverhub-progress__fill';
  progress.appendChild(progressFill);

  const summary = document.createElement('p');
  summary.className = 'serverhub-panel__hint';
  summary.textContent = instance.milestone.summary;

  fragment.append(header, progress, summary);
  return fragment;
}

function createNicheSection(instance, helpers) {
  const fragment = document.createDocumentFragment();
  if (instance.niche) {
    const summary = document.createElement('p');
    summary.className = 'serverhub-panel__lead';
    const label = instance.niche.label ? `${instance.niche.label} • ` : '';
    summary.textContent = `${label}${instance.niche.summary || 'Audience details updating daily.'}`;
    fragment.appendChild(summary);
  }

  if (instance.nicheLocked) {
    const locked = document.createElement('p');
    locked.className = 'serverhub-panel__hint';
    locked.textContent = 'Niche locked in — reroll popularity tomorrow for fresh multipliers.';
    fragment.appendChild(locked);
    return fragment;
  }

  const field = document.createElement('label');
  field.className = 'serverhub-field';
  field.textContent = 'Assign niche';
  const select = document.createElement('select');
  select.className = 'serverhub-select';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a niche';
  select.appendChild(placeholder);
  ensureArray(instance.nicheOptions).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
    select.appendChild(opt);
  });
  select.addEventListener('change', event => {
    const value = event.target.value;
    if (!value) return;
    helpers.onNicheSelect(instance.id, value);
  });
  field.appendChild(select);
  fragment.appendChild(field);
  return fragment;
}

function createPayoutSection(instance, helpers) {
  const fragment = document.createDocumentFragment();
  const total = document.createElement('p');
  total.className = 'serverhub-panel__lead';
  total.textContent = `Yesterday: ${helpers.formatCurrency(instance.payoutBreakdown?.total || instance.latestPayout)}`;
  fragment.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'serverhub-breakdown';
  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const item = document.createElement('li');
    item.textContent = 'Core subscriptions, no modifiers yesterday.';
    list.appendChild(item);
  } else {
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'serverhub-breakdown__item';
      const label = document.createElement('span');
      label.className = 'serverhub-breakdown__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'serverhub-breakdown__value';
      const percent = entry.percent !== null && entry.percent !== undefined
        ? ` (${helpers.formatPercent(entry.percent)})`
        : '';
      value.textContent = `${helpers.formatCurrency(entry.amount)}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
  }
  fragment.appendChild(list);
  return fragment;
}

function createActionConsole(instance, helpers) {
  const fragment = document.createDocumentFragment();
  const list = document.createElement('div');
  list.className = 'serverhub-action-console';

  const actions = ensureArray(instance.actions);
  let rendered = 0;

  ensureArray(helpers.actionConsoleOrder).forEach(({ id, label }) => {
    const action = instance.actionsById?.[id] || actions.find(entry => entry.id === id);
    if (!action) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'serverhub-action-console__button';
    const actionLabel = document.createElement('span');
    actionLabel.className = 'serverhub-action-console__label';
    actionLabel.textContent = action.label || label;
    const meta = document.createElement('span');
    meta.className = 'serverhub-action-console__meta';
    const timeLabel = Number(action.time) > 0 ? helpers.formatHours(action.time) : 'Instant';
    const costLabel = helpers.formatCurrency(action.cost || 0);
    meta.textContent = `${timeLabel} • ${costLabel}`;
    if (!action.available) {
      button.disabled = true;
      if (action.disabledReason) {
        button.title = action.disabledReason;
      }
    }
    button.append(actionLabel, meta);
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (button.disabled) return;
      helpers.onQuickAction(instance.id, action.id);
    });
    list.appendChild(button);
    rendered += 1;
  });

  if (!rendered) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-panel__hint';
    empty.textContent = 'Quality actions unlock as your SaaS portfolio grows.';
    fragment.appendChild(empty);
  } else {
    fragment.appendChild(list);
  }

  return fragment;
}

function mapDetailSections(instance, helpers) {
  const sections = [];
  const quality = createQualitySection(instance);
  if (quality) {
    sections.push({
      className: 'serverhub-panel serverhub-panel--quality',
      render: ({ article }) => {
        article.appendChild(quality);
      }
    });
  }

  sections.push({
    className: 'serverhub-panel',
    title: 'Niche targeting',
    render: ({ article }) => {
      article.appendChild(createNicheSection(instance, helpers));
    }
  });

  sections.push({
    className: 'serverhub-panel',
    title: 'Payout recap',
    render: ({ article }) => {
      article.appendChild(createPayoutSection(instance, helpers));
    }
  });

  sections.push({
    className: 'serverhub-panel serverhub-panel--actions',
    title: 'Action console',
    render: ({ article }) => {
      article.appendChild(createActionConsole(instance, helpers));
    }
  });

  return sections;
}

function mapDetailPanel(model, state, helpers) {
  const instance = helpers.getSelectedApp(model, state);
  if (!instance) {
    return {
      theme: DETAIL_THEME,
      className: 'serverhub-sidebar',
      isEmpty: true,
      emptyState: {
        message: 'Select an app to inspect uptime, payouts, and quality progress.'
      }
    };
  }

  return {
    theme: DETAIL_THEME,
    className: 'serverhub-sidebar',
    header: {
      title: instance.label,
      status: {
        className: 'serverhub-status',
        label: instance.status?.label || 'Active',
        dataset: { state: instance.status?.id || 'setup' }
      },
      tabs: [
        { label: 'Overview', isActive: true }
      ]
    },
    stats: mapDetailStats(instance, helpers),
    sections: mapDetailSections(instance, helpers)
  };
}

export function createAppsView(options = {}) {
  const {
    formatCurrency,
    formatNetCurrency,
    formatPercent,
    formatHours,
    kpiDescriptors,
    tableColumns,
    actionConsoleOrder,
    onQuickAction,
    onNicheSelect,
    onLaunch,
    getSelectedApp
  } = options;

  const helpers = {
    formatCurrency,
    formatNetCurrency,
    formatPercent,
    formatHours,
    kpiDescriptors,
    tableColumns,
    actionConsoleOrder,
    onQuickAction,
    onNicheSelect,
    onLaunch,
    getSelectedApp
  };

  return function renderAppsView(viewContext = {}) {
    const {
      model = {},
      state = {},
      updateState,
      renderKpiGrid,
      renderInstanceTable,
      renderDetailPanel
    } = viewContext;

    const section = document.createElement('section');
    section.className = 'serverhub-view serverhub-view--apps';

    section.appendChild(renderKpiGrid(mapKpiGrid(model, helpers)));

    const layout = document.createElement('div');
    layout.className = 'serverhub-layout';
    const instances = ensureArray(model.instances);
    layout.append(
      renderInstanceTable(mapInstanceTable(instances, state, helpers, updateState)),
      renderDetailPanel(mapDetailPanel(model, state, helpers))
    );

    section.appendChild(layout);
    return section;
  };
}

export default {
  createAppsView
};
