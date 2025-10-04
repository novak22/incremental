import { ensureArray } from '../../../../../../core/helpers.js';

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

function renderNicheCell(instance, { onNicheSelect }) {
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
    onNicheSelect(instance.id, value);
  });
  fragment.appendChild(select);
  return fragment;
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

const COLUMN_RENDERERS = {
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

function createStat(label, value, note = '') {
  const item = document.createElement('div');
  item.className = 'serverhub-detail__stat';
  const title = document.createElement('span');
  title.className = 'serverhub-detail__stat-label';
  title.textContent = label;
  const amount = document.createElement('strong');
  amount.className = 'serverhub-detail__stat-value';
  amount.textContent = value;
  item.append(title, amount);
  if (note) {
    const noteEl = document.createElement('span');
    noteEl.className = 'serverhub-detail__stat-note';
    noteEl.textContent = note;
    item.appendChild(noteEl);
  }
  return item;
}

function renderActionConsole(instance, { actionConsoleOrder, onQuickAction, formatCurrency, formatHours }) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel serverhub-panel--actions';
  const heading = document.createElement('h3');
  heading.textContent = 'Action console';
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'serverhub-action-console';

  const actions = ensureArray(instance.actions);
  let rendered = 0;

  ensureArray(actionConsoleOrder).forEach(({ id, label }) => {
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
    const timeLabel = Number(action.time) > 0 ? formatHours(action.time) : 'Instant';
    const costLabel = formatCurrency(action.cost || 0);
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
      onQuickAction(instance.id, action.id);
    });
    list.appendChild(button);
    rendered += 1;
  });

  if (!rendered) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-panel__hint';
    empty.textContent = 'Quality actions unlock as your SaaS portfolio grows.';
    section.appendChild(empty);
  } else {
    section.appendChild(list);
  }

  return section;
}

function renderNicheSection(instance, helpers) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'Niche targeting';
  section.appendChild(heading);

  if (instance.niche) {
    const summary = document.createElement('p');
    summary.className = 'serverhub-panel__lead';
    const label = instance.niche.label ? `${instance.niche.label} • ` : '';
    summary.textContent = `${label}${instance.niche.summary || 'Audience details updating daily.'}`;
    section.appendChild(summary);
  }

  if (instance.nicheLocked) {
    const locked = document.createElement('p');
    locked.className = 'serverhub-panel__hint';
    locked.textContent = 'Niche locked in — reroll popularity tomorrow for fresh multipliers.';
    section.appendChild(locked);
    return section;
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
  section.appendChild(field);
  return section;
}

