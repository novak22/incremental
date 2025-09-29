import elements from './elements.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getAssetState, getState } from '../core/state.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance
} from '../game/assets/helpers.js';
import {
  describeRequirement,
  getDefinitionRequirements
} from '../game/requirements.js';
import {
  calculateInstanceNetHourly,
  describeInstance,
  describeInstanceEarnings,
  describeInstanceNetHourly
} from './assetInstances.js';
import {
  getPendingEquipmentUpgrades,
  getUpgradeButtonLabel,
  isUpgradeDisabled
} from './assetUpgrades.js';

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
  ['Asset', 'Upkeep', 'Last Payout', 'Net / Hour', 'Manage'].forEach(label => {
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

    const roiCell = document.createElement('td');
    const roi = document.createElement('span');
    roi.textContent = row.roi;
    if (row.roiPositive) {
      roi.className = 'asset-category__earnings';
    } else if (row.roiNegative) {
      roi.className = 'asset-category__loss';
    }
    roiCell.appendChild(roi);
    tr.appendChild(roiCell);

    const actionsCell = document.createElement('td');
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'asset-category__actions';

    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'ghost';
    detailsButton.textContent = 'Details';
    detailsButton.addEventListener('click', event => {
      event.preventDefault();
      if (typeof categoryState.openInstanceDetails === 'function') {
        categoryState.openInstanceDetails(row.definition, row.instance, detailsButton);
      }
    });
    actionsWrap.appendChild(detailsButton);

    const sellButton = document.createElement('button');
    sellButton.type = 'button';
    sellButton.className = 'secondary';
    const price = calculateAssetSalePrice(row.instance);
    sellButton.textContent = price > 0 ? `Sell ($${formatMoney(price)})` : 'Sell (no buyer)';
    sellButton.disabled = price <= 0;
    sellButton.addEventListener('click', event => {
      event.preventDefault();
      if (sellButton.disabled) return;
      sellAssetInstance(row.definition, row.instance.id);
    });
    actionsWrap.appendChild(sellButton);

    const upgradeShortcuts = createUpgradeShortcuts(row.pendingUpgrades);
    if (upgradeShortcuts) {
      actionsWrap.appendChild(upgradeShortcuts);
    }

    const upgradeHints = createUpgradeHints(row.definition, row.pendingUpgrades);
    if (upgradeHints) {
      actionsWrap.appendChild(upgradeHints);
    }

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
      const netHourly = calculateInstanceNetHourly(definition, instance);
      const pendingUpgrades = getPendingEquipmentUpgrades(definition, state);
      rows.push({
        definition,
        instance,
        label: instanceLabel(definition, index),
        status: describeInstance(definition, instance),
        upkeep: formatMaintenance(definition),
        payout: formatPayout(instance),
        payoutPositive: Math.max(0, Number(instance.lastIncome) || 0) > 0,
        roi: describeInstanceNetHourly(definition, instance),
        roiPositive: typeof netHourly === 'number' && netHourly > 0,
        roiNegative: typeof netHourly === 'number' && netHourly < 0,
        pendingUpgrades
      });
    });
  });
  return rows;
}

function createUpgradeShortcuts(upgrades = []) {
  if (!Array.isArray(upgrades) || upgrades.length === 0) {
    return null;
  }

  const limit = Math.min(upgrades.length, 2);
  if (limit <= 0) return null;

  const container = document.createElement('div');
  container.className = 'asset-category__upgrade-shortcuts';

  const title = document.createElement('span');
  title.className = 'asset-category__upgrade-title';
  title.textContent = limit > 1 ? 'Next upgrades' : 'Next upgrade';
  container.appendChild(title);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'asset-category__upgrade-buttons';
  container.appendChild(buttonRow);

  for (let index = 0; index < limit; index += 1) {
    const upgrade = upgrades[index];
    if (!upgrade) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-category__upgrade-button';
    button.dataset.upgradeId = upgrade.id;
    button.textContent = getUpgradeButtonLabel(upgrade);
    button.disabled = isUpgradeDisabled(upgrade);
    if (upgrade.description) {
      button.title = upgrade.description;
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      upgrade.action?.onClick?.();
    });
    buttonRow.appendChild(button);
  }

  const remaining = upgrades.length - limit;
  if (remaining > 0) {
    const more = document.createElement('span');
    more.className = 'asset-category__upgrade-more';
    more.textContent = `+${remaining} more upgrades`;
    container.appendChild(more);
  }

  return container;
}

function createUpgradeHints(definition, skipUpgrades = []) {
  if (!definition) return null;
  const requirements = getDefinitionRequirements(definition);
  if (!requirements?.hasAny) return null;

  const skipIds = new Set(
    Array.isArray(skipUpgrades)
      ? skipUpgrades.map(upgrade => upgrade?.id).filter(Boolean)
      : []
  );

  const highlights = requirements
    .filter(requirement => ['equipment', 'knowledge'].includes(requirement.type))
    .filter(requirement => !(requirement.type === 'equipment' && skipIds.has(requirement.id)))
    .map(requirement => ({
      requirement,
      description: describeRequirement(requirement)
    }));

  if (!highlights.length) return null;

  const container = document.createElement('div');
  container.className = 'asset-category__upgrade-hints';

  const title = document.createElement('span');
  title.className = 'asset-category__upgrade-title';
  title.textContent = 'Support boosts';
  container.appendChild(title);

  const limit = Math.min(highlights.length, 2);
  for (let index = 0; index < limit; index += 1) {
    const entry = highlights[index];
    const line = document.createElement('span');
    line.className = 'asset-category__upgrade-entry';
    if (entry.description.status === 'pending') {
      line.classList.add('is-pending');
    }
    line.innerHTML = entry.description.detail;
    container.appendChild(line);
  }

  if (highlights.length > limit) {
    const more = document.createElement('span');
    more.className = 'asset-category__upgrade-more';
    const remaining = highlights.length - limit;
    more.textContent = `+${remaining} more boosts`;
    container.appendChild(more);
  }

  return container;
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
