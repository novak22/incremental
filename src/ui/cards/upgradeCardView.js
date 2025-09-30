import elements from '../elements.js';
import { getState } from '../../core/state.js';
import { formatMoney } from '../../core/helpers.js';
import { isUpgradeDisabled } from '../assetUpgrades.js';
import { emitUIEvent } from './shared.js';

const UPGRADE_CATEGORY_ORDER = ['tech', 'house', 'infra', 'support', 'misc'];

const UPGRADE_CATEGORY_COPY = {
  tech: {
    label: 'Tech',
    title: 'Tech gear & gadgets',
    note: 'Outfit your digital arsenal with rigs, cameras, and clever workflows.'
  },
  house: {
    label: 'House',
    title: 'House & studio',
    note: 'Shape the spaces that keep shoots smooth and edits comfy.'
  },
  infra: {
    label: 'Infra',
    title: 'Infrastructure',
    note: 'Scale the back-end brains that keep products humming worldwide.'
  },
  support: {
    label: 'Support',
    title: 'Support boosts',
    note: 'Quick pick-me-ups and helpers that keep momentum rolling.'
  },
  misc: {
    label: 'Special',
    title: 'Special upgrades',
    note: 'One-off perks that refuse to stay in neat boxes.'
  }
};

const UPGRADE_FAMILY_COPY = {
  general: {
    label: 'Highlights',
    note: 'Curated upgrades that don’t mind sharing space.'
  },
  phone: {
    label: 'Phone line',
    note: 'Capture crisp mobile footage and stay responsive on the go.'
  },
  pc: {
    label: 'PC rigs',
    note: 'Crunch renders, spreadsheets, and creative suites without sweat.'
  },
  monitor_hub: {
    label: 'Monitor hubs',
    note: 'Dock displays and fan out fresh screen real estate.'
  },
  monitor: {
    label: 'Monitors',
    note: 'Stack extra displays for editing bays and dashboards.'
  },
  storage: {
    label: 'Storage & scratch',
    note: 'Keep footage safe and project files lightning fast.'
  },
  camera: {
    label: 'Camera gear',
    note: 'Level up lenses and rigs so every frame looks cinematic.'
  },
  lighting: {
    label: 'Lighting rigs',
    note: 'Bathe shoots in flattering glow and zero fuss shadows.'
  },
  audio: {
    label: 'Audio gear',
    note: 'Capture buttery vocals and clean ambient sound.'
  },
  internet: {
    label: 'Internet plans',
    note: 'Feed uploads and live drops with consistent bandwidth.'
  },
  ergonomics: {
    label: 'Ergonomics',
    note: 'Keep posture happy while the hustle runs long hours.'
  },
  power_backup: {
    label: 'Power backup',
    note: 'Ride through outages without missing a milestone.'
  },
  studio: {
    label: 'Studio spaces',
    note: 'Build sets and stages tailored to your next shoot.'
  },
  workflow: {
    label: 'Workflow suites',
    note: 'Coordinate publishing calendars and creative rituals.'
  },
  automation: {
    label: 'Automation',
    note: 'Let bots and partners handle the repetitive hustle.'
  },
  cloud_compute: {
    label: 'Cloud compute',
    note: 'Provision serious horsepower for software launches.'
  },
  edge_network: {
    label: 'Edge network',
    note: 'Beam snappy responses worldwide with low-latency magic.'
  },
  commerce_network: {
    label: 'Commerce alliances',
    note: 'Bundle storefronts, partners, and licensing deals into one push.'
  },
  consumable: {
    label: 'Daily boosts',
    note: 'Single-day treats that top up focus right when you need it.'
  }
};

const upgradeUi = new Map();
const upgradeSections = new Map();
const upgradeLaneItems = new Map();
let currentUpgradeDefinitions = [];

export function render(definitions = []) {
  renderUpgrades(definitions);
}

export function update(definition) {
  updateUpgradeCard(definition);
}

export function refreshSections() {
  refreshUpgradeSections();
}

function formatLabelFromKey(id, fallback = 'Special') {
  if (!id) return fallback;
  return (
    id
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, match => match.toUpperCase())
      .trim() || fallback
  );
}

