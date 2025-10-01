import { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import { formatMoney } from '../../../core/helpers.js';
import { applyCardFilters } from '../../layout.js';
import { describeUpgradeStatus, getUpgradeSnapshot } from '../../cards/model.js';

const upgradeUi = new Map();
const upgradeSections = new Map();
const upgradeLaneItems = new Map();
let currentUpgradeDefinitions = [];
let currentUpgradeModels = { categories: [], overview: { purchased: 0, ready: 0, total: 0, note: '' } };
const upgradeDefinitionLookup = new Map();

export function cacheUpgradeDefinitions(definitions = []) {
  currentUpgradeDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  upgradeDefinitionLookup.clear();
  currentUpgradeDefinitions.forEach(definition => {
    if (definition?.id) {
      upgradeDefinitionLookup.set(definition.id, definition);
    }
  });
}

export function cacheUpgradeModels(models = {}) {
  const categories = Array.isArray(models?.categories) ? models.categories : [];
  const overview = models?.overview ?? {};
  currentUpgradeModels = {
    categories,
    overview: {
      purchased: Number.isFinite(Number(overview.purchased)) ? Number(overview.purchased) : 0,
      ready: Number.isFinite(Number(overview.ready)) ? Number(overview.ready) : 0,
      total: Number.isFinite(Number(overview.total)) ? Number(overview.total) : categories.reduce(
        (sum, category) =>
          sum + (category?.families ?? []).reduce(
            (familySum, family) => familySum + (family?.definitions?.length ?? 0),
            0
          ),
        0
      ),
      note: overview.note || null
    }
  };
}

export function findUpgradeModelById(id) {
  if (!id) return null;
  for (const category of currentUpgradeModels?.categories ?? []) {
    const families = category?.families ?? [];
    for (const family of families) {
      const definitions = family?.definitions ?? [];
      const match = definitions.find(def => def?.id === id);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

function buildUpgradeDetails(definition) {
  const detailBuilders = Array.isArray(definition.details) ? definition.details.slice(0, 3) : [];
  if (!detailBuilders.length) {
    return null;
  }

  const list = document.createElement('ul');
  list.className = 'upgrade-card__details';
  const items = detailBuilders.map(() => {
    const item = document.createElement('li');
    item.className = 'upgrade-card__detail';
    list.appendChild(item);
    return item;
  });

  const update = () => {
    items.forEach((item, index) => {
      const builder = detailBuilders[index];
      try {
        const detail = typeof builder === 'function' ? builder() : builder;
        if (!detail) {
          item.hidden = true;
          item.innerHTML = '';
          return;
        }
        if (typeof detail === 'string') {
          const trimmed = detail.trim();
          item.hidden = trimmed.length === 0;
          item.innerHTML = trimmed;
        } else if (detail instanceof Node) {
          item.hidden = false;
          item.innerHTML = '';
          item.appendChild(detail);
        } else {
          item.hidden = true;
          item.innerHTML = '';
        }
      } catch (error) {
        console.error('Failed to render upgrade detail', error);
        item.hidden = true;
        item.innerHTML = '';
      }
    });
  };

  update();
  return { list, update };
}

function sortUpgradeModelsForFamily(definitions = []) {
  return (definitions ?? [])
    .slice()
    .sort((a, b) => {
      const aSnapshot = a?.snapshot ?? {};
      const bSnapshot = b?.snapshot ?? {};

      const score = snapshot => {
        if (snapshot.ready) return 0;
        if (!snapshot.purchased && snapshot.affordable) return 1;
        if (!snapshot.purchased) return 2;
        return 3;
      };

      const scoreDiff = score(aSnapshot) - score(bSnapshot);
      if (scoreDiff !== 0) return scoreDiff;

      const aCost = Number.isFinite(Number(aSnapshot.cost)) ? Number(aSnapshot.cost) : Number(a?.cost) || 0;
      const bCost = Number.isFinite(Number(bSnapshot.cost)) ? Number(bSnapshot.cost) : Number(b?.cost) || 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }

      const aName = a?.name || a?.id || '';
      const bName = b?.name || b?.id || '';
      return aName.localeCompare(bName);
    });
}

function scrollUpgradeLaneIntoView(categoryId) {
  if (!categoryId) return;

  if (categoryId === 'all') {
    const container = getElement('upgradeList');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      container.focus?.({ preventScroll: true });
    }
    return;
  }

  const entry = upgradeSections.get(categoryId);
  if (entry?.section) {
    entry.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    entry.section.focus?.({ preventScroll: true });
    return;
  }

  const fallback = Array.from(upgradeSections.values()).find(({ section }) => section?.dataset.category === categoryId);
  if (fallback?.section) {
    fallback.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fallback.section.focus?.({ preventScroll: true });
  }
}

function renderUpgradeLaneMap(categories, overview) {
  const list = getElement('upgradeLaneList');
  if (!list) return;

  list.innerHTML = '';
  upgradeLaneItems.clear();

  const lanes = [
    {
      id: 'all',
      copy: {
        label: 'All lanes',
        note: 'Browse every upgrade in one sweep.'
      },
      overview: overview || currentUpgradeModels.overview
    },
    ...(Array.isArray(categories) ? categories : [])
  ];

  lanes.forEach(lane => {
    if (!lane?.id || upgradeLaneItems.has(lane.id)) return;
    const item = document.createElement('li');
    item.className = 'upgrade-rail__item';
    item.dataset.category = lane.id;

    const block = document.createElement('div');
    block.className = 'upgrade-rail__button';
    block.setAttribute('role', 'button');
    block.tabIndex = 0;

    const heading = document.createElement('div');
    heading.className = 'upgrade-rail__heading';
    const label = document.createElement('span');
    label.className = 'upgrade-rail__label';
    label.textContent = lane.copy?.label || lane.id;
    const count = document.createElement('span');
    count.className = 'upgrade-rail__count';
    heading.append(label, count);
    block.appendChild(heading);

    const stats = document.createElement('div');
    stats.className = 'upgrade-rail__stats';
    const ready = document.createElement('span');
    ready.className = 'upgrade-rail__stat upgrade-rail__stat--ready';
    const owned = document.createElement('span');
    owned.className = 'upgrade-rail__stat';
    stats.append(ready, owned);
    block.appendChild(stats);

    const activateLane = event => {
      event?.preventDefault?.();
      scrollUpgradeLaneIntoView(lane.id);
    };

    block.addEventListener('click', activateLane);
    block.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        activateLane(event);
      }
    });

    item.appendChild(block);
    list.appendChild(item);
    upgradeLaneItems.set(lane.id, { item, count, ready, owned, model: lane });
  });

  if (!list.childElementCount) {
    const empty = document.createElement('li');
    empty.className = 'upgrade-rail__empty';
    empty.textContent = 'Discover upgrades to populate this map.';
    list.appendChild(empty);
    return;
  }

  updateUpgradeLaneMap(categories, overview);
}

