import { renderKpiGrid } from '../../common/renderKpiGrid.js';
import { renderInstanceTable } from '../../common/renderInstanceTable.js';
import { renderDetailPanel } from '../../common/renderDetailPanel.js';
import { ensureArray } from '../../../../../../core/helpers.js';

const KPI_THEME = {
  container: 'asset-kpis shopily-metrics',
  grid: 'asset-kpis__grid',
  card: 'asset-kpi shopily-metric',
  label: 'asset-kpi__label shopily-metric__label',
  value: 'asset-kpi__value shopily-metric__value',
  note: 'asset-kpi__note shopily-metric__note',
  empty: 'asset-kpis__empty shopily-metrics__empty'
};

const TABLE_THEME = {
  container: 'asset-table shopily-table-wrapper',
  table: 'asset-table__table shopily-table',
  headCell: 'asset-table__heading',
  row: 'asset-table__row',
  cell: 'asset-table__cell shopily-table__cell',
  actionsCell: 'asset-table__cell--actions shopily-table__cell--actions',
  actions: 'asset-table__actions shopily-table__actions',
  actionButton: 'shopily-button shopily-button--ghost',
  empty: 'asset-table__empty shopily-table__empty'
};

const DETAIL_THEME = {
  container: 'asset-detail shopily-detail',
  header: 'shopily-detail__header',
  title: 'shopily-detail__title',
  subtitle: 'shopily-detail__subtitle',
  status: 'shopily-status',
  stats: 'asset-detail__stats shopily-stats',
  stat: 'asset-detail__stat shopily-stats__row',
  statLabel: 'asset-detail__stat-label',
  statValue: 'asset-detail__stat-value',
  statNote: 'asset-detail__stat-note',
  sections: 'asset-detail__sections shopily-detail__sections',
  section: 'asset-detail__section shopily-panel',
  sectionTitle: 'asset-detail__section-title',
  sectionBody: 'asset-detail__section-body shopily-panel__note',
  actions: 'asset-detail__actions shopily-detail__actions',
  actionButton: 'shopily-button shopily-button--secondary',
  empty: 'asset-detail__empty shopily-detail__empty'
};

const TABLE_COLUMNS = [
  { id: 'name', label: 'Store', cellClassName: 'shopily-table__cell--label', renderer: 'name' },
  { id: 'niche', label: 'Niche', renderer: 'niche' },
  { id: 'earnings', label: 'Daily Earnings', renderer: 'earnings' },
  { id: 'upkeep', label: 'Upkeep', renderer: 'upkeep' },
  { id: 'roi', label: 'ROI', renderer: 'roi' },
  { id: 'actions', label: 'Actions', renderer: 'actions' }
];

function describeMetricTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

function formatNicheDelta(delta, formatPercent) {
  if (delta === null || delta === undefined) return '';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  const icon = numeric > 0 ? '⬆️' : '⬇️';
  return `${icon} ${Math.abs(Math.round(numeric * 100))}%`;
}

