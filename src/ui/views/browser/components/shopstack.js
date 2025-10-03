import { formatMoney, ensureArray } from '../../../../core/helpers.js';
import {
  getAssetDefinition,
  getAssetState,
  getState,
  getUpgradeState
} from '../../../../core/state.js';

const VIEW_CATALOG = 'catalog';
const VIEW_PURCHASES = 'purchases';
const VIEW_PRICING = 'pricing';

const EXCLUDED_UPGRADES = new Set(['fulfillmentAutomation', 'globalSupplyMesh', 'whiteLabelAlliance']);

let uiState = {
  view: VIEW_CATALOG,
  search: '',
  category: 'all',
  selectedItemId: null
};

let currentModel = { categories: [], overview: {} };
let currentDefinitions = new Map();
let currentMount = null;
let currentPage = null;

function setState(partial) {
  const nextState = { ...uiState, ...partial };
  let changed = false;
  for (const key of Object.keys(nextState)) {
    if (nextState[key] !== uiState[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  uiState = nextState;
  ensureSelectedItem();
  renderApp();
}

function formatPrice(amount = 0) {
  const numeric = Number(amount) || 0;
  return `$${formatMoney(Math.max(0, Math.round(numeric)))}`;
}

function formatKeyLabel(key) {
  if (!key) return '';
  return key
    .toString()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

function describeTargetScope(scope) {
  if (!scope || typeof scope !== 'object') return '';
  const tags = ensureArray(scope.tags).map(tag => `#${tag}`);
  const ids = ensureArray(scope.ids);
  const families = ensureArray(scope.families).map(formatKeyLabel);
  const categories = ensureArray(scope.categories).map(formatKeyLabel);
  const fragments = [];
  if (ids.length) fragments.push(ids.join(', '));
  if (families.length) fragments.push(`${families.join(', ')} family`);
  if (categories.length) fragments.push(`${categories.join(', ')} category`);
  if (tags.length) fragments.push(tags.join(', '));
  return fragments.join(' • ');
}

function describeEffectSummary(definition = {}) {
  const effects = definition.effects || {};
  const affects = definition.affects || {};
  const parts = [];

  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% maintenance speed`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality progress`;
        break;
      default:
        label = `${formatKeyLabel(effect)}: ${numeric}`;
    }
    const targetParts = [];
    const assetScope = describeTargetScope(affects.assets);
    if (assetScope) targetParts.push(`assets (${assetScope})`);
    const hustleScope = describeTargetScope(affects.hustles);
    if (hustleScope) targetParts.push(`hustles (${hustleScope})`);
    const actionScope = ensureArray(affects.actions?.types);
    if (actionScope.length) {
      targetParts.push(`actions (${actionScope.join(', ')})`);
    }
    const summary = targetParts.length ? `${label} → ${targetParts.join(' & ')}` : label;
    parts.push(summary);
  });

  return parts.join(' • ');
}

function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

function formatSlotMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

function stripHtml(value) {
  if (typeof value !== 'string') {
    if (typeof Node !== 'undefined' && value instanceof Node) {
      return value.textContent || '';
    }
    return '';
  }
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.textContent || '';
}

function isRequirementMet(requirement) {
  if (!requirement) return true;
  switch (requirement.type) {
    case 'upgrade':
      return Boolean(getUpgradeState(requirement.id)?.purchased);
    case 'asset': {
      const assetState = getAssetState(requirement.id);
      const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
      if (requirement.active) {
        return instances.filter(instance => instance?.status === 'active').length >= Number(requirement.count || 1);
      }
      return instances.length >= Number(requirement.count || 1);
    }
    case 'custom':
      return requirement.met ? requirement.met() : true;
    default:
      return true;
  }
}

function formatRequirementHtml(requirement) {
  if (!requirement) return 'Requires: <strong>Prerequisites</strong>';
  if (requirement.detail) return requirement.detail;
  switch (requirement.type) {
    case 'upgrade': {
      const upgrade = currentDefinitions.get(requirement.id);
      const label = upgrade?.name || formatKeyLabel(requirement.id);
      return `Requires: <strong>${label}</strong>`;
    }
    case 'asset': {
      const asset = getAssetDefinition(requirement.id);
      const label = asset?.singular || asset?.name || formatKeyLabel(requirement.id);
      const count = Number(requirement.count || 1);
      const adjective = requirement.active ? 'active ' : '';
      return `Requires: <strong>${count} ${adjective}${label}${count === 1 ? '' : 's'}</strong>`;
    }
    default:
      return 'Requires: <strong>Prerequisites</strong>';
  }
}

function getRequirementEntries(definition) {
  const requirements = ensureArray(definition?.requirements);
  return requirements.map(requirement => ({
    html: formatRequirementHtml(requirement),
    met: isRequirementMet(requirement)
  }));
}

function collectDetailStrings(definition) {
  const details = ensureArray(definition?.details);
  return details
    .map(detail => {
      if (typeof detail === 'function') {
        try {
          return detail(definition);
        } catch (error) {
          return '';
        }
      }
      return detail;
    })
    .filter(Boolean);
}

function describeStatus(snapshot = {}) {
  if (snapshot.purchased) {
    return { label: 'Owned', tone: 'owned', description: 'Already installed and active.' };
  }
  if (snapshot.ready) {
    return { label: 'Ready to buy', tone: 'ready', description: 'Cash on hand and prerequisites met.' };
  }
  if (!snapshot.affordable) {
    return { label: 'Save up', tone: 'unaffordable', description: 'Stack more cash to unlock this upgrade.' };
  }
  if (snapshot.disabled) {
    return { label: 'Locked', tone: 'locked', description: 'Meet the prerequisites to make this available.' };
  }
  return { label: 'Unavailable', tone: 'locked', description: 'Check requirements to unlock.' };
}

function createBadge(label, tone = 'default') {
  if (!label) return null;
  const badge = document.createElement('span');
  badge.className = `shopstack-badge shopstack-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `shopstack-status shopstack-status--${status.tone}`;
  badge.textContent = status.label;
  badge.title = status.description;
  return badge;
}

function isExcludedUpgrade(id) {
  return EXCLUDED_UPGRADES.has(id);
}

function getAllItems() {
  const items = [];
  const categories = Array.isArray(currentModel.categories) ? currentModel.categories : [];
  categories.forEach(category => {
    const families = Array.isArray(category.families) ? category.families : [];
    families.forEach(family => {
      const definitions = Array.isArray(family.definitions) ? family.definitions : [];
      definitions.forEach(model => {
        const definition = currentDefinitions.get(model.id);
        if (!definition) return;
        if (isExcludedUpgrade(model.id)) return;
        items.push({ category, family, model, definition });
      });
    });
  });
  return items;
}

function getVisibleOverview() {
  return getAllItems().reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.model?.snapshot?.purchased) acc.purchased += 1;
      if (item.model?.snapshot?.ready) acc.ready += 1;
      return acc;
    },
    { purchased: 0, ready: 0, total: 0 }
  );
}

function getFilteredItems() {
  const query = uiState.search.trim().toLowerCase();
  const categoryFilter = uiState.category;
  return getAllItems().filter(item => {
    if (categoryFilter !== 'all' && item.category?.id !== categoryFilter) {
      return false;
    }
    if (query) {
      const haystack = `${item.model.filters?.search || ''} ${item.model.name || ''}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

function ensureSelectedItem() {
  if (uiState.view !== VIEW_CATALOG) return;
  const items = getFilteredItems();
  if (!items.length) {
    uiState.selectedItemId = null;
    return;
  }
  if (!items.some(item => item.model.id === uiState.selectedItemId)) {
    uiState.selectedItemId = items[0].model.id;
  }
}

function handleCardSelection(id) {
  if (!id) return;
  setState({ selectedItemId: id, view: VIEW_CATALOG });
}

function handleBuy(definition, button) {
  if (!definition?.action) return;
  if (button) {
    button.disabled = true;
  }
  try {
    definition.action.onClick?.();
  } finally {
    renderApp();
  }
}

function buildCard(item) {
  const { model, definition, category, family } = item;
  const status = describeStatus(model.snapshot || {});
  const card = document.createElement('article');
  card.className = 'shopstack-card';
  card.dataset.upgradeId = model.id;
  card.dataset.upgrade = model.id;
  if (status.tone === 'owned') card.classList.add('is-owned');
  if (status.tone === 'locked') card.classList.add('is-locked');
  if (status.tone === 'unaffordable') card.classList.add('is-unaffordable');
  if (uiState.selectedItemId === model.id) card.classList.add('is-active');
  card.tabIndex = 0;

  card.addEventListener('click', event => {
    if (event.target.closest('.shopstack-card__buy')) return;
    handleCardSelection(model.id);
  });
  card.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardSelection(model.id);
    }
  });

  const header = document.createElement('header');
  header.className = 'shopstack-card__header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'shopstack-card__titleblock';

  const title = document.createElement('h3');
  title.className = 'shopstack-card__title';
  title.textContent = model.name;
  headerLeft.appendChild(title);

  const metaRow = document.createElement('div');
  metaRow.className = 'shopstack-card__meta';
  const tagBadge = createBadge(model.tag?.label, model.tag?.type || 'default');
  if (tagBadge) {
    metaRow.appendChild(tagBadge);
  }
  const categoryBadge = createBadge(category?.copy?.label, 'category');
  if (categoryBadge) {
    metaRow.appendChild(categoryBadge);
  }
  const familyBadge = createBadge(family?.copy?.label, 'family');
  if (familyBadge) {
    metaRow.appendChild(familyBadge);
  }
  if (metaRow.children.length) {
    headerLeft.appendChild(metaRow);
  }

  header.appendChild(headerLeft);
  header.appendChild(createStatusBadge(status));

  const description = document.createElement('p');
  description.className = 'shopstack-card__description';
  description.textContent = model.description || 'Preview the perks this upgrade unlocks.';

  const price = document.createElement('p');
  price.className = 'shopstack-card__price';
  price.textContent = formatPrice(model.cost);

  const highlights = document.createElement('ul');
  highlights.className = 'shopstack-card__highlights';

  const effectSummary = describeEffectSummary(definition);
  if (effectSummary) {
    const effectItem = document.createElement('li');
    effectItem.textContent = `Bonus: ${effectSummary}`;
    highlights.appendChild(effectItem);
  }

  const requirementEntries = getRequirementEntries(definition);
  if (requirementEntries.length) {
    const requirementItem = document.createElement('li');
    const unmet = requirementEntries.filter(entry => !entry.met).length;
    const requirementText = requirementEntries
      .map(entry => stripHtml(entry.html).replace(/^Requires:\s*/i, '').trim())
      .join(' • ');
    requirementItem.textContent = unmet
      ? `Needs: ${requirementText}`
      : `Ready: ${requirementText}`;
    highlights.appendChild(requirementItem);
  }

  const actions = document.createElement('div');
  actions.className = 'shopstack-card__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopstack-button shopstack-card__buy';
  if (status.tone === 'owned') {
    button.textContent = 'Owned';
    button.disabled = true;
  } else if (status.tone === 'ready') {
    button.textContent = 'Buy now';
  } else if (status.tone === 'unaffordable') {
    button.textContent = 'Save up';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    handleBuy(definition, button);
  });

  actions.appendChild(button);

  card.append(header, description, price, highlights, actions);
  return card;
}

function buildCatalogToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'shopstack-toolbar';

  const search = document.createElement('div');
  search.className = 'shopstack-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search ShopStack inventory';
  searchInput.value = uiState.search;
  searchInput.addEventListener('input', event => {
    setState({ search: event.target.value });
  });

  const searchIcon = document.createElement('span');
  searchIcon.className = 'shopstack-search__icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '🔍';

  search.append(searchIcon, searchInput);

  const categories = document.createElement('div');
  categories.className = 'shopstack-categories';

  const makeCategoryButton = (id, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopstack-chip';
    if (uiState.category === id) {
      button.classList.add('is-active');
    }
    button.textContent = label;
    button.addEventListener('click', () => {
      setState({ category: id });
    });
    return button;
  };

  categories.appendChild(makeCategoryButton('all', 'All categories'));
  const categoryList = Array.isArray(currentModel.categories) ? currentModel.categories : [];
  categoryList.forEach(category => {
    categories.appendChild(makeCategoryButton(category.id, category.copy?.label || formatKeyLabel(category.id)));
  });

  toolbar.append(search, categories);
  return toolbar;
}

function buildCatalogView() {
  const container = document.createElement('section');
  container.className = 'shopstack-catalog';

  container.appendChild(buildCatalogToolbar());

  const items = getFilteredItems();
  const grid = document.createElement('div');
  grid.className = 'shopstack-grid';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'shopstack-empty';
    empty.textContent = 'No upgrades match that filter. Clear a search or finish prerequisites to see more stock.';
    grid.appendChild(empty);
  } else {
    items.forEach(item => {
      grid.appendChild(buildCard(item));
    });
  }

  container.appendChild(grid);
  return container;
}

