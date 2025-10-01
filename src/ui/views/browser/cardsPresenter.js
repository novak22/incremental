import { getElement } from '../../elements/registry.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { SERVICE_PAGES } from './config.js';
import { createStat, formatRoi } from './components/widgets.js';

let cachedRegistries = null;
let cachedModels = null;
let mainContainer = null;
const pageSections = new Map();

function getMainContainer() {
  if (mainContainer) return mainContainer;
  const homepage = getElement('homepage');
  const container = homepage?.container?.parentElement || null;
  mainContainer = container;
  return mainContainer;
}

function createPageSection(page) {
  const main = getMainContainer();
  if (!main || pageSections.has(page.id)) {
    return pageSections.get(page.id) || null;
  }

  const section = document.createElement('section');
  section.className = 'browser-page';
  section.dataset.browserPage = page.id;
  section.id = `browser-page-${page.slug}`;

  const header = document.createElement('header');
  header.className = 'browser-page__header';
  const title = document.createElement('h1');
  title.textContent = page.headline;
  const note = document.createElement('p');
  note.textContent = page.tagline;
  header.append(title, note);

  const body = document.createElement('div');
  body.className = 'browser-page__body';

  section.append(header, body);
  main.appendChild(section);

  const refs = { section, header, note, body };
  pageSections.set(page.id, refs);
  return refs;
}

function ensurePageContent(page, builder) {
  const refs = createPageSection(page);
  if (!refs) return null;
  if (typeof builder === 'function') {
    builder(refs);
  }
  return refs;
}

function buildDefinitionMap(definitions = []) {
  const map = new Map();
  definitions.forEach(definition => {
    if (definition?.id) {
      map.set(definition.id, definition);
    }
  });
  return map;
}

function renderHustlesPage(definitions = [], models = []) {
  const page = SERVICE_PAGES.find(entry => entry.type === 'hustles');
  if (!page) return null;

  const refs = ensurePageContent(page, ({ body }) => {
    if (!body.querySelector('[data-role="browser-hustle-list"]')) {
      const list = document.createElement('div');
      list.className = 'browser-card-grid';
      list.dataset.role = 'browser-hustle-list';
      body.appendChild(list);
    }
  });
  if (!refs) return null;

  const list = refs.body.querySelector('[data-role="browser-hustle-list"]');
  if (!list) return null;
  list.innerHTML = '';

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    if (model.filters?.available) {
      availableCount += 1;
    }

    const card = document.createElement('article');
    card.className = 'browser-card browser-card--hustle';
    card.dataset.hustle = model.id;
    card.dataset.search = model.filters?.search || '';
    card.dataset.time = String(model.metrics?.time?.value ?? 0);
    card.dataset.payout = String(model.metrics?.payout?.value ?? 0);
    card.dataset.roi = String(model.metrics?.roi ?? 0);
    card.dataset.available = model.filters?.available ? 'true' : 'false';
    if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
      card.dataset.limitRemaining = String(model.filters.limitRemaining);
    }

    const header = document.createElement('header');
    header.className = 'browser-card__header';
    const title = document.createElement('h2');
    title.className = 'browser-card__title';
    title.textContent = model.name;
    header.appendChild(title);
    card.appendChild(header);

    if (model.description) {
      const summary = document.createElement('p');
      summary.className = 'browser-card__summary';
      summary.textContent = model.description;
      card.appendChild(summary);
    }

    const stats = document.createElement('div');
    stats.className = 'browser-card__stats';
    const payoutValue = model.metrics?.payout?.value ?? 0;
    const payoutLabel = model.metrics?.payout?.label
      || (payoutValue > 0 ? `$${formatMoney(payoutValue)}` : 'Varies');
    stats.append(
      createStat('Time', model.metrics?.time?.label || formatHours(model.metrics?.time?.value ?? 0)),
      createStat('Payout', payoutLabel),
      createStat('ROI', formatRoi(model.metrics?.roi))
    );
    card.appendChild(stats);

    const meta = document.createElement('p');
    meta.className = 'browser-card__meta';
    meta.textContent = model.requirements?.summary || 'No requirements';
    card.appendChild(meta);

    if (model.limit?.summary) {
      const limit = document.createElement('p');
      limit.className = 'browser-card__note';
      limit.textContent = model.limit.summary;
      card.appendChild(limit);
    }

    const actions = document.createElement('div');
    actions.className = 'browser-card__actions';
    if (definition.action && model.action?.label) {
      const queueButton = document.createElement('button');
      queueButton.type = 'button';
      queueButton.className = 'browser-card__button browser-card__button--primary';
      queueButton.textContent = model.action.label;
      queueButton.disabled = Boolean(model.action.disabled);
      queueButton.addEventListener('click', () => {
        if (queueButton.disabled) return;
        definition.action.onClick?.();
      });
      actions.appendChild(queueButton);
    }
    card.appendChild(actions);

    list.appendChild(card);
  });

  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue a hustle to see it spotlighted here.';
    list.appendChild(empty);
  }

  return {
    id: page.id,
    meta: availableCount > 0 ? `${availableCount} hustle${availableCount === 1 ? '' : 's'} ready` : 'No hustles ready yet'
  };
}

