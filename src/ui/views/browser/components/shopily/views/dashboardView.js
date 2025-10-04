import { ensureArray } from '../../../../../../core/helpers.js';

const KPI_THEME = {
  container: 'shopily-metrics',
  grid: 'shopily-metrics__grid',
  card: 'shopily-metric',
  label: 'shopily-metric__label',
  value: 'shopily-metric__value',
  note: 'shopily-metric__note',
  empty: 'shopily-metrics__empty'
};

const TABLE_COLUMNS = [
  { id: 'label', label: 'Store', cellClassName: 'shopily-table__cell--label', renderer: 'name' },
  { id: 'niche', label: 'Niche', renderer: 'niche' },
  { id: 'latestPayout', label: 'Daily Earnings', renderer: 'earnings' },
  { id: 'maintenanceCost', label: 'Upkeep', renderer: 'upkeep' },
  { id: 'roi', label: 'ROI', renderer: 'roi' },
  { id: 'actions', label: 'Actions', cellClassName: 'shopily-table__cell--actions', renderer: 'actions' }
];

const TABLE_THEME = {
  container: 'shopily-table-container',
  table: 'shopily-table',
  headCell: 'shopily-table__heading',
  row: 'shopily-table__row',
  cell: 'shopily-table__cell',
  actionsCell: 'shopily-table__cell--actions',
  actions: 'shopily-table__actions',
  actionButton: 'shopily-button shopily-button--ghost',
  empty: 'shopily-table__empty'
};

const DETAIL_THEME = {
  container: 'shopily-detail',
  header: 'shopily-detail__header',
  title: 'shopily-detail__title',
  subtitle: 'shopily-detail__subtitle',
  status: 'shopily-status',
  tabs: 'shopily-detail__tabs',
  stats: 'shopily-detail__stats',
  stat: 'shopily-detail__stat',
  statLabel: 'shopily-detail__stat-label',
  statValue: 'shopily-detail__stat-value',
  statNote: 'shopily-detail__stat-note',
  sections: 'shopily-detail__panels',
  section: 'shopily-panel',
  sectionTitle: 'shopily-panel__title',
  sectionBody: 'shopily-panel__body',
  actions: 'shopily-detail__actions',
  actionButton: 'shopily-button',
  empty: 'shopily-detail__empty'
};

function describeMetricTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

function mapHeroMetrics(metrics = {}, formatters = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? '')
  } = formatters;
  return [
    {
      id: 'totalStores',
      label: 'Total Stores',
      value: metrics.totalStores || 0,
      note: 'Active & in setup',
      tone: 'neutral'
    },
    {
      id: 'dailySales',
      label: 'Daily Sales',
      value: formatCurrency(metrics.dailySales || 0),
      note: 'Yesterday’s payouts',
      tone: describeMetricTone(metrics.dailySales)
    },
    {
      id: 'dailyUpkeep',
      label: 'Daily Upkeep',
      value: formatCurrency(metrics.dailyUpkeep || 0),
      note: 'Cash needed each day',
      tone: describeMetricTone(-(metrics.dailyUpkeep || 0))
    },
    {
      id: 'netDaily',
      label: 'Net / Day',
      value: formatSignedCurrency(metrics.netDaily || 0),
      note: 'Sales minus upkeep',
      tone: describeMetricTone(metrics.netDaily)
    }
  ];
}

function formatNicheDelta(delta, formatPercent) {
  if (delta === null || delta === undefined) return '';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  const icon = numeric > 0 ? '⬆️' : '⬇️';
  return `${icon} ${Math.abs(Math.round(numeric * 100))}%`;
}

function renderHero(model, dependencies = {}) {
  const { formatters = {}, createLaunchButton = () => document.createElement('button'), renderKpiGrid } = dependencies;
  const hero = document.createElement('section');
  hero.className = 'shopily-hero';

  const body = document.createElement('div');
  body.className = 'shopily-hero__body';

  const headline = document.createElement('h2');
  headline.textContent = 'Your store, your brand, powered by Shopily.';
  const summary = document.createElement('p');
  summary.textContent = model.summary?.meta || 'Launch your first storefront to kick off the commerce flywheel.';

  const ctaRow = document.createElement('div');
  ctaRow.className = 'shopily-hero__cta';
  ctaRow.appendChild(createLaunchButton(model.launch));

  body.append(headline, summary, ctaRow);
  hero.append(body, renderKpiGrid({ items: mapHeroMetrics(model.metrics, formatters), theme: KPI_THEME }));
  return hero;
}