function getUpgradeCategory(definition) {
  return definition?.category || 'misc';
}

function getUpgradeFamily(definition) {
  return definition?.family || 'general';
}

function getCategoryCopy(id) {
  if (UPGRADE_CATEGORY_COPY[id]) {
    return UPGRADE_CATEGORY_COPY[id];
  }
  const label = formatLabelFromKey(id, 'Special');
  return {
    label,
    title: `${label} upgrades`,
    note: 'Specialized boosters that defy tidy labels.'
  };
}

function getFamilyCopy(id) {
  if (!id) {
    return UPGRADE_FAMILY_COPY.general;
  }
  if (UPGRADE_FAMILY_COPY[id]) {
    return UPGRADE_FAMILY_COPY[id];
  }
  return {
    label: formatLabelFromKey(id, 'Highlights'),
    note: 'Specialized enhancements for this progression lane.'
  };
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

function getUpgradeSnapshot(definition, state = getState()) {
  const upgradeState = state?.upgrades?.[definition.id] || {};
  const cost = Number(definition.cost) || 0;
  const money = Number(state?.money) || 0;
  const affordable = cost <= 0 || money >= cost;
  const disabled = isUpgradeDisabled(definition);
  const purchased = Boolean(upgradeState.purchased);
  const ready = !purchased && affordable && !disabled;
  return {
    cost,
    affordable,
    disabled,
    name: definition.name || definition.id,
    purchased,
    ready
  };
}

function describeUpgradeStatus({ purchased, ready, affordable, disabled }) {
  if (purchased) return 'Owned and active';
  if (ready) return 'Ready to launch';
  if (disabled) return 'Requires prerequisites';
  if (!affordable) return 'Save up to unlock';
  return 'Progress for this soon';
}

function sortUpgradesForCategory(definitions, state = getState()) {
  return definitions
    .slice()
    .sort((a, b) => {
      const aSnapshot = getUpgradeSnapshot(a, state);
      const bSnapshot = getUpgradeSnapshot(b, state);

      const score = snapshot => {
        if (snapshot.ready) return 0;
        if (!snapshot.purchased && snapshot.affordable) return 1;
        if (!snapshot.purchased) return 2;
        return 3;
      };

      const scoreDiff = score(aSnapshot) - score(bSnapshot);
      if (scoreDiff !== 0) return scoreDiff;

      if (aSnapshot.cost !== bSnapshot.cost) {
        return aSnapshot.cost - bSnapshot.cost;
      }

      return aSnapshot.name.localeCompare(bSnapshot.name);
    });
}

function buildUpgradeCategories(definitions) {
  const grouped = new Map();
  definitions.forEach(definition => {
    const categoryId = getUpgradeCategory(definition);
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, new Map());
    }
    const families = grouped.get(categoryId);
    const familyId = getUpgradeFamily(definition);
    if (!families.has(familyId)) {
      families.set(familyId, []);
    }
    families.get(familyId).push(definition);
  });

  const seen = new Set();
  const orderedKeys = [
    ...UPGRADE_CATEGORY_ORDER,
    ...Array.from(grouped.keys()).filter(key => !UPGRADE_CATEGORY_ORDER.includes(key))
  ];

  return orderedKeys
    .filter(key => {
      if (seen.has(key) || !grouped.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(id => {
      const families = Array.from(grouped.get(id)?.entries() || []).map(([familyId, defs]) => ({
        id: familyId,
        copy: getFamilyCopy(familyId),
        definitions: defs
      }));
      families.sort((a, b) => a.copy.label.localeCompare(b.copy.label, undefined, { sensitivity: 'base' }));
      const total = families.reduce((sum, family) => sum + family.definitions.length, 0);
      return {
        id,
        copy: getCategoryCopy(id),
        families,
        total
      };
    });
}

function scrollUpgradeLaneIntoView(categoryId) {
  if (!categoryId) return;

  if (categoryId === 'all') {
    const container = elements.upgradeList;
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

function renderUpgradeLaneMap(categories) {
  const list = elements.upgradeLaneList;
  if (!list) return;

  list.innerHTML = '';
  upgradeLaneItems.clear();

  const lanes = [
    {
      id: 'all',
      copy: {
        label: 'All lanes',
        note: 'Browse every upgrade in one sweep.'
      }
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
    upgradeLaneItems.set(lane.id, { item, count, ready, owned });
  });

  if (!list.childElementCount) {
    const empty = document.createElement('li');
    empty.className = 'upgrade-rail__empty';
    empty.textContent = 'Discover upgrades to populate this map.';
    list.appendChild(empty);
    return;
  }

  updateUpgradeLaneMap();
}

function updateUpgradeLaneMap() {
  if (!upgradeLaneItems.size) return;
  const state = getState();
  if (!state) return;

  upgradeLaneItems.forEach((entry, categoryId) => {
    if (!entry) return;
    const definitions = categoryId === 'all'
      ? currentUpgradeDefinitions
      : currentUpgradeDefinitions.filter(def => getUpgradeCategory(def) === categoryId);

    const total = definitions.length;
    let readyCount = 0;
    let ownedCount = 0;

    definitions.forEach(definition => {
      const snapshot = getUpgradeSnapshot(definition, state);
      if (snapshot.ready) readyCount += 1;
      if (snapshot.purchased) ownedCount += 1;
    });

    if (entry.count) {
      entry.count.textContent = total ? `${total} upgrades` : 'No upgrades yet';
    }

    if (entry.ready) {
      entry.ready.textContent = readyCount > 0 ? `${readyCount} ready` : 'No ready picks';
      entry.ready.classList.toggle('upgrade-rail__stat--empty', readyCount === 0);
    }

    if (entry.owned) {
      entry.owned.textContent = total ? `${ownedCount}/${total} owned` : '0 owned';
    }

    if (entry.item) {
      entry.item.dataset.ready = readyCount > 0 ? 'true' : 'false';
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

function renderUpgradeOverview(definitions) {
  const overview = elements.upgradeOverview;
  if (!overview?.container) return;
  const state = getState();
  if (!state) return;

  const stats = definitions.reduce(
    (acc, definition) => {
      const snapshot = getUpgradeSnapshot(definition, state);
      if (snapshot.purchased) acc.purchased += 1;
      if (snapshot.ready) acc.ready += 1;
      acc.total += 1;
      return acc;
    },
    { purchased: 0, ready: 0, total: 0 }
  );

  overview.purchased.textContent = `${stats.purchased}/${stats.total}`;
  overview.ready.textContent = String(stats.ready);
  if (overview.note) {
    overview.note.textContent = describeOverviewNote(stats);
  }
}

export function refreshUpgradeSections() {
  const emptyNote = elements.upgradeEmpty;
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

  updateUpgradeLaneMap();
}

document.addEventListener('upgrades:filtered', () => {
  refreshUpgradeSections();
});

function renderUpgradeCard(definition, container, categoryId, familyId = 'general') {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'upgrade-card';
  card.dataset.upgrade = definition.id;
  card.dataset.category = categoryId;
  card.dataset.family = familyId;
  const searchPieces = [definition.name, definition.description, definition.tag?.label]
    .filter(Boolean)
    .join(' ');
  card.dataset.search = searchPieces.toLowerCase();
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
  upgradeUi.set(definition.id, {
    card,
    buyButton,
    status,
    price,
    updateDetails: details?.update,
    extra
  });
  updateUpgradeCard(definition);
}

function updateUpgradeCard(definition) {
  const ui = upgradeUi.get(definition.id);
  if (!ui) return;
  const state = getState();
  const snapshot = getUpgradeSnapshot(definition, state);

  ui.card.dataset.affordable = snapshot.affordable ? 'true' : 'false';
  ui.card.dataset.purchased = snapshot.purchased ? 'true' : 'false';
  ui.card.dataset.ready = snapshot.ready ? 'true' : 'false';

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

function renderUpgrades(definitions) {
  const list = elements.upgradeList;
  if (!list) return;
  list.tabIndex = -1;
  currentUpgradeDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  list.innerHTML = '';
  upgradeUi.clear();
  upgradeSections.clear();

  const categories = buildUpgradeCategories(definitions);
  renderUpgradeLaneMap(categories);

  const fragment = document.createDocumentFragment();
  categories.forEach(category => {
    const section = document.createElement('section');
    section.className = 'upgrade-section';
    section.dataset.category = category.id;
    section.tabIndex = -1;

    const header = document.createElement('header');
    header.className = 'upgrade-section__header';
    const headingGroup = document.createElement('div');
    headingGroup.className = 'upgrade-section__heading';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'upgrade-section__eyebrow';
    eyebrow.textContent = category.copy.label;
    const title = document.createElement('h3');
    title.textContent = category.copy.title;
    const note = document.createElement('p');
    note.textContent = category.copy.note;
    headingGroup.append(eyebrow, title, note);

    const count = document.createElement('span');
    count.className = 'upgrade-section__count';
    header.append(headingGroup, count);
    section.appendChild(header);

    const familiesContainer = document.createElement('div');
    familiesContainer.className = 'upgrade-section__families';
    const families = category.families.length ? category.families : [{ id: 'general', copy: getFamilyCopy('general'), definitions: [] }];
    families.forEach(family => {
      const familyArticle = document.createElement('article');
      familyArticle.className = 'upgrade-family';
      familyArticle.dataset.category = category.id;
      familyArticle.dataset.family = family.id;

      const familyHeader = document.createElement('header');
      familyHeader.className = 'upgrade-family__header';
      const familyTitle = document.createElement('h4');
      familyTitle.textContent = family.copy.label;
      const familyCount = document.createElement('span');
      familyCount.className = 'upgrade-family__count';
      familyHeader.append(familyTitle, familyCount);
      familyArticle.appendChild(familyHeader);

      if (family.copy.note) {
        const familyNote = document.createElement('p');
        familyNote.className = 'upgrade-family__note';
        familyNote.textContent = family.copy.note;
        familyArticle.appendChild(familyNote);
      }

      const familyList = document.createElement('div');
      familyList.className = 'upgrade-family__list';
      const sorted = sortUpgradesForCategory(family.definitions);
      sorted.forEach(def => renderUpgradeCard(def, familyList, category.id, family.id));
      familyArticle.appendChild(familyList);

      const familyEmpty = document.createElement('p');
      familyEmpty.className = 'upgrade-family__empty';
      familyEmpty.textContent = 'No upgrades discovered yet in this family.';
      familyEmpty.hidden = sorted.length > 0;
      familyArticle.appendChild(familyEmpty);

      familiesContainer.appendChild(familyArticle);
      upgradeSections.set(`${category.id}:${family.id}`, {
        section: familyArticle,
        list: familyList,
        count: familyCount,
        emptyMessage: familyEmpty
      });
    });
    section.appendChild(familiesContainer);

    const empty = document.createElement('p');
    empty.className = 'upgrade-section__empty';
    empty.textContent = 'Nothing matches this lane yet. Progress other goals or adjust filters.';
    empty.hidden = true;
    section.appendChild(empty);

    fragment.appendChild(section);
    upgradeSections.set(category.id, { section, list: familiesContainer, count, emptyMessage: empty });
  });

  list.appendChild(fragment);
  renderUpgradeOverview(currentUpgradeDefinitions);
  renderUpgradeDock();
  refreshUpgradeSections();
}

function renderUpgradeDock() {
  const dock = elements.upgradeDockList;
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
export function renderOverview(definitions = []) {
  renderUpgradeOverview(Array.isArray(definitions) ? definitions : []);
}

export function renderDock() {
  renderUpgradeDock();
}

export function getCurrentDefinitions() {
  return [...currentUpgradeDefinitions];
}

export function ensureCurrentDefinitions(definitions = []) {
  if (!currentUpgradeDefinitions.length && Array.isArray(definitions)) {
    currentUpgradeDefinitions = [...definitions];
  }
}

export function setCurrentDefinitions(definitions = []) {
  currentUpgradeDefinitions = Array.isArray(definitions) ? [...definitions] : [];
}

export function hasUpgrade(definitionId) {
  return upgradeUi.has(definitionId);
}