function renderAssetInstances(group, container) {
  const wrapper = document.createElement('article');
  wrapper.className = 'browser-card browser-card--asset-group';
  wrapper.dataset.assetGroup = group.id;

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = `${group.icon || '✨'} ${group.label}`.trim();
  header.appendChild(title);
  container.appendChild(wrapper);
  wrapper.appendChild(header);

  if (group.note) {
    const note = document.createElement('p');
    note.className = 'browser-card__summary';
    note.textContent = group.note;
    wrapper.appendChild(note);
  }

  const list = document.createElement('div');
  list.className = 'browser-asset-list';
  list.dataset.role = 'browser-asset-list';
  wrapper.appendChild(list);

  group.instances.forEach(instance => {
    const item = document.createElement('div');
    item.className = 'browser-asset';
    item.dataset.asset = instance.id;
    item.dataset.status = instance.status || 'setup';
    item.dataset.risk = instance.risk || 'medium';
    if (instance.needsMaintenance) {
      item.dataset.needsMaintenance = 'true';
    }

    const label = document.createElement('strong');
    label.className = 'browser-asset__title';
    const assetName = instance.definition?.singular || instance.definition?.name || 'Venture';
    label.textContent = `${assetName} #${instance.index + 1}`;

    const status = document.createElement('span');
    status.className = 'browser-asset__status';
    status.textContent = instance.status === 'active' ? 'Active' : 'Setting up';

    const maintenance = document.createElement('span');
    maintenance.className = 'browser-asset__note';
    maintenance.textContent = instance.needsMaintenance ? 'Maintenance due' : 'All clear';

    item.append(label, status, maintenance);
    list.appendChild(item);
  });

  return wrapper;
}

function renderAssetLaunchers(launchers = [], container) {
  if (!launchers.length) return;
  const launcherSection = document.createElement('div');
  launcherSection.className = 'browser-launcher-grid';

  launchers.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'browser-card browser-card--launcher';
    card.dataset.assetLauncher = entry.id;

    const header = document.createElement('header');
    header.className = 'browser-card__header';
    const title = document.createElement('h2');
    title.className = 'browser-card__title';
    title.textContent = entry.name;
    header.appendChild(title);
    card.appendChild(header);

    if (entry.summary) {
      const summary = document.createElement('p');
      summary.className = 'browser-card__summary';
      summary.textContent = entry.summary;
      card.appendChild(summary);
    }

    const stats = document.createElement('div');
    stats.className = 'browser-card__stats';
    stats.append(
      createStat('Setup', `${formatHours(entry.setup?.hoursPerDay || 0)} • ${entry.setup?.days || 0} day${entry.setup?.days === 1 ? '' : 's'}`),
      createStat('Upkeep', entry.upkeep || 'No upkeep')
    );
    card.appendChild(stats);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-card__button browser-card__button--primary';
    button.textContent = entry.action?.label || 'Launch';
    button.disabled = Boolean(entry.action?.disabled);
    button.addEventListener('click', () => {
      if (button.disabled) return;
      entry.action?.onClick?.();
    });

    const actions = document.createElement('div');
    actions.className = 'browser-card__actions';
    actions.appendChild(button);
    card.appendChild(actions);

    launcherSection.appendChild(card);
  });

  container.appendChild(launcherSection);
}