function updateUpgradeLaneMap(categories = currentUpgradeModels.categories, overview = currentUpgradeModels.overview) {
  if (!upgradeLaneItems.size) return;

  upgradeLaneItems.forEach((entry, key) => {
    if (!entry) return;
    const model = entry.model;
    const targetOverview = key === 'all'
      ? overview || currentUpgradeModels.overview
      : model?.overview;

    const total = Number.isFinite(Number(targetOverview?.total)) ? Number(targetOverview.total) : 0;
    const ready = Number.isFinite(Number(targetOverview?.ready)) ? Number(targetOverview.ready) : 0;
    const owned = Number.isFinite(Number(targetOverview?.purchased)) ? Number(targetOverview.purchased) : 0;

    if (entry.count) {
      entry.count.textContent = total ? `${total} upgrades` : 'No upgrades yet';
    }

    if (entry.ready) {
      entry.ready.textContent = ready > 0 ? `${ready} ready` : 'No ready picks';
      entry.ready.classList.toggle('upgrade-rail__stat--empty', ready === 0);
    }

    if (entry.owned) {
      entry.owned.textContent = total ? `${owned}/${total} owned` : '0 owned';
    }

    if (entry.item) {
      entry.item.dataset.ready = ready > 0 ? 'true' : 'false';
      entry.item.dataset.empty = total === 0 ? 'true' : 'false';
    }
  });
}