function createMetricItems(metrics = {}, formatters = {}) {
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatSignedCurrency = formatters.formatSignedCurrency || (value => String(value ?? ''));
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

function renderHero(model, dependencies = {}) {
  const {
    formatters = {},
    createLaunchButton = () => document.createElement('button')
  } = dependencies;

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

  const metrics = renderKpiGrid({
    items: createMetricItems(model.metrics, formatters),
    theme: KPI_THEME,
    emptyState: {
      message: 'Launch a store to start charting sales momentum.'
    }
  });

  hero.append(body, metrics);
  return hero;
}

function mapTableColumns(columns = []) {
  return columns.map(column => ({
    id: column.id,
    label: column.label,
    className: 'asset-table__heading shopily-table__heading'
  }));
}

function createNicheCell(store, formatters = {}) {
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  const wrapper = document.createElement('div');
  wrapper.className = 'shopily-niche';

  if (store.niche) {
    const name = document.createElement('strong');
    name.className = 'shopily-niche__name';
    name.textContent = store.niche.name;

    const trend = document.createElement('span');
    trend.className = 'shopily-niche__trend';
    const delta = formatNicheDelta(store.niche.delta, formatPercent);
    trend.textContent = delta || `${formatPercent(store.niche.multiplier - 1)} boost`;
    wrapper.append(name, trend);
  } else {
    wrapper.textContent = 'Unassigned';
  }

  return wrapper;
}

function createStoreRowActions(store, handlers = {}) {
  const actions = [];
  if (typeof handlers.onShowUpgradesForStore === 'function') {
    actions.push({
      id: 'upgrade',
      label: 'Upgrade Store',
      className: 'shopily-button shopily-button--ghost',
      onSelect: () => handlers.onShowUpgradesForStore(store.id)
    });
  }
  actions.push({
    id: 'viewDetails',
    label: 'View Details',
    className: 'shopily-button shopily-button--link',
    onSelect: () => handlers.onSelectStore?.(store.id)
  });
  return actions;
}

const CELL_RENDERERS = {
  name(store) {
    return store.label;
  },
  niche(store, context) {
    return createNicheCell(store, context.formatters);
  },
  earnings(store, context) {
    return (context.formatters.formatCurrency || (value => String(value ?? '')))(store.latestPayout || 0);
  },
  upkeep(store, context) {
    return (context.formatters.formatCurrency || (value => String(value ?? '')))(store.maintenanceCost || 0);
  },
  roi(store, context) {
    return (context.formatters.formatPercent || (value => String(value ?? '')))(store.roi);
  }
};

function mapStoreRows(instances, state = {}, dependencies = {}) {
  const { formatters = {}, handlers = {} } = dependencies;
  return ensureArray(instances)
    .filter(Boolean)
    .map(store => {
      const cells = TABLE_COLUMNS
        .filter(column => column.id !== 'actions')
        .map(column => {
          const renderer = CELL_RENDERERS[column.renderer] || CELL_RENDERERS[column.id];
          const content = renderer ? renderer(store, { formatters, handlers }) : store[column.id];
          return {
            className: column.cellClassName,
            content: content ?? ''
          };
        });
      return {
        id: store.id,
        isSelected: store.id === state.selectedStoreId,
        cells,
        actions: createStoreRowActions(store, handlers)
      };
    });
}

function mapDetailStats(store, formatters = {}) {
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatSignedCurrency = formatters.formatSignedCurrency || (value => String(value ?? ''));
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  return [
    { label: 'Latest payout', value: formatCurrency(store.latestPayout || 0) },
    { label: 'Average / day', value: formatCurrency(store.averagePayout || 0) },
    { label: 'Lifetime sales', value: formatCurrency(store.lifetimeIncome || 0) },
    { label: 'Lifetime spend', value: formatCurrency(store.lifetimeSpend || 0) },
    { label: 'Profit to date', value: formatSignedCurrency(store.profit || 0) },
    { label: 'Lifetime ROI', value: formatPercent(store.roi) },
    { label: 'Resale value', value: formatCurrency(store.resaleValue || 0) }
  ];
}

function appendNode(fragment, node) {
  if (!node) return;
  fragment.appendChild(node);
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text != null) {
    element.textContent = text;
  }
  return element;
}

function createHealthSection(store, formatters = {}) {
  const fragment = document.createDocumentFragment();
  if (store.pendingIncome > 0) {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__hint',
      `Pending payouts: ${(formatters.formatCurrency || (value => String(value ?? '')))(store.pendingIncome)} once upkeep clears.`
    ));
  }
  if (!store.maintenanceFunded) {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__warning',
      'Maintenance unfunded — cover daily upkeep to avoid shutdowns.'
    ));
  }
  const maintenanceParts = ensureArray(store.maintenance?.parts);
  if (maintenanceParts.length) {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__note',
      `Daily upkeep: ${maintenanceParts.join(' • ')}`
    ));
  }
  if (!fragment.childNodes.length) {
    return null;
  }
  return {
    className: 'shopily-panel',
    title: 'Operations',
    content: fragment
  };
}

function createQualitySection(store) {
  if (!store.milestone) {
    return null;
  }
  const fragment = document.createDocumentFragment();
  if (store.qualityInfo?.description) {
    appendNode(fragment, createTextElement('p', 'shopily-panel__note', store.qualityInfo.description));
  }
  const progress = document.createElement('div');
  progress.className = 'shopily-progress';
  const fill = document.createElement('div');
  fill.className = 'shopily-progress__fill';
  fill.style.setProperty('--shopily-progress', String((store.milestone.percent || 0) * 100));
  progress.appendChild(fill);
  fragment.appendChild(progress);
  appendNode(fragment, createTextElement(
    'p',
    'shopily-panel__note',
    store.milestone?.summary || 'Push quality actions to unlock the next tier.'
  ));
  return {
    className: 'shopily-panel',
    title: `Quality ${store.qualityLevel}`,
    content: fragment
  };
}

function createNicheSection(store, dependencies = {}) {
  const { formatters = {}, handlers = {} } = dependencies;
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  const fragment = document.createDocumentFragment();

  if (store.niche) {
    appendNode(fragment, createTextElement('p', 'shopily-panel__lead', store.niche.name));
    const delta = formatNicheDelta(store.niche.delta, formatPercent);
    const boost = formatPercent(store.niche.multiplier - 1);
    const summary = store.niche.summary || 'Trend snapshot unavailable.';
    const extra = delta ? ` (${delta})` : boost !== '—' ? ` (${boost})` : '';
    appendNode(fragment, createTextElement('p', 'shopily-panel__note', `${summary}${extra}`.trim()));
  } else {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__note',
      'No niche assigned yet. Pick a trending lane for bonus payouts.'
    ));
  }

  if (!store.nicheLocked && ensureArray(store.nicheOptions).length) {
    const field = createTextElement('label', 'shopily-field', 'Assign niche');
    const select = document.createElement('select');
    select.className = 'shopily-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a niche';
    select.appendChild(placeholder);
    ensureArray(store.nicheOptions).forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.id;
      optionEl.textContent = `${option.name} — ${formatPercent(option.multiplier - 1)} boost`;
      select.appendChild(optionEl);
    });
    select.value = store.niche?.id || '';
    select.addEventListener('change', event => {
      const value = event.target.value || null;
      handlers.onSelectNiche?.(store.id, value);
    });
    field.appendChild(select);
    fragment.appendChild(field);
  } else if (store.nicheLocked && store.niche) {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__hint',
      'Niche locked in — upgrades can refresh trend strength.'
    ));
  }

  return {
    className: 'shopily-panel',
    title: 'Audience niche',
    content: fragment
  };
}