function renderAssetsPage(definitions = [], models = {}) {
  const page = SERVICE_PAGES.find(entry => entry.type === 'assets');
  if (!page) return null;

  const refs = ensurePageContent(page, ({ body }) => {
    body.innerHTML = '';
  });
  if (!refs) return null;

  const groups = Array.isArray(models.groups) ? models.groups : [];
  const launchers = Array.isArray(models.launchers) ? models.launchers : [];
  let activeCount = 0;

  if (groups.length) {
    const groupGrid = document.createElement('div');
    groupGrid.className = 'browser-card-column';
    groups.forEach(group => {
      activeCount += group.instances.filter(instance => instance.status === 'active').length;
      renderAssetInstances(group, groupGrid);
    });
    refs.body.appendChild(groupGrid);
  }

  if (launchers.length) {
    renderAssetLaunchers(launchers, refs.body);
  }

  if (!refs.body.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'No ventures discovered yet. Launch your first asset to fill this feed.';
    refs.body.appendChild(empty);
  }

  return {
    id: page.id,
    meta: activeCount > 0 ? `${activeCount} active venture${activeCount === 1 ? '' : 's'}` : 'No active ventures yet'
  };
}

function renderUpgradeCard(definition, model) {
  const card = document.createElement('article');
  card.className = 'browser-card browser-card--upgrade';
  card.dataset.upgrade = model.id;
  card.dataset.ready = model.snapshot?.ready ? 'true' : 'false';
  card.dataset.purchased = model.snapshot?.purchased ? 'true' : 'false';

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = model.name;
  header.appendChild(title);
  card.appendChild(header);

  if (model.description) {
    const description = document.createElement('p');
    description.className = 'browser-card__summary';
    description.textContent = model.description;
    card.appendChild(description);
  }

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats';
  stats.append(
    createStat('Cost', `$${formatMoney(model.cost || 0)}`),
    createStat('Status', model.snapshot?.ready ? 'Ready to launch' : model.snapshot?.purchased ? 'Owned' : 'Locked')
  );
  card.appendChild(stats);

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'browser-card__button browser-card__button--primary';
  button.textContent = definition?.action?.label || 'Install';
  const disabled = model.snapshot?.purchased || model.snapshot?.disabled;
  button.disabled = Boolean(disabled) || !definition?.action;
  button.addEventListener('click', () => {
    if (button.disabled) return;
    definition.action?.onClick?.();
  });
  actions.appendChild(button);
  card.appendChild(actions);

  return card;
}

function renderUpgradesPage(definitions = [], models = {}) {
  const page = SERVICE_PAGES.find(entry => entry.type === 'upgrades');
  if (!page) return null;

  const refs = ensurePageContent(page, ({ body }) => {
    body.innerHTML = '';
  });
  if (!refs) return null;

  const definitionMap = buildDefinitionMap(definitions);
  const categories = Array.isArray(models.categories) ? models.categories : [];
  let readyCount = 0;

  const grid = document.createElement('div');
  grid.className = 'browser-card-grid';

  categories.forEach(category => {
    (category?.families || []).forEach(family => {
      (family?.definitions || []).forEach(model => {
        const definition = model.definition || definitionMap.get(model.id);
        if (!definition) return;
        if (model.snapshot?.ready) {
          readyCount += 1;
        }
        const card = renderUpgradeCard(definition, model);
        grid.appendChild(card);
      });
    });
  });

  if (!grid.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'No upgrades visible yet. Meet a prerequisite or stack more cash to unlock new toys.';
    refs.body.appendChild(empty);
  } else {
    refs.body.appendChild(grid);
  }

  return {
    id: page.id,
    meta: readyCount > 0 ? `${readyCount} upgrade${readyCount === 1 ? '' : 's'} ready` : 'Browse upgrades for upcoming boosts'
  };
}

function renderStudyCard(track) {
  const card = document.createElement('article');
  card.className = 'browser-card browser-card--study';
  card.dataset.track = track.id;
  card.dataset.completed = track.progress?.completed ? 'true' : 'false';

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = track.name;
  header.appendChild(title);
  card.appendChild(header);

  if (track.summary) {
    const summary = document.createElement('p');
    summary.className = 'browser-card__summary';
    summary.textContent = track.summary;
    card.appendChild(summary);
  }

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats';
  const dailyHours = Number(track.hoursPerDay) || 0;
  stats.append(
    createStat('Daily time', formatHours(dailyHours)),
    createStat('Duration', `${track.days || 0} day${track.days === 1 ? '' : 's'}`),
    createStat('Progress', `${track.progress?.daysCompleted ?? 0}/${track.progress?.totalDays ?? track.days}`)
  );
  card.appendChild(stats);

  if (track.description) {
    const detail = document.createElement('p');
    detail.className = 'browser-card__note';
    detail.textContent = track.description;
    card.appendChild(detail);
  }

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';
  if (track.action?.label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-card__button browser-card__button--primary';
    button.textContent = track.action.label;
    button.disabled = Boolean(track.action.disabled);
    button.addEventListener('click', () => {
      if (button.disabled) return;
      track.action?.onClick?.();
    });
    actions.appendChild(button);
  }
  card.appendChild(actions);

  return card;
}