function describeOverviewNote({ total, purchased, ready }) {
  if (!total) {
    return 'Upgrades unlock as you build new assets and story beats.';
  }
  if (total === purchased) {
    return 'Every upgrade is owned! Keep stacking cash for the next content drop.';
  }
  if (ready > 0) {
    return ready === 1
      ? 'One upgrade is ready to install right now.'
      : `${ready} upgrades are ready to install right now.`;
  }
  return 'Meet the prerequisites or save up to line up your next power spike.';
}

export function renderUpgradeOverview(upgradeModels) {
  const overview = getElement('upgradeOverview');
  if (!overview?.container) return;
  const statsSource = upgradeModels?.overview ?? null;
  const categories = upgradeModels?.categories ?? currentUpgradeModels.categories;

  const stats = {
    total: Number.isFinite(Number(statsSource?.total))
      ? Number(statsSource.total)
      : categories.reduce(
          (sum, category) =>
            sum + (category?.families ?? []).reduce(
              (familySum, family) => familySum + (family?.definitions?.length ?? 0),
              0
            ),
          0
        ),
    purchased: Number.isFinite(Number(statsSource?.purchased)) ? Number(statsSource.purchased) : categories.reduce(
      (sum, category) =>
        sum + (category?.families ?? []).reduce(
          (familySum, family) =>
            familySum + (family?.definitions ?? []).filter(model => model?.snapshot?.purchased).length,
          0
        ),
      0
    ),
    ready: Number.isFinite(Number(statsSource?.ready)) ? Number(statsSource.ready) : categories.reduce(
      (sum, category) =>
        sum + (category?.families ?? []).reduce(
          (familySum, family) =>
            familySum + (family?.definitions ?? []).filter(model => model?.snapshot?.ready).length,
          0
        ),
      0
    )
  };

  overview.purchased.textContent = `${stats.purchased}/${stats.total}`;
  overview.ready.textContent = String(stats.ready);
  if (overview.note) {
    overview.note.textContent = statsSource?.note || describeOverviewNote(stats);
  }
}

export function refreshUpgradeSections() {
  const emptyNote = getElement('upgradeEmpty');
  let visibleTotal = 0;

  upgradeSections.forEach(({ section, list, count, emptyMessage }) => {
    const cards = Array.from(list?.querySelectorAll('[data-upgrade]') || []);
    const visible = cards.filter(card => !card.hidden);
    visibleTotal += visible.length;

    if (count) {
      if (!cards.length) {
        count.textContent = 'No upgrades yet';
      } else if (!visible.length) {
        count.textContent = 'No matches';
      } else if (visible.length === cards.length) {
        count.textContent = `${cards.length} total`;
      } else {
        count.textContent = `${visible.length}/${cards.length} showing`;
      }
    }

    if (section) {
      section.dataset.empty = visible.length === 0 ? 'true' : 'false';
    }

    if (emptyMessage) {
      emptyMessage.hidden = visible.length > 0;
    }
  });

  if (emptyNote) {
    emptyNote.hidden = visibleTotal > 0;
  }

  updateUpgradeLaneMap(currentUpgradeModels.categories, currentUpgradeModels.overview);
}

if (typeof document !== 'undefined') {
  document.addEventListener('upgrades:filtered', () => {
    refreshUpgradeSections();
  });
}