function createPayoutSection(store, formatters = {}) {
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  const fragment = document.createDocumentFragment();
  const entries = ensureArray(store.payoutBreakdown?.entries);

  if (!entries.length) {
    appendNode(fragment, createTextElement(
      'p',
      'shopily-panel__note',
      'No payout modifiers yet. Unlock upgrades and courses to stack multipliers.'
    ));
  } else {
    const list = document.createElement('ul');
    list.className = 'shopily-list';
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-list__item';
      const label = createTextElement('span', 'shopily-list__label', entry.label);
      const amount = formatCurrency(entry.amount || 0);
      const percent = entry.percent !== null && entry.percent !== undefined
        ? ` (${formatPercent(entry.percent)})`
        : '';
      const value = createTextElement('span', 'shopily-list__value', `${amount}${percent}`);
      item.append(label, value);
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }

  appendNode(fragment, createTextElement(
    'p',
    'shopily-panel__note',
    `Yesterday’s total: ${formatCurrency(store.payoutBreakdown?.total || 0)}`
  ));

  return {
    className: 'shopily-panel',
    title: 'Payout recap',
    content: fragment
  };
}

function createActionSection(store, dependencies = {}) {
  const { formatters = {}, handlers = {} } = dependencies;
  const actions = ensureArray(store.actions);
  if (!actions.length) {
    return {
      className: 'shopily-panel',
      title: 'Quality actions',
      content: createTextElement(
        'p',
        'shopily-panel__note',
        'No actions unlocked yet. Install upgrades to expand your playbook.'
      )
    };
  }

  const formatHours = formatters.formatHours || (value => String(value ?? ''));
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const list = document.createElement('ul');
  list.className = 'shopily-action-list';

  actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'shopily-action';

    const label = createTextElement('div', 'shopily-action__label', action.label);
    const meta = createTextElement(
      'div',
      'shopily-action__meta',
      `${action.time > 0 ? formatHours(action.time) : 'Instant'} • ${action.cost > 0 ? formatCurrency(action.cost) : 'No spend'}`
    );
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
      handlers.onRunAction?.(store.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  return {
    className: 'shopily-panel',
    title: 'Quality actions',
    content: list
  };
}

function mapDetailSections(store, dependencies = {}) {
  const sections = [
    createHealthSection(store, dependencies.formatters),
    createQualitySection(store),
    createNicheSection(store, dependencies),
    createPayoutSection(store, dependencies.formatters),
    createActionSection(store, dependencies)
  ];
  return sections.filter(Boolean);
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

  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--dashboard';

  container.appendChild(renderHero(model, { formatters, createLaunchButton }));

  const grid = document.createElement('div');
  grid.className = 'shopily-grid';

  const rows = mapStoreRows(model.instances, state, { formatters, handlers });
  const table = renderInstanceTable({
    theme: TABLE_THEME,
    columns: mapTableColumns(TABLE_COLUMNS),
    rows,
    selectedId: state.selectedStoreId,
    onSelect: id => handlers.onSelectStore?.(id),
    emptyState: {
      message: 'No stores yet. Launch your first shop to start capturing daily sales.'
    }
  });

  const selectedStore = typeof selectors.getSelectedStore === 'function'
    ? selectors.getSelectedStore(state, model)
    : null;

  const detail = renderDetailPanel({
    theme: DETAIL_THEME,
    isEmpty: !selectedStore,
    emptyState: {
      title: 'Select a store',
      message: 'Pick a storefront to inspect payouts, niches, and quality plays.'
    },
    header: selectedStore
      ? {
          title: selectedStore.label,
          subtitle: selectedStore.pendingIncome > 0
            ? `${(formatters.formatCurrency || (value => String(value ?? '')))(selectedStore.pendingIncome)} waiting in pending payouts.`
            : undefined,
          status: {
            className: 'shopily-status',
            dataset: { state: selectedStore.status?.id || 'setup' },
            label: selectedStore.status?.label || 'Setup'
          }
        }
      : undefined,
    stats: selectedStore ? mapDetailStats(selectedStore, formatters) : [],
    sections: selectedStore
      ? mapDetailSections(selectedStore, { formatters, handlers })
      : []
  });

  grid.append(table, detail);
  container.appendChild(grid);

  return container;
}