function renderNameCell(instance, handlers = {}) {
  const { onSelectStore = () => {} } = handlers;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-table__link';
  button.textContent = instance.label;
  button.addEventListener('click', event => {
    event.stopPropagation();
    onSelectStore(instance.id);
  });
  return button;
}

function renderNicheCell(instance, formatters = {}) {
  const { formatPercent = value => String(value ?? '') } = formatters;
  const wrapper = document.createElement('div');
  wrapper.className = 'shopily-niche';
  if (instance.niche) {
    const name = document.createElement('strong');
    name.className = 'shopily-niche__name';
    name.textContent = instance.niche.name;
    const trend = document.createElement('span');
    trend.className = 'shopily-niche__trend';
    const delta = formatNicheDelta(instance.niche.delta, formatPercent);
    trend.textContent = delta || `${formatPercent(instance.niche.multiplier - 1)} boost`;
    wrapper.append(name, trend);
    return wrapper;
  }
  wrapper.textContent = 'Unassigned';
  return wrapper;
}

function mapTableColumns() {
  return TABLE_COLUMNS.map(column => ({
    id: column.id,
    label: column.label,
    className: 'shopily-table__heading'
  }));
}

function mapTableRows(instances, state, dependencies = {}) {
  const { formatters = {}, handlers = {} } = dependencies;
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  const rows = [];
  const selectedId = state.selectedStoreId;
  ensureArray(instances).forEach(instance => {
    const cells = [];
    const actions = [];
    TABLE_COLUMNS.forEach(column => {
      if (!column) return;
      const cell = { className: column.cellClassName };
      switch (column.renderer) {
        case 'name':
          cell.content = renderNameCell(instance, handlers);
          break;
        case 'niche':
          cell.content = renderNicheCell(instance, formatters);
          break;
        case 'earnings':
          cell.content = formatCurrency(instance.latestPayout || 0);
          break;
        case 'upkeep':
          cell.content = formatCurrency(instance.maintenanceCost || 0);
          break;
        case 'roi':
          cell.content = formatPercent(instance.roi);
          break;
        case 'actions':
          actions.push(
            {
              id: 'upgrade',
              label: 'Upgrade Store',
              className: 'shopily-button shopily-button--ghost',
              onSelect(rowId) {
                handlers.onShowUpgradesForStore?.(rowId);
              }
            },
            {
              id: 'details',
              label: 'View Details',
              className: 'shopily-button shopily-button--link',
              onSelect(rowId) {
                handlers.onSelectStore?.(rowId);
              }
            }
          );
          return;
        default:
          cell.content = instance[column.id];
      }
      cells.push(cell);
    });
    rows.push({
      id: instance.id,
      cells,
      actions: actions.filter(Boolean),
      isSelected: instance.id === selectedId
    });
  });
  return rows;
}

function mapStoreTable(instances, state, dependencies = {}) {
  return {
    theme: TABLE_THEME,
    columns: mapTableColumns(),
    rows: mapTableRows(instances, state, dependencies),
    selectedId: state.selectedStoreId,
    onSelect(id) {
      dependencies.handlers?.onSelectStore?.(id);
    },
    emptyState: {
      message: 'No stores yet. Launch your first shop to start capturing daily sales.'
    }
  };
}

function createStatsSection(instance, helpers = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? ''),
    formatPercent = value => String(value ?? '')
  } = helpers;
  const fragment = document.createDocumentFragment();
  const list = document.createElement('dl');
  list.className = 'shopily-stats';
  const entries = [
    { label: 'Latest payout', value: formatCurrency(instance.latestPayout || 0) },
    { label: 'Average / day', value: formatCurrency(instance.averagePayout || 0) },
    { label: 'Lifetime sales', value: formatCurrency(instance.lifetimeIncome || 0) },
    { label: 'Lifetime spend', value: formatCurrency(instance.lifetimeSpend || 0) },
    { label: 'Profit to date', value: formatSignedCurrency(instance.profit || 0) },
    { label: 'Lifetime ROI', value: formatPercent(instance.roi) },
    { label: 'Resale value', value: formatCurrency(instance.resaleValue || 0) }
  ];
  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'shopily-stats__row';
    const term = document.createElement('dt');
    term.textContent = entry.label;
    const value = document.createElement('dd');
    value.textContent = entry.value;
    row.append(term, value);
    list.appendChild(row);
  });
  fragment.appendChild(list);
  if (!instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'shopily-panel__warning';
    warning.textContent = 'Maintenance unfunded — cover daily upkeep to avoid shutdowns.';
    fragment.appendChild(warning);
  }
  if (ensureArray(instance.maintenance?.parts).length) {
    const upkeep = document.createElement('p');
    upkeep.className = 'shopily-panel__note';
    upkeep.textContent = `Daily upkeep: ${instance.maintenance.parts.join(' • ')}`;
    fragment.appendChild(upkeep);
  }
  return fragment;
}