function describeAffordability(model) {
  const snapshot = model.snapshot || {};
  if (snapshot.purchased) return 'Already installed.';
  if (snapshot.ready) return 'You can afford this upgrade right now.';
  if (!snapshot.affordable) {
    const state = getState();
    const balance = Number(state?.money) || 0;
    const deficit = Math.max(0, Number(model.cost || 0) - balance);
    return `Need $${formatMoney(deficit)} more to check out.`;
  }
  if (snapshot.disabled) return 'Meet the prerequisites to unlock checkout.';
  return 'Unavailable until conditions are met.';
}

function buildRequirementList(requirementEntries) {
  const list = document.createElement('ul');
  list.className = 'shopstack-detail__requirements';
  if (!requirementEntries.length) {
    const item = document.createElement('li');
    item.className = 'shopstack-detail__requirement is-met';
    item.textContent = 'No prerequisites — ready when you are!';
    list.appendChild(item);
    return list;
  }
  requirementEntries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'shopstack-detail__requirement';
    if (entry.met) {
      item.classList.add('is-met');
    }
    const icon = document.createElement('span');
    icon.className = 'shopstack-detail__requirement-icon';
    icon.textContent = entry.met ? '✓' : '•';
    const text = document.createElement('span');
    text.className = 'shopstack-detail__requirement-text';
    text.innerHTML = entry.html;
    item.append(icon, text);
    list.appendChild(item);
  });
  return list;
}