function renderEducationPage(definitions = [], models = {}) {
  const page = SERVICE_PAGES.find(entry => entry.type === 'education');
  if (!page) return null;

  const refs = ensurePageContent(page, ({ body }) => {
    body.innerHTML = '';
  });
  if (!refs) return null;

  const tracks = Array.isArray(models.tracks) ? models.tracks : [];
  const grid = document.createElement('div');
  grid.className = 'browser-card-grid';
  let activeCount = 0;

  tracks.forEach(track => {
    if (track.progress?.enrolled && !track.progress?.completed) {
      activeCount += 1;
    }
    grid.appendChild(renderStudyCard(track));
  });

  if (!tracks.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Enroll in a course to light up this study hall.';
    refs.body.appendChild(empty);
  } else {
    refs.body.appendChild(grid);
  }

  return {
    id: page.id,
    meta: activeCount > 0 ? `${activeCount} active track${activeCount === 1 ? '' : 's'}` : 'No tracks running yet'
  };
}

function renderSiteList(summaries = []) {
  const list = getElement('siteList');
  if (!list) return;
  list.innerHTML = '';

  const summaryMap = new Map(summaries.map(entry => [entry?.id, entry]));
  const visiblePages = SERVICE_PAGES.filter(page => {
    const meta = summaryMap.get(page.id)?.meta || '';
    return !/lock/i.test(meta);
  });

  visiblePages.forEach(page => {
    const summary = summaryMap.get(page.id) || {};
    const li = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-app-card';
    button.dataset.siteTarget = page.id;
    button.setAttribute('aria-label', `${page.label} workspace`);

    const icon = document.createElement('span');
    icon.className = 'browser-app-card__icon';
    icon.textContent = page.icon || '✨';

    const header = document.createElement('div');
    header.className = 'browser-app-card__header';

    const title = document.createElement('span');
    title.className = 'browser-app-card__title';
    title.textContent = page.label;
    header.appendChild(title);

    if (summary.meta) {
      const badge = document.createElement('span');
      badge.className = 'browser-app-card__badge';
      badge.textContent = summary.meta;
      header.appendChild(badge);
    }

    const meta = document.createElement('p');
    meta.className = 'browser-app-card__meta';
    meta.textContent = page.tagline;

    button.append(icon, header, meta);
    li.appendChild(button);
    list.appendChild(li);
  });

  const addButton = getElement('addSiteButton');
  if (addButton) {
    addButton.classList.add('browser-app-button');
    const addWrapper = document.createElement('li');
    addWrapper.appendChild(addButton);
    list.appendChild(addWrapper);
  }

  const note = getElement('siteListNote');
  if (note) {
    note.textContent = visiblePages.length
      ? 'Launch into any app. Status badges refresh in real time.'
      : 'Unlock more workspaces through upgrades and courses.';
  }
}

function renderServices(registries = {}, models = {}) {
  cachedRegistries = registries;
  cachedModels = models;

  const summaries = [];
  const hustleSummary = renderHustlesPage(registries.hustles, models.hustles);
  if (hustleSummary) summaries.push(hustleSummary);
  const assetSummary = renderAssetsPage(registries.assets, models.assets);
  if (assetSummary) summaries.push(assetSummary);
  const upgradeSummary = renderUpgradesPage(registries.upgrades, models.upgrades);
  if (upgradeSummary) summaries.push(upgradeSummary);
  const educationSummary = renderEducationPage(registries.education, models.education);
  if (educationSummary) summaries.push(educationSummary);

  renderSiteList(summaries);
}

function renderAll(payload = {}) {
  const { registries = {}, models = {} } = payload;
  renderServices(registries, models);
}

function update(payload = {}) {
  renderAll(payload);
}

function updateCard() {
  if (!cachedRegistries || !cachedModels) return;
  renderServices(cachedRegistries, cachedModels);
}

function refreshUpgradeSections() {
  updateCard();
}

export default {
  renderAll,
  update,
  updateCard,
  refreshUpgradeSections
};