function renderUpgradeCard(definition, model, container) {
  if (!definition || !model || !container) return;
  const state = getState();
  const card = document.createElement('article');
  card.className = 'upgrade-card';
  card.dataset.upgrade = definition.id;
  card.dataset.category = model.filters?.category || definition.category || 'misc';
  card.dataset.family = model.filters?.family || definition.family || 'general';
  const searchValue = model.filters?.search
    || [definition.name, definition.description, definition.tag?.label].filter(Boolean).join(' ');
  card.dataset.search = searchValue.toLowerCase();
  card.tabIndex = -1;

  const eyebrow = document.createElement('div');
  eyebrow.className = 'upgrade-card__eyebrow';
  const tag = document.createElement('span');
  tag.className = 'upgrade-card__tag';
  tag.textContent = definition.tag?.label || 'Upgrade';
  eyebrow.appendChild(tag);
  const status = document.createElement('span');
  status.className = 'upgrade-card__status';
  eyebrow.appendChild(status);
  card.appendChild(eyebrow);

  const header = document.createElement('div');
  header.className = 'upgrade-card__header';
  const title = document.createElement('h3');
  title.className = 'upgrade-card__title';
  title.textContent = definition.name;
  header.appendChild(title);
  const price = document.createElement('span');
  price.className = 'upgrade-card__price';
  const cost = Number(definition.cost) || 0;
  price.textContent = cost > 0 ? `$${formatMoney(cost)}` : 'No cost';
  header.appendChild(price);
  card.appendChild(header);

  if (definition.description) {
    const copy = document.createElement('p');
    copy.className = 'upgrade-card__description';
    copy.textContent = definition.description;
    card.appendChild(copy);
  }

  const details = buildUpgradeDetails(definition);
  if (details) {
    card.appendChild(details.list);
  }

  const actions = document.createElement('div');
  actions.className = 'upgrade-card__actions';
  let buyButton = null;
  if (definition.action?.onClick) {
    buyButton = document.createElement('button');
    buyButton.type = 'button';
    buyButton.dataset.role = 'buy-upgrade';
    buyButton.className = definition.action.className || 'primary';
    buyButton.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action.label || 'Buy';
    buyButton.addEventListener('click', () => {
      if (buyButton.disabled) return;
      definition.action.onClick();
    });
    actions.appendChild(buyButton);
  }

  if (actions.childElementCount > 0) {
    card.appendChild(actions);
  }

  let extra = null;
  if (typeof definition.extraContent === 'function') {
    extra = definition.extraContent(card) || null;
  }

  container.appendChild(card);
  upgradeUi.set(model.id, {
    card,
    buyButton,
    status,
    price,
    updateDetails: details?.update,
    extra,
    modelId: model.id
  });
  updateUpgradeCard(definition, model);
}