function buildHighlights(definition) {
  const highlights = document.createElement('ul');
  highlights.className = 'shopstack-detail__highlights';

  const effectSummary = describeEffectSummary(definition);
  if (effectSummary) {
    const effectItem = document.createElement('li');
    effectItem.innerHTML = `<strong>Bonus:</strong> ${effectSummary}`;
    highlights.appendChild(effectItem);
  }

  if (definition.provides) {
    const providesItem = document.createElement('li');
    providesItem.innerHTML = `<strong>Provides slots:</strong> ${formatSlotMap(definition.provides)}`;
    highlights.appendChild(providesItem);
  }

  if (definition.consumes) {
    const consumesItem = document.createElement('li');
    consumesItem.innerHTML = `<strong>Consumes slots:</strong> ${formatSlotMap(definition.consumes)}`;
    highlights.appendChild(consumesItem);
  }

  if (definition.unlocks) {
    const unlockItem = document.createElement('li');
    unlockItem.innerHTML = `<strong>Unlocks:</strong> ${definition.unlocks}`;
    highlights.appendChild(unlockItem);
  }

  if (definition.boosts) {
    const boostItem = document.createElement('li');
    boostItem.innerHTML = `<strong>Boosts:</strong> ${definition.boosts}`;
    highlights.appendChild(boostItem);
  }

  return highlights;
}