function renderPayoutBreakdown(instance, { formatCurrency, formatPercent }) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'Payout recap';
  section.appendChild(heading);

  const total = document.createElement('p');
  total.className = 'serverhub-panel__lead';
  total.textContent = `Yesterday: ${formatCurrency(instance.payoutBreakdown?.total || instance.latestPayout)}`;
  section.appendChild(total);

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
        ? ` (${formatPercent(entry.percent)})`
        : '';
      value.textContent = `${formatCurrency(entry.amount)}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
  }
  section.appendChild(list);
  return section;
}

function renderQualitySection(instance) {
  if (!instance.milestone) {
    return null;
  }
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('div');
  heading.className = 'serverhub-panel__header';
  const title = document.createElement('h3');
  title.textContent = 'Quality tier';
  const badge = document.createElement('span');
  badge.className = 'serverhub-panel__badge';
  badge.textContent = `Tier ${instance.milestone.level}`;
  heading.append(title, badge);
  section.appendChild(heading);

  const progress = document.createElement('div');
  progress.className = 'serverhub-progress';
  progress.style.setProperty('--serverhub-progress', String(Math.round((instance.milestone.percent || 0) * 100)));
  const progressFill = document.createElement('span');
  progressFill.className = 'serverhub-progress__fill';
  progress.appendChild(progressFill);

  const summary = document.createElement('p');
  summary.className = 'serverhub-panel__hint';
  summary.textContent = instance.milestone.summary;

  section.append(progress, summary);
  return section;
}

function renderDetailPanel(model, state, helpers) {
  const aside = document.createElement('aside');
  aside.className = 'serverhub-sidebar';
  const instance = helpers.getSelectedApp(model, state);
  if (!instance) {
    const empty = document.createElement('div');
    empty.className = 'serverhub-detail__empty';
    empty.textContent = 'Select an app to inspect uptime, payouts, and quality progress.';
    aside.appendChild(empty);
    return aside;
  }

  const header = document.createElement('header');
  header.className = 'serverhub-detail__header';
  const title = document.createElement('h2');
  title.textContent = instance.label;
  const status = document.createElement('span');
  status.className = 'serverhub-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Active';
  header.append(title, status);

  const tabs = document.createElement('div');
  tabs.className = 'serverhub-detail__tabs';
  const overviewTab = document.createElement('button');
  overviewTab.type = 'button';
  overviewTab.className = 'serverhub-detail__tab is-active';
  overviewTab.textContent = 'Overview';
  overviewTab.disabled = true;
  tabs.appendChild(overviewTab);

  const stats = document.createElement('div');
  stats.className = 'serverhub-detail__stats';
  stats.append(
    createStat('Daily earnings', helpers.formatCurrency(instance.latestPayout)),
    createStat('Average daily', helpers.formatCurrency(instance.averagePayout)),
    createStat('Pending income', helpers.formatCurrency(instance.pendingIncome)),
    createStat('Lifetime revenue', helpers.formatCurrency(instance.lifetimeIncome)),
    createStat('Lifetime spend', helpers.formatCurrency(instance.lifetimeSpend)),
    createStat('Net profit', helpers.formatNetCurrency(instance.profit)),
    createStat('ROI', helpers.formatPercent(instance.roi)),
    createStat('Days live', `${instance.daysLive} day${instance.daysLive === 1 ? '' : 's'}`)
  );

  const panels = document.createElement('div');
  panels.className = 'serverhub-detail__grid';
  const quality = renderQualitySection(instance);
  if (quality) {
    panels.appendChild(quality);
  }
  panels.append(
    renderNicheSection(instance, helpers),
    renderPayoutBreakdown(instance, helpers)
  );

  aside.append(header, tabs, stats, panels, renderActionConsole(instance, helpers));
  return aside;
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

function renderAppsTable(instances, state, helpers, updateState) {
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
      const renderer = COLUMN_RENDERERS[column.renderer] || (value => value);
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
}

function renderMetrics(model, helpers) {
  const metrics = document.createElement('section');
  metrics.className = 'serverhub-kpis';
  const hero = ensureArray(model.summary?.hero);
  hero.forEach(metric => {
    if (!metric) return;
    const descriptor = helpers.kpiDescriptors.get(metric.id)
      || helpers.kpiDescriptors.get('default')
      || {};
    const card = document.createElement('article');
    card.className = 'serverhub-kpi';
    const label = document.createElement('span');
    label.className = 'serverhub-kpi__label';
    label.textContent = metric.label;
    const value = document.createElement('p');
    value.className = 'serverhub-kpi__value';
    value.textContent = formatKpiValue(metric, descriptor, helpers);
    card.append(label, value);
    if (metric.note) {
      const note = document.createElement('span');
      note.className = 'serverhub-kpi__note';
      note.textContent = metric.note;
      card.appendChild(note);
    }
    metrics.appendChild(card);
  });
  return metrics;
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

  return function renderAppsView({ model = {}, state = {}, updateState }) {
    const section = document.createElement('section');
    section.className = 'serverhub-view serverhub-view--apps';
    section.appendChild(renderMetrics(model, helpers));

    const layout = document.createElement('div');
    layout.className = 'serverhub-layout';
    const instances = ensureArray(model.instances);
    layout.append(
      renderAppsTable(instances, state, helpers, updateState),
      renderDetailPanel(model, state, helpers)
    );

    section.appendChild(layout);
    return section;
  };
}

export default {
  createAppsView
};