export function updateUpgradeCard(definition, model) {
  const key = model?.id || definition?.id;
  if (!key) return;
  const ui = upgradeUi.get(key);
  if (!ui) return;
  const state = getState();
  const resolvedModel = model || findUpgradeModelById(key);
  const previousSnapshot = resolvedModel?.snapshot ?? null;
  const fallbackSnapshot = () => {
    const cost = Number(definition?.cost) || 0;
    const money = Number(state?.money) || 0;
    const affordable = cost <= 0 || money >= cost;
    const disabled = typeof definition?.action?.disabled === 'function'
      ? definition.action.disabled(state)
      : Boolean(definition?.action?.disabled);
    const upgradeState = state?.upgrades?.[key] || {};
    const purchased = Boolean(upgradeState.purchased);
    const ready = !purchased && affordable && !disabled;
    return {
      cost,
      affordable,
      disabled,
      name: definition?.name || key,
      purchased,
      ready
    };
  };

  let snapshot = previousSnapshot;
  if (definition) {
    snapshot = getUpgradeSnapshot(definition, state);
  }
  if (!snapshot) {
    snapshot = fallbackSnapshot();
  }

  if (resolvedModel) {
    if (snapshot !== previousSnapshot) {
      resolvedModel.snapshot = snapshot;
      reconcileUpgradeOverviewStats(previousSnapshot, snapshot);
    }
    if (resolvedModel.filters) {
      resolvedModel.filters.ready = snapshot.ready;
      resolvedModel.filters.affordable = snapshot.affordable;
    }
  }

  ui.card.dataset.affordable = snapshot.affordable ? 'true' : 'false';
  ui.card.dataset.purchased = snapshot.purchased ? 'true' : 'false';
  ui.card.dataset.ready = snapshot.ready ? 'true' : 'false';
  if (resolvedModel?.filters) {
    ui.card.dataset.category = resolvedModel.filters.category || ui.card.dataset.category;
    ui.card.dataset.family = resolvedModel.filters.family || ui.card.dataset.family;
    ui.card.dataset.search = resolvedModel.filters.search || ui.card.dataset.search;
  }

  if (ui.buyButton) {
    ui.buyButton.className = definition.action?.className || 'primary';
    ui.buyButton.disabled = snapshot.disabled || !snapshot.affordable;
    ui.buyButton.textContent = typeof definition.action?.label === 'function'
      ? definition.action.label(state)
      : definition.action?.label || 'Buy';
  }

  if (ui.status) {
    ui.status.textContent = describeUpgradeStatus(snapshot);
    ui.status.dataset.state = snapshot.ready
      ? 'ready'
      : snapshot.purchased
        ? 'owned'
        : snapshot.disabled
          ? 'blocked'
          : snapshot.affordable
            ? 'saving'
            : 'locked';
  }

  if (typeof definition.cardState === 'function') {
    definition.cardState(state, ui.card);
  }

  if (typeof definition.update === 'function') {
    definition.update(state, ui);
  }

  ui.updateDetails?.();
}

function reconcileUpgradeOverviewStats(previousSnapshot, nextSnapshot) {
  if (!currentUpgradeModels?.overview) return;
  const overview = currentUpgradeModels.overview;
  const toNumber = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
  overview.total = toNumber(overview.total);

  const purchasedDelta = (nextSnapshot?.purchased ? 1 : 0) - (previousSnapshot?.purchased ? 1 : 0);
  const readyDelta = (nextSnapshot?.ready ? 1 : 0) - (previousSnapshot?.ready ? 1 : 0);

  overview.purchased = Math.max(0, toNumber(overview.purchased) + purchasedDelta);
  overview.ready = Math.max(0, toNumber(overview.ready) + readyDelta);
  overview.note = describeOverviewNote({
    total: overview.total,
    purchased: overview.purchased,
    ready: overview.ready
  });
}

export function renderUpgrades(definitions, upgradeModels) {
  const list = getElement('upgradeList');
  if (!list) return;
  list.tabIndex = -1;

  if (Array.isArray(definitions) && definitions.length) {
    cacheUpgradeDefinitions(definitions);
  }

  const models = upgradeModels || currentUpgradeModels;
  cacheUpgradeModels(models);

  list.innerHTML = '';
  upgradeUi.clear();
  upgradeSections.clear();

  const categories = models.categories || [];
  categories.forEach(category => {
    if (!category?.families?.length) return;

    const section = document.createElement('section');
    section.className = 'upgrade-section';
    section.dataset.category = category.id;

    const header = document.createElement('header');
    header.className = 'upgrade-section__header';
    const title = document.createElement('h2');
    title.textContent = category.name;
    header.appendChild(title);
    const count = document.createElement('span');
    count.className = 'upgrade-section__count';
    header.appendChild(count);
    section.appendChild(header);

    const familyList = document.createElement('div');
    familyList.className = 'upgrade-section__families';

    category.families.forEach(family => {
      const familySection = document.createElement('article');
      familySection.className = 'upgrade-family';
      const familyHeader = document.createElement('header');
      familyHeader.className = 'upgrade-family__header';
      const familyTitle = document.createElement('h3');
      familyTitle.textContent = family.name;
      familyHeader.appendChild(familyTitle);
      if (family.description) {
        const familyNote = document.createElement('p');
        familyNote.className = 'upgrade-family__note';
        familyNote.textContent = family.description;
        familyHeader.appendChild(familyNote);
      }
      familySection.appendChild(familyHeader);

      const cardList = document.createElement('div');
      cardList.className = 'upgrade-family__list';
      const sorted = sortUpgradeModelsForFamily(family.definitions || []);
      sorted.forEach(model => {
        const definition = model.definition || upgradeDefinitionLookup.get(model.id);
        if (!definition) return;
        const cardContainer = document.createElement('div');
        cardContainer.className = 'upgrade-family__card';
        renderUpgradeCard(definition, model, cardContainer);
        cardList.appendChild(cardContainer);
      });
      familySection.appendChild(cardList);
      familyList.appendChild(familySection);
    });

    section.appendChild(familyList);
    list.appendChild(section);

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'upgrade-section__empty';
    emptyMessage.textContent = 'No upgrades in this category yet.';
    section.appendChild(emptyMessage);

    upgradeSections.set(category.id, { section, list: section, count, emptyMessage });
  });

  renderUpgradeLaneMap(categories, models.overview);
  renderUpgradeOverview(models);
  refreshUpgradeSections();
  applyCardFilters();
}