function createQualitySection(instance, helpers = {}) {
  const fragment = document.createDocumentFragment();
  if (instance.qualityInfo?.description) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = instance.qualityInfo.description;
    fragment.appendChild(note);
  }
  const progress = document.createElement('div');
  progress.className = 'shopily-progress';
  const fill = document.createElement('div');
  fill.className = 'shopily-progress__fill';
  fill.style.setProperty('--shopily-progress', String((instance.milestone?.percent || 0) * 100));
  progress.appendChild(fill);
  const summary = document.createElement('p');
  summary.className = 'shopily-panel__note';
  summary.textContent = instance.milestone?.summary || 'Push quality actions to unlock the next tier.';
  fragment.append(progress, summary);
  return fragment;
}

function createNicheSection(instance, helpers = {}) {
  const { formatPercent = value => String(value ?? ''), onSelectNiche = () => {} } = helpers;
  const fragment = document.createDocumentFragment();
  if (instance.niche) {
    const lead = document.createElement('p');
    lead.className = 'shopily-panel__lead';
    lead.textContent = instance.niche.name;
    const vibe = document.createElement('p');
    vibe.className = 'shopily-panel__note';
    const delta = formatNicheDelta(instance.niche.delta, formatPercent);
    const boost = formatPercent(instance.niche.multiplier - 1);
    vibe.textContent = `${instance.niche.summary || 'Trend snapshot unavailable.'} ${delta ? `(${delta})` : boost !== '—' ? `(${boost})` : ''}`.trim();
    fragment.append(lead, vibe);
  } else {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No niche assigned yet. Pick a trending lane for bonus payouts.';
    fragment.appendChild(empty);
  }
  if (!instance.nicheLocked && ensureArray(instance.nicheOptions).length) {
    const field = document.createElement('label');
    field.className = 'shopily-field';
    field.textContent = 'Assign niche';
    const select = document.createElement('select');
    select.className = 'shopily-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a niche';
    select.appendChild(placeholder);
    instance.nicheOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.id;
      optionEl.textContent = `${option.name} — ${formatPercent(option.multiplier - 1)} boost`;
      select.appendChild(optionEl);
    });
    select.value = instance.niche?.id || '';
    select.addEventListener('change', event => {
      onSelectNiche(instance.id, event.target.value || null);
    });
    field.appendChild(select);
    fragment.appendChild(field);
  } else if (instance.nicheLocked && instance.niche) {
    const locked = document.createElement('p');
    locked.className = 'shopily-panel__hint';
    locked.textContent = 'Niche locked in — upgrades can refresh trend strength.';
    fragment.appendChild(locked);
  }
  return fragment;
}

