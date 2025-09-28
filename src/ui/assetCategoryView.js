import elements from './elements.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getAssetState, getState } from '../core/state.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance
} from '../game/assets/helpers.js';
import { describeInstance, describeInstanceEarnings } from './assetInstances.js';

const categoryState = {
  definitionsByCategory: new Map(),
  initialized: false,
  openCategories: new Set(),
  openInstanceDetails: null
};

export function configureCategoryView({ definitionsByCategory, openInstanceDetails }) {
  categoryState.definitionsByCategory = definitionsByCategory instanceof Map
    ? definitionsByCategory
    : new Map();
  if (typeof openInstanceDetails === 'function') {
    categoryState.openInstanceDetails = openInstanceDetails;
  }
  if (!categoryState.initialized) {
    initCategoryToggles();
    categoryState.initialized = true;
  }
  refreshCategoryToggles();
}

export function updateCategoryView() {
  for (const key of categoryState.openCategories) {
    renderCategoryList(key);
  }
}

function initCategoryToggles() {
  const toggles = elements.assetCategoryToggles || {};
  for (const [key, button] of Object.entries(toggles)) {
    if (!button) continue;
    button.addEventListener('click', () => {
      toggleCategory(key);
    });
  }
}

function toggleCategory(key) {
  if (categoryState.openCategories.has(key)) {
    categoryState.openCategories.delete(key);
  } else {
    categoryState.openCategories.add(key);
  }
  updateCategoryToggle(key);
}

function refreshCategoryToggles() {
  const toggles = elements.assetCategoryToggles || {};
  for (const key of Object.keys(toggles)) {
    updateCategoryToggle(key);
  }
}

function updateCategoryToggle(key) {
  const button = elements.assetCategoryToggles?.[key];
  const container = elements.assetCategoryLists?.[key];
  const open = categoryState.openCategories.has(key);
  if (button) {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.textContent = open ? 'Hide launched assets' : 'View launched assets';
  }
  if (container) {
    container.hidden = !open;
    if (open) {
      renderCategoryList(key);
    } else {
      container.innerHTML = '';
    }
  }
}

function renderCategoryList(key) {
  const container = elements.assetCategoryLists?.[key];
  if (!container) return;
  container.innerHTML = '';
  const definitions = categoryState.definitionsByCategory.get(key) || [];
  const rows = buildInstanceRows(definitions);
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-category__empty';
    empty.textContent = 'No launched assets in this category yet.';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'asset-category__table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Asset', 'Upkeep', 'Last Payout', 'Manage'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'asset-category__name';
    const strong = document.createElement('strong');
    strong.textContent = row.label;
    const status = document.createElement('span');
    status.className = 'asset-category__status';
    status.textContent = row.status;
    nameWrap.append(strong, status);
    nameCell.appendChild(nameWrap);
    tr.appendChild(nameCell);

    const upkeepCell = document.createElement('td');
    const upkeepWrap = document.createElement('div');
    upkeepWrap.className = 'asset-category__upkeep';
    row.upkeep.forEach(part => {
      const line = document.createElement('span');
      line.textContent = part;
      upkeepWrap.appendChild(line);
    });
    if (!row.upkeep.length) {
      const none = document.createElement('span');
      none.textContent = 'None';
      upkeepWrap.appendChild(none);
    }
    upkeepCell.appendChild(upkeepWrap);
    tr.appendChild(upkeepCell);

    const payoutCell = document.createElement('td');
    const payout = document.createElement('span');
    payout.textContent = row.payout;
    if (row.payoutPositive) {
      payout.className = 'asset-category__earnings';
    }
    payoutCell.appendChild(payout);
    tr.appendChild(payoutCell);

    const actionsCell = document.createElement('td');
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'asset-category__actions';

    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.textContent = 'Details';
    detailsButton.addEventListener('click', event => {
      event.preventDefault();
      if (typeof categoryState.openInstanceDetails === 'function') {
        categoryState.openInstanceDetails(row.definition, row.instance, detailsButton);
      }
    });
    actionsWrap.appendChild(detailsButton);

    const upgradeButton = document.createElement('button');
    upgradeButton.type = 'button';
    upgradeButton.textContent = 'Upgrade';
    const openQuality = row.definition?.ui?.extra?.openQuality;
    const upgradeDisabled = row.instance.status !== 'active' || typeof openQuality !== 'function';
    upgradeButton.disabled = upgradeDisabled;
    upgradeButton.addEventListener('click', event => {
      event.preventDefault();
      if (upgradeButton.disabled) return;
      openQuality(row.instance.id);
    });
    actionsWrap.appendChild(upgradeButton);

    const sellButton = document.createElement('button');
    sellButton.type = 'button';
    const price = calculateAssetSalePrice(row.instance);
    sellButton.textContent = price > 0 ? `Sell ($${formatMoney(price)})` : 'Sell (no buyer)';
    sellButton.disabled = price <= 0;
    sellButton.addEventListener('click', event => {
      event.preventDefault();
      if (sellButton.disabled) return;
      sellAssetInstance(row.definition, row.instance.id);
    });
    actionsWrap.appendChild(sellButton);

    actionsCell.appendChild(actionsWrap);
    tr.appendChild(actionsCell);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function buildInstanceRows(definitions) {
  const rows = [];
  const state = getState();
  definitions.forEach(definition => {
    const assetState = getAssetState(definition.id, state);
    const instances = assetState?.instances || [];
    instances.forEach((instance, index) => {
      rows.push({
        definition,
        instance,
        label: instanceLabel(definition, index),
        status: describeInstance(definition, instance),
        upkeep: formatMaintenance(definition),
        payout: formatPayout(instance),
        payoutPositive: Math.max(0, Number(instance.lastIncome) || 0) > 0
      });
    });
  });
  return rows;
}

function formatMaintenance(definition) {
  const hours = Number(definition.maintenance?.hours) || 0;
  const cost = Number(definition.maintenance?.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return parts;
}

function formatPayout(instance) {
  const text = describeInstanceEarnings(instance);
  return text.replace(/^💰\s*/, '').replace(/^💤\s*/, '');
}