function buildDetailView() {
  const container = document.createElement('aside');
  container.className = 'shopstack-detail';

  const selected = getAllItems().find(item => item.model.id === uiState.selectedItemId);
  if (!selected) {
    const empty = document.createElement('div');
    empty.className = 'shopstack-detail__empty';
    empty.innerHTML = '<strong>Select a product</strong><p>Browse the catalog to see specs, prerequisites, and instant bonuses.</p>';
    container.appendChild(empty);
    return container;
  }

  const { model, definition, category, family } = selected;
  const status = describeStatus(model.snapshot || {});

  const header = document.createElement('header');
  header.className = 'shopstack-detail__header';

  const breadcrumbs = document.createElement('p');
  breadcrumbs.className = 'shopstack-detail__breadcrumbs';
  const pieces = [category?.copy?.label, family?.copy?.label].filter(Boolean);
  breadcrumbs.textContent = pieces.length ? pieces.join(' • ') : 'ShopStack';

  const title = document.createElement('h2');
  title.className = 'shopstack-detail__title';
  title.textContent = model.name;

  const tagline = document.createElement('p');
  tagline.className = 'shopstack-detail__tagline';
  tagline.textContent = model.description || 'This upgrade keeps your momentum flying.';

  header.append(breadcrumbs, title, tagline);

  const priceRow = document.createElement('div');
  priceRow.className = 'shopstack-detail__price-row';

  const price = document.createElement('span');
  price.className = 'shopstack-detail__price';
  price.textContent = formatPrice(model.cost);

  const affordability = document.createElement('span');
  affordability.className = 'shopstack-detail__affordability';
  affordability.textContent = describeAffordability(model);

  priceRow.append(price, affordability);

  const statusRow = document.createElement('div');
  statusRow.className = 'shopstack-detail__status-row';
  statusRow.appendChild(createStatusBadge(status));

  const requirementEntries = getRequirementEntries(definition);
  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'shopstack-detail__section';
  const reqHeading = document.createElement('h3');
  reqHeading.textContent = 'Prerequisites';
  requirementsSection.append(reqHeading, buildRequirementList(requirementEntries));

  const highlightsSection = document.createElement('section');
  highlightsSection.className = 'shopstack-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'What this gives you';
  highlightsSection.append(highlightsHeading, buildHighlights(definition));

  const specSection = document.createElement('section');
  specSection.className = 'shopstack-detail__section';
  const specHeading = document.createElement('h3');
  specHeading.textContent = 'Deep dive';
  const specList = document.createElement('ul');
  specList.className = 'shopstack-detail__specs';
  collectDetailStrings(definition).forEach(entry => {
    const item = document.createElement('li');
    if (typeof Node !== 'undefined' && entry instanceof Node) {
      item.appendChild(entry);
    } else {
      item.innerHTML = entry;
    }
    specList.appendChild(item);
  });
  if (!specList.children.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional notes—install and enjoy the boost!';
    specList.appendChild(item);
  }
  specSection.append(specHeading, specList);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'shopstack-button shopstack-button--primary shopstack-detail__cta';
  if (status.tone === 'owned') {
    cta.textContent = 'Owned and active';
    cta.disabled = true;
  } else if (status.tone === 'ready') {
    cta.textContent = 'Buy now';
  } else if (status.tone === 'unaffordable') {
    cta.textContent = 'Save up to buy';
    cta.disabled = true;
  } else {
    cta.textContent = 'Locked';
    cta.disabled = true;
  }
  cta.addEventListener('click', () => {
    if (cta.disabled) return;
    handleBuy(definition, cta);
  });

  container.append(header, priceRow, statusRow, cta, highlightsSection, requirementsSection, specSection);
  return container;
}

function isRepeatableOwned(definition, upgradeState = {}) {
  if (!definition?.repeatable) return false;
  const count = Number(upgradeState.count);
  return Number.isFinite(count) && count > 0;
}

function collectPurchases() {
  const state = getState();
  const purchases = [];
  getAllItems().forEach(item => {
    const snapshot = item.model.snapshot || {};
    const upgradeState = getUpgradeState(item.model.id, state) || {};
    if (snapshot.purchased || isRepeatableOwned(item.definition, upgradeState)) {
      purchases.push({ ...item, snapshot, upgradeState });
    }
  });
  purchases.sort((a, b) => {
    const dayA = Number(a.upgradeState?.purchasedDay);
    const dayB = Number(b.upgradeState?.purchasedDay);
    if (!Number.isFinite(dayA) && !Number.isFinite(dayB)) return a.model.name.localeCompare(b.model.name);
    if (!Number.isFinite(dayA)) return 1;
    if (!Number.isFinite(dayB)) return -1;
    return dayA - dayB;
  });
  return purchases;
}