function createPayoutSection(instance, helpers = {}) {
  const { formatCurrency = value => String(value ?? ''), formatPercent = value => String(value ?? '') } = helpers;
  const fragment = document.createDocumentFragment();
  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = 'No payout modifiers yet. Unlock upgrades and courses to stack multipliers.';
    fragment.appendChild(note);
  } else {
    const list = document.createElement('ul');
    list.className = 'shopily-list';
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-list__item';
      const label = document.createElement('span');
      label.className = 'shopily-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'shopily-list__value';
      const amount = formatCurrency(entry.amount || 0);
      const percent = entry.percent !== null && entry.percent !== undefined ? ` (${formatPercent(entry.percent)})` : '';
      value.textContent = `${amount}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }
  const total = document.createElement('p');
  total.className = 'shopily-panel__note';
  total.textContent = `Yesterday’s total: ${formatCurrency(instance.payoutBreakdown?.total || 0)}`;
  fragment.appendChild(total);
  return fragment;
}

function createActionSection(instance, helpers = {}) {
  const { formatHours = value => String(value ?? ''), formatCurrency = value => String(value ?? ''), onRunAction = () => {} } = helpers;
  const fragment = document.createDocumentFragment();
  const actions = ensureArray(instance.actions);
  if (!actions.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No actions unlocked yet. Install upgrades to expand your playbook.';
    fragment.appendChild(empty);
    return fragment;
  }
  const list = document.createElement('ul');
  list.className = 'shopily-action-list';
  actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'shopily-action';
    const label = document.createElement('div');
    label.className = 'shopily-action__label';
    label.textContent = action.label;
    const meta = document.createElement('div');
    meta.className = 'shopily-action__meta';
    const time = action.time > 0 ? formatHours(action.time) : 'Instant';
    const cost = action.cost > 0 ? formatCurrency(action.cost) : 'No spend';
    meta.textContent = `${time} • ${cost}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopily-button shopily-button--secondary';
    button.textContent = action.available ? 'Run now' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onRunAction(instance.id, action.id);
    });
    item.append(label, meta, button);
    list.appendChild(item);
  });
  fragment.appendChild(list);
  return fragment;
}

function mapDetailSections(instance, helpers = {}) {
  const sections = [];
  if (instance.pendingIncome > 0) {
    sections.push({
      className: 'shopily-detail__notice',
      render: ({ article }) => {
        const notice = document.createElement('p');
        notice.className = 'shopily-panel__hint';
        notice.textContent = `Pending payouts: ${helpers.formatCurrency(instance.pendingIncome)} once upkeep clears.`;
        const parent = article.parentNode;
        if (parent) {
          parent.replaceChild(notice, article);
        }
      }
    });
  }
  sections.push({
    className: 'shopily-panel',
    title: 'Store health',
    render: ({ article }) => {
      article.appendChild(createStatsSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: `Quality ${instance.qualityLevel}`,
    render: ({ article }) => {
      article.appendChild(createQualitySection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Audience niche',
    render: ({ article }) => {
      article.appendChild(createNicheSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Payout recap',
    render: ({ article }) => {
      article.appendChild(createPayoutSection(instance, helpers));
    }
  });
  sections.push({
    className: 'shopily-panel',
    title: 'Quality actions',
    render: ({ article }) => {
      article.appendChild(createActionSection(instance, helpers));
    }
  });
  return sections;
}

function mapStoreDetail(model, state, dependencies = {}) {
  const { selectors = {}, formatters = {}, handlers = {} } = dependencies;
  const instance = selectors.getSelectedStore ? selectors.getSelectedStore(state, model) : null;
  if (!instance) {
    return {
      theme: DETAIL_THEME,
      className: 'shopily-detail',
      isEmpty: true,
      emptyState: {
        message: 'Select a store to inspect payouts, niches, and upgrades.'
      }
    };
  }
  const helpers = {
    ...formatters,
    onRunAction: handlers.onRunAction,
    onSelectNiche: handlers.onSelectNiche
  };
  return {
    theme: DETAIL_THEME,
    className: 'shopily-detail',
    header: {
      title: instance.label,
      status: {
        className: 'shopily-status',
        label: instance.status?.label || 'Setup',
        dataset: { state: instance.status?.id || 'setup' }
      }
    },
    sections: mapDetailSections(instance, helpers)
  };
}

export default function renderDashboardView(options = {}) {
  const {
    model = {},
    state = {},
    formatters = {},
    handlers = {},
    selectors = {},
    createLaunchButton = () => document.createElement('button')
  } = options;

  return function renderDashboardSection(viewContext = {}) {
    const {
      model: viewModel = model,
      state: viewState = state,
      renderKpiGrid,
      renderInstanceTable,
      renderDetailPanel
    } = viewContext;

    const container = document.createElement('section');
    container.className = 'shopily-view shopily-view--dashboard';

    container.appendChild(renderHero(viewModel, { formatters, createLaunchButton, renderKpiGrid }));

    const grid = document.createElement('div');
    grid.className = 'shopily-grid';
    const instances = ensureArray(viewModel.instances);
    grid.append(
      renderInstanceTable(mapStoreTable(instances, viewState, { formatters, handlers })),
      renderDetailPanel(mapStoreDetail(viewModel, viewState, { selectors, formatters, handlers }))
    );

    container.appendChild(grid);
    return container;
  };
}
