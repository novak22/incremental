import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';
import renderFinanceHeader from './finance/header.js';
import renderFinanceLedger, { createBankSection } from './finance/ledger.js';
import renderFinanceActivity from './finance/activity.js';
import renderFinanceEducation from './finance/education.js';
import renderFinanceHistory from './finance/history.js';
import renderFinanceObligations from './finance/obligations.js';
import { formatCurrency, formatSignedCurrency } from '../utils/financeFormatting.js';

function renderFinancePerformance(entries = []) {
  const { section, body } = createBankSection('Asset Performance', 'Sort assets by ROI, cost, or time active.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active assets yet. Launch a venture to start tracking ROI.';
    body.appendChild(empty);
    return section;
  }

  const enriched = list.map(entry => {
    const label = entry.label || entry.assetName || 'Asset';
    const cost = Math.max(0, Number(entry.upkeep) || 0);
    const earnings = Math.max(0, Number(entry.average) || 0);
    const daysActive = Math.max(0, Number(entry.daysActive) || 0);
    const roiValue = cost > 0 ? (earnings - cost) / Math.max(cost, 0.0001) : earnings > 0 ? Number.POSITIVE_INFINITY : 0;
    const roiLabel = Number.isFinite(roiValue)
      ? `${roiValue >= 0 ? '+' : ''}${(Math.round(roiValue * 1000) / 10).toFixed(1)}%`
      : '∞';
    const net = earnings - cost;
    return {
      ...entry,
      label,
      cost,
      earnings,
      daysActive,
      roiValue,
      roiLabel,
      net
    };
  });

  const columns = [
    { key: 'label', label: 'Asset', type: 'text' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'earnings', label: 'Earnings', type: 'number' },
    { key: 'roiValue', label: 'ROI', type: 'number' },
    { key: 'daysActive', label: 'Days Active', type: 'number' }
  ];

  let sortKey = 'roiValue';
  let sortDirection = 'desc';

  const grid = document.createElement('div');
  grid.className = 'bankapp-grid';

  const header = document.createElement('div');
  header.className = 'bankapp-grid__header';
  grid.appendChild(header);

  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'bankapp-grid__body';
  grid.appendChild(rowsContainer);

  function compareEntries(a, b, column) {
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (column.type === 'text') {
      const aLabel = String(a[column.key] || '').toLowerCase();
      const bLabel = String(b[column.key] || '').toLowerCase();
      return direction * aLabel.localeCompare(bLabel);
    }
    const aValue = Number(a[column.key]);
    const bValue = Number(b[column.key]);
    const aFinite = Number.isFinite(aValue);
    const bFinite = Number.isFinite(bValue);
    if (!aFinite || !bFinite) {
      if (!aFinite && !bFinite) return 0;
      if (!aFinite) return sortDirection === 'desc' ? -1 : 1;
      if (!bFinite) return sortDirection === 'desc' ? 1 : -1;
    }
    return direction * (aValue - bValue);
  }

  function renderRows() {
    rowsContainer.innerHTML = '';
    const column = columns.find(col => col.key === sortKey) || columns[0];
    const sorted = enriched.slice().sort((a, b) => compareEntries(a, b, column));

    sorted.forEach((entry, index) => {
      const row = document.createElement('details');
      row.className = 'bankapp-grid__row';
      if (index === 0) {
        row.classList.add('is-leading');
      }
      if (!entry.earnings) {
        row.classList.add('is-idle');
      }

      const summary = document.createElement('summary');
      summary.className = 'bankapp-grid__summary';

      const cells = [
        { className: 'bankapp-grid__cell bankapp-grid__cell--asset', text: entry.label },
        { className: 'bankapp-grid__cell', text: formatCurrency(entry.cost) },
        { className: 'bankapp-grid__cell', text: formatCurrency(entry.earnings) },
        { className: 'bankapp-grid__cell bankapp-grid__cell--roi', text: entry.roiLabel },
        { className: 'bankapp-grid__cell', text: entry.daysActive ? `${entry.daysActive}` : '—' }
      ];

      cells.forEach(cell => {
        const span = document.createElement('span');
        span.className = cell.className;
        span.textContent = cell.text;
        summary.appendChild(span);
      });

      row.appendChild(summary);

      const detail = document.createElement('div');
      detail.className = 'bankapp-grid__details';
      const info = [
        entry.assetName && entry.assetName !== entry.label ? entry.assetName : null,
        `Latest ${formatCurrency(entry.latest || 0)}`,
        `Net ${formatSignedCurrency(entry.net || 0)}`,
        `Upkeep ${formatCurrency(entry.upkeep || 0)}`,
        `Resale ${formatCurrency(entry.saleValue || 0)}`
      ].filter(Boolean);
      detail.textContent = info.join(' · ');
      row.appendChild(detail);

      rowsContainer.appendChild(row);
    });
  }

  function updateSortButtons() {
    Array.from(header.children).forEach(node => {
      if (!node || typeof node.tagName !== 'string' || node.tagName !== 'BUTTON') return;
      const { key } = node.dataset;
      const isActive = key === sortKey;
      node.dataset.active = isActive ? 'true' : 'false';
      if (isActive) {
        node.dataset.direction = sortDirection;
      } else {
        node.removeAttribute('data-direction');
      }
    });
  }

  columns.forEach(column => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bankapp-grid__sort';
    button.textContent = column.label;
    button.dataset.key = column.key;
    button.addEventListener('click', () => {
      if (sortKey === column.key) {
        sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      } else {
        sortKey = column.key;
        sortDirection = column.type === 'text' ? 'asc' : 'desc';
      }
      updateSortButtons();
      renderRows();
    });
    header.appendChild(button);
  });

  updateSortButtons();
  renderRows();

  body.appendChild(grid);
  return section;
}

