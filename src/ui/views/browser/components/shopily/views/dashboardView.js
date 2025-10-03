import { ensureArray } from '../../../../../../core/helpers.js';
import renderMetrics from '../metrics.js';
import createStoreDetail from '../storeDetail.js';

function formatNicheDelta(delta, formatPercent) {
  if (delta === null || delta === undefined) return '';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  const icon = numeric > 0 ? '⬆️' : '⬇️';
  return `${icon} ${Math.abs(Math.round(numeric * 100))}%`;
}

export function renderHero(model, dependencies = {}) {
  const { formatters = {}, createLaunchButton = () => document.createElement('button') } = dependencies;

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
  hero.append(body, renderMetrics(model.metrics, formatters));
  return hero;
}

export function renderStoreTable(instances = [], state = {}, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatPercent = value => String(value ?? ''),
    onSelectStore = () => {},
    onShowUpgradesForStore = () => {}
  } = dependencies;

  const table = document.createElement('table');
  table.className = 'shopily-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Store', 'Niche', 'Daily Earnings', 'Upkeep', 'ROI', 'Actions'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!instances.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'shopily-table__empty';
    cell.textContent = 'No stores yet. Launch your first shop to start capturing daily sales.';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
  } else {
    instances.forEach(instance => {
      const row = document.createElement('tr');
      row.dataset.storeId = instance.id;
      if (instance.id === state.selectedStoreId) {
        row.classList.add('is-selected');
      }
      row.addEventListener('click', () => onSelectStore(instance.id));

      const nameCell = document.createElement('td');
      nameCell.className = 'shopily-table__cell--label';
      nameCell.textContent = instance.label;

      const nicheCell = document.createElement('td');
      if (instance.niche) {
        const nicheWrap = document.createElement('div');
        nicheWrap.className = 'shopily-niche';
        const nicheName = document.createElement('strong');
        nicheName.className = 'shopily-niche__name';
        nicheName.textContent = instance.niche.name;
        const nicheTrend = document.createElement('span');
        nicheTrend.className = 'shopily-niche__trend';
        const delta = formatNicheDelta(instance.niche.delta, formatPercent);
        nicheTrend.textContent = delta || `${formatPercent(instance.niche.multiplier - 1)} boost`;
        nicheWrap.append(nicheName, nicheTrend);
        nicheCell.appendChild(nicheWrap);
      } else {
        nicheCell.textContent = 'Unassigned';
      }

      const earningsCell = document.createElement('td');
      earningsCell.textContent = formatCurrency(instance.latestPayout || 0);

      const upkeepCell = document.createElement('td');
      upkeepCell.textContent = formatCurrency(instance.maintenanceCost || 0);

      const roiCell = document.createElement('td');
      roiCell.textContent = formatPercent(instance.roi);

      const actionCell = document.createElement('td');
      actionCell.className = 'shopily-table__cell--actions';
      const upgradeButton = document.createElement('button');
      upgradeButton.type = 'button';
      upgradeButton.className = 'shopily-button shopily-button--ghost';
      upgradeButton.textContent = 'Upgrade Store';
      upgradeButton.addEventListener('click', event => {
        event.stopPropagation();
        onShowUpgradesForStore(instance.id);
      });
      const detailButton = document.createElement('button');
      detailButton.type = 'button';
      detailButton.className = 'shopily-button shopily-button--link';
      detailButton.textContent = 'View Details';
      detailButton.addEventListener('click', event => {
        event.stopPropagation();
        onSelectStore(instance.id);
      });
      actionCell.append(upgradeButton, detailButton);

      row.append(nameCell, nicheCell, earningsCell, upkeepCell, roiCell, actionCell);
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
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
  const selectedStore = selectors.getSelectedStore ? selectors.getSelectedStore(state, model) : null;
  grid.append(
    renderStoreTable(ensureArray(model.instances), state, {
      formatCurrency: formatters.formatCurrency,
      formatPercent: formatters.formatPercent,
      onSelectStore: handlers.onSelectStore,
      onShowUpgradesForStore: handlers.onShowUpgradesForStore
    }),
    createStoreDetail(selectedStore, {
      formatCurrency: formatters.formatCurrency,
      formatSignedCurrency: formatters.formatSignedCurrency,
      formatPercent: formatters.formatPercent,
      formatHours: formatters.formatHours,
      onRunAction: handlers.onRunAction,
      onSelectNiche: handlers.onSelectNiche
    })
  );
  container.appendChild(grid);

  return container;
}