function describePurchaseDay(upgradeState) {
  const day = Number(upgradeState?.purchasedDay);
  if (Number.isFinite(day) && day > 0) {
    return `Purchased: Day ${day}`;
  }
  return 'Purchased earlier this run';
}

function describeUpkeep(highlights) {
  const upkeep = highlights.find(text => /payroll|per day|upkeep|subscription|daily limit/i.test(text));
  return upkeep || null;
}

function buildPurchasesView() {
  const container = document.createElement('section');
  container.className = 'shopstack-purchases';

  const purchases = collectPurchases();
  if (!purchases.length) {
    const empty = document.createElement('div');
    empty.className = 'shopstack-empty';
    empty.textContent = 'No upgrades owned yet. Grab a boost from the catalog to see it listed here.';
    container.appendChild(empty);
    return container;
  }

  purchases.forEach(purchase => {
    const { model, definition, upgradeState } = purchase;
    const card = document.createElement('article');
    card.className = 'shopstack-purchase';

    const header = document.createElement('header');
    header.className = 'shopstack-purchase__header';

    const title = document.createElement('h3');
    title.className = 'shopstack-purchase__title';
    title.textContent = model.name;

    const badge = document.createElement('span');
    badge.className = 'shopstack-status shopstack-status--owned';
    badge.textContent = 'Owned';

    header.append(title, badge);

    const meta = document.createElement('p');
    meta.className = 'shopstack-purchase__meta';
    meta.textContent = describePurchaseDay(upgradeState);

    const effectSummary = describeEffectSummary(definition);
    const highlights = collectDetailStrings(definition).map(entry => stripHtml(entry));
    const upkeepSummary = describeUpkeep(highlights);

    const summaryList = document.createElement('ul');
    summaryList.className = 'shopstack-purchase__highlights';

    if (effectSummary) {
      const effectItem = document.createElement('li');
      effectItem.textContent = `Bonus: ${effectSummary}`;
      summaryList.appendChild(effectItem);
    }

    if (upkeepSummary) {
      const upkeepItem = document.createElement('li');
      upkeepItem.textContent = `Upkeep: ${upkeepSummary}`;
      summaryList.appendChild(upkeepItem);
    }

    if (definition.repeatable && Number(upgradeState?.count || 0) > 0) {
      const countItem = document.createElement('li');
      countItem.textContent = `Active hires: ${upgradeState.count}`;
      summaryList.appendChild(countItem);
    }

    if (!summaryList.children.length) {
      const fallback = document.createElement('li');
      fallback.textContent = 'Perks active — keep the hours funded to enjoy the benefits.';
      summaryList.appendChild(fallback);
    }

    const description = document.createElement('p');
    description.className = 'shopstack-purchase__description';
    description.textContent = model.description || 'Active bonus humming along.';

    card.append(header, meta, description, summaryList);
    container.appendChild(card);
  });

  return container;
}

function buildPricingView() {
  const container = document.createElement('section');
  container.className = 'shopstack-pricing';

  const intro = document.createElement('div');
  intro.className = 'shopstack-pricing__intro';
  intro.innerHTML = '<h3>How checkout works</h3><p>ShopStack pulls live pricing, requirements, and effects from the core upgrade systems. Buying an item deducts cash instantly and applies the bonus without extra clicks.</p>';

  const faqList = document.createElement('dl');
  faqList.className = 'shopstack-pricing__faq';

  const entries = [
    {
      question: 'What happens after I buy something?',
      answer:
        'Upgrades activate immediately and the classic backend handles every bonus, slot change, or automation effect. No additional confirmation screens required.'
    },
    {
      question: 'Why are some items greyed out?',
      answer:
        'Grey items need more progress—either save up cash or complete the listed prerequisites. Once the requirement is met, the tile will light up and the Buy button unlocks.'
    },
    {
      question: 'Do assistants and boosts show ongoing costs?',
      answer:
        'Yes! Owned upgrades appear in the My Purchases tab with payroll, upkeep, or daily limits highlighted so you know what to fund tomorrow.'
    }
  ];

  entries.forEach(entry => {
    const term = document.createElement('dt');
    term.textContent = entry.question;
    const definition = document.createElement('dd');
    definition.textContent = entry.answer;
    faqList.append(term, definition);
  });

  container.append(intro, faqList);
  return container;
}