export function updateUpgrades(definitions, upgradeModels) {
  if (Array.isArray(definitions) && definitions.length) {
    cacheUpgradeDefinitions(definitions);
  }
  if (upgradeModels) {
    cacheUpgradeModels(upgradeModels);
  }

  upgradeUi.forEach((ui, id) => {
    const definition = upgradeDefinitionLookup.get(id);
    const model = findUpgradeModelById(id);
    if (definition) {
      updateUpgradeCard(definition, model);
    }
  });

  renderUpgradeOverview(currentUpgradeModels);
  refreshUpgradeSections();
  renderUpgradeDock();
  applyCardFilters();
}

export function renderUpgradeDock() {
  const dock = getElement('upgradeDockList');
  if (!dock) return;
  dock.innerHTML = '';

  const cards = Array.from(upgradeUi.values()).map(ui => ui.card);
  const pool = cards.filter(card => card.dataset.ready === 'true');

  if (!pool.length) {
    const empty = document.createElement('li');
    empty.className = 'dock-item dock-item--empty';
    empty.textContent = 'No standout upgrades yet. Meet a prerequisite or stack more cash to populate this list.';
    dock.appendChild(empty);
    return;
  }

  pool.slice(0, 5).forEach(card => {
    const item = document.createElement('li');
    item.className = 'dock-item';
    const header = document.createElement('div');
    header.className = 'dock-item__header';
    const label = document.createElement('strong');
    label.textContent = card.querySelector('.upgrade-card__title')?.textContent || '';
    const price = document.createElement('span');
    price.className = 'dock-item__price';
    price.textContent = card.querySelector('.upgrade-card__price')?.textContent || '';
    header.append(label, price);

    const note = document.createElement('span');
    note.className = 'dock-item__note';
    note.textContent = card.querySelector('.upgrade-card__status')?.textContent || 'Queued upgrade';

    const button = document.createElement('button');
    button.type = 'button';
    const source = card.querySelector('[data-role="buy-upgrade"]');
    if (source) {
      button.className = source.className;
      button.textContent = source.textContent || 'Buy';
      button.disabled = source.disabled;
      button.addEventListener('click', () => source.click());
    } else {
      button.className = 'secondary';
      button.textContent = 'View card';
      button.addEventListener('click', () => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.focus?.({ preventScroll: true });
      });
    }

    item.append(header, note, button);
    dock.appendChild(item);
  });
}

export function isUpgradeDefinition(id) {
  return upgradeDefinitionLookup.has(id);
}

export default {
  cacheUpgradeDefinitions,
  cacheUpgradeModels,
  findUpgradeModelById,
  renderUpgrades,
  updateUpgrades,
  updateUpgradeCard,
  renderUpgradeDock,
  renderUpgradeOverview,
  refreshUpgradeSections,
  isUpgradeDefinition
};