function renderFinanceOpportunities(model = {}) {
  const { section, body } = createBankSection(
    'Investments & Liabilities',
    'Snapshot of queued assets, upgrades, and hustles.'
  );

  const assetEntries = Array.isArray(model.assets) ? model.assets.slice(0, 4) : [];
  const upgradeEntries = Array.isArray(model.upgrades) ? model.upgrades.slice(0, 4) : [];
  const hustleEntries = Array.isArray(model.hustles) ? model.hustles.slice(0, 4) : [];

  const matrix = document.createElement('div');
  matrix.className = 'bankapp-matrix';

  function createListItem(primary, value, note) {
    const item = document.createElement('li');
    item.className = 'bankapp-matrix__item';

    const label = document.createElement('span');
    label.className = 'bankapp-matrix__label';
    label.textContent = primary;

    const amount = document.createElement('span');
    amount.className = 'bankapp-matrix__value';
    amount.textContent = value;

    item.append(label, amount);

    if (note) {
      const noteNode = document.createElement('span');
      noteNode.className = 'bankapp-matrix__note';
      noteNode.textContent = note;
      item.appendChild(noteNode);
    }

    return item;
  }

  function renderColumn(title, entries, builder) {
    const column = document.createElement('section');
    column.className = 'bankapp-matrix__column';

    const heading = document.createElement('h3');
    heading.textContent = title;
    column.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'bankapp-matrix__list';

    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'bankapp-matrix__item bankapp-matrix__item--empty';
      empty.textContent = 'Nothing queued yet.';
      list.appendChild(empty);
    } else {
      entries.forEach(entry => {
        const { primary, value, note } = builder(entry);
        list.appendChild(createListItem(primary, value, note));
      });
    }

    column.appendChild(list);
    matrix.appendChild(column);
  }

  renderColumn('Assets', assetEntries, entry => {
    const setup = entry.setup
      ? `${entry.setup.days || 0}d · ${formatHours(entry.setup.hoursPerDay || 0)}/day`
      : null;
    const payout = entry.payoutRange
      ? `Est. $${formatMoney(entry.payoutRange.min || 0)}–$${formatMoney(entry.payoutRange.max || 0)}/day`
      : null;
    const readiness = entry.ready ? 'Ready to launch' : 'Prereqs pending';
    const noteParts = [readiness, payout, setup].filter(Boolean).slice(0, 2);
    return {
      primary: entry.name || 'Asset',
      value: formatCurrency(entry.cost || 0),
      note: noteParts.join(' · ')
    };
  });

  renderColumn('Upgrades', upgradeEntries, entry => {
    let status = 'Requirements pending';
    if (entry.purchased) {
      status = 'Owned';
    } else if (entry.ready) {
      status = 'Affordable now';
    } else if (!entry.affordable) {
      status = 'Save to unlock';
    }
    return {
      primary: entry.name || 'Upgrade',
      value: formatCurrency(entry.cost || 0),
      note: status
    };
  });

  renderColumn('Hustles', hustleEntries, entry => {
    const payout = Number(entry.payout) || 0;
    const time = Number(entry.time) || 0;
    const hourly = time > 0 ? `${formatMoney(Math.round((payout / time) * 100) / 100)} $/h` : '';
    const status = entry.status === 'available'
      ? 'Available now'
      : entry.status === 'upcoming'
        ? (entry.availableInDays === 0
          ? 'Unlocks today'
          : `Opens in ${entry.availableInDays}d`)
        : (entry.type === 'commitment' ? 'Active commitment' : entry.status || 'Queued');
    const noteParts = [status, hourly].filter(Boolean);
    return {
      primary: entry.name || 'Hustle',
      value: formatCurrency(payout),
      note: noteParts.join(' · ')
    };
  });

  body.appendChild(matrix);
  return section;
}


export default function renderFinance(context = {}, registries = {}, models = {}) {
  const page = getPageByType('finance');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    body.innerHTML = '';
    body.classList.add('bankapp');
  });
  if (!refs) return null;

  let financeModel = null;
  if (models && typeof models.finance === 'object' && models.finance !== null) {
    financeModel = models.finance;
  } else {
    console.warn('Finance view expected models.finance but it was missing. Rendering fallback view.');
  }

  const model = financeModel || {};

  const container = document.createElement('div');
  container.className = 'bankapp';

  if (model.header) {
    const headerModel = {
      ...model.header,
      metaSummary: model.summary?.meta || ''
    };
    container.appendChild(renderFinanceHeader(headerModel));
  }
  container.appendChild(renderFinanceLedger(model.ledger || {}));
  container.appendChild(renderFinanceObligations(model.obligations || {}, model.pendingIncome || []));
  container.appendChild(renderFinancePerformance(model.assetPerformance || []));
  container.appendChild(renderFinanceOpportunities(model.opportunities || {}));
  container.appendChild(renderFinanceEducation(model.education || []));
  container.appendChild(renderFinanceHistory(model.history || []));
  container.appendChild(renderFinanceActivity(model.activity || []));

  refs.body.appendChild(container);

  return {
    id: page.id,
    meta: model.summary?.meta || 'Finance dashboard ready'
  };
}