function buildHeader() {
  const header = document.createElement('div');
  header.className = 'shopstack__header';

  const titleRow = document.createElement('div');
  titleRow.className = 'shopstack__title-row';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'shopstack__title-block';

  const heading = document.createElement('h1');
  heading.className = 'shopstack__title';
  heading.textContent = currentPage?.headline || 'ShopStack Platform';

  const note = document.createElement('p');
  note.className = 'shopstack__note';
  note.textContent = currentPage?.tagline || 'Browse upgrades, compare bonuses, and fuel your next spike.';

  titleBlock.append(heading, note);

  const summary = document.createElement('div');
  summary.className = 'shopstack-summary';
  const overview = getVisibleOverview();
  const purchased = Number(overview.purchased || 0);
  const ready = Number(overview.ready || 0);
  const total = Number(overview.total || 0);

  const summaryEntries = [
    `${total} item${total === 1 ? '' : 's'} tracked`,
    `${purchased} owned`,
    ready > 0 ? `${ready} ready to buy` : 'Browse upcoming unlocks'
  ];
  summary.textContent = summaryEntries.join(' • ');

  titleRow.append(titleBlock, summary);

  const nav = document.createElement('nav');
  nav.className = 'shopstack-nav';

  const makeTab = (id, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopstack-tab';
    if (uiState.view === id) {
      button.classList.add('is-active');
    }
    button.textContent = label;
    button.addEventListener('click', () => {
      setState({ view: id });
    });
    return button;
  };

  nav.append(
    makeTab(VIEW_CATALOG, 'Catalog'),
    makeTab(VIEW_PURCHASES, 'My Purchases'),
    makeTab(VIEW_PRICING, 'Pricing FAQ')
  );

  header.append(titleRow, nav);
  return header;
}

function renderCatalogStage(content) {
  const layout = document.createElement('div');
  layout.className = 'shopstack__layout';
  layout.append(buildCatalogView(), buildDetailView());
  content.appendChild(layout);
}

function renderPurchasesStage(content) {
  content.appendChild(buildPurchasesView());
}

function renderPricingStage(content) {
  content.appendChild(buildPricingView());
}

function renderApp() {
  if (!currentMount) return;
  let root = currentMount.querySelector('.shopstack');
  if (!root) {
    root = document.createElement('div');
    root.className = 'shopstack';
    currentMount.innerHTML = '';
    currentMount.appendChild(root);
  }
  root.innerHTML = '';
  root.dataset.view = uiState.view;

  root.appendChild(buildHeader());

  const content = document.createElement('div');
  content.className = 'shopstack__content';

  if (uiState.view === VIEW_CATALOG) {
    renderCatalogStage(content);
  } else if (uiState.view === VIEW_PURCHASES) {
    renderPurchasesStage(content);
  } else {
    renderPricingStage(content);
  }

  root.appendChild(content);
}

function computeMeta() {
  const overview = getVisibleOverview();
  const ready = Number(overview.ready || 0);
  const purchased = Number(overview.purchased || 0);
  if (ready > 0) {
    return `${ready} upgrade${ready === 1 ? '' : 's'} ready`;
  }
  if (purchased > 0) {
    return `${purchased} owned`; 
  }
  return 'Browse premium upgrades';
}

function render(model = {}, options = {}) {
  currentModel = model || { categories: [], overview: {} };
  if (Array.isArray(options.definitions)) {
    currentDefinitions = new Map(options.definitions.map(definition => [definition.id, definition]));
  }
  if (options.mount) {
    currentMount = options.mount;
  }
  if (options.page) {
    currentPage = options.page;
  }

  ensureSelectedItem();
  renderApp();

  return { meta: computeMeta() };
}

export default { render };
