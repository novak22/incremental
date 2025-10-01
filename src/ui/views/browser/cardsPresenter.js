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
  const host = getElement('workspaceHost');
  const container = host || document.getElementById('browser-workspaces');
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

function formatCurrency(amount) {
  const numeric = Number(amount);
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

function formatSignedCurrency(amount) {
  const numeric = Number(amount);
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
  return `${sign}$${formatted}`;
}

function createBankSection(title, note) {
  const section = document.createElement('section');
  section.className = 'bankapp-section';

  const header = document.createElement('header');
  header.className = 'bankapp-section__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  if (note) {
    const description = document.createElement('p');
    description.textContent = note;
    header.appendChild(description);
  }

  const body = document.createElement('div');
  body.className = 'bankapp-section__body';

  section.append(header, body);
  return { section, body };
}

function renderFinanceHeader(model = {}) {
  const container = document.createElement('section');
  container.className = 'bankapp__header';

  const summary = document.createElement('div');
  summary.className = 'bankapp-summary';

  const cards = [
    { label: 'Cash on hand', value: formatCurrency(model.cashOnHand || 0) },
    { label: 'Net today', value: formatSignedCurrency(model.netDaily || 0) },
    { label: 'Lifetime earned', value: formatCurrency(model.lifetimeEarned || 0) },
    { label: 'Lifetime spent', value: formatCurrency(model.lifetimeSpent || 0) }
  ];

  cards.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-summary__card';
    const label = document.createElement('span');
    label.className = 'bankapp-summary__label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'bankapp-summary__value';
    value.textContent = entry.value;
    card.append(label, value);
    summary.appendChild(card);
  });

  container.appendChild(summary);

  const pulseEntries = Array.isArray(model.pulse) ? model.pulse : [];
  if (pulseEntries.length) {
    const pulse = document.createElement('div');
    pulse.className = 'bankapp-pulse';
    pulseEntries.forEach(entry => {
      const item = document.createElement('span');
      item.className = `bankapp-pulse__item bankapp-pulse__item--${entry.direction === 'out' ? 'out' : 'in'}`;
      const icon = document.createElement('span');
      icon.className = 'bankapp-pulse__icon';
      icon.textContent = entry.icon || (entry.direction === 'out' ? '📉' : '💵');
      const label = document.createElement('span');
      label.className = 'bankapp-pulse__label';
      const amountText = formatSignedCurrency(entry.direction === 'out' ? -entry.amount : entry.amount);
      label.textContent = `${amountText} ${entry.label}`;
      item.append(icon, label);
      pulse.appendChild(item);
    });
    container.appendChild(pulse);
  }

  if (model.quickObligation) {
    const pill = document.createElement('div');
    pill.className = 'bankapp-pill';
    const label = document.createElement('span');
    label.className = 'bankapp-pill__label';
    label.textContent = model.quickObligation.label || 'Obligation';
    const value = document.createElement('span');
    value.className = 'bankapp-pill__value';
    value.textContent = formatCurrency(model.quickObligation.amount || 0);
    const note = document.createElement('span');
    note.className = 'bankapp-pill__note';
    note.textContent = model.quickObligation.note || '';
    pill.append(label, value, note);
    container.appendChild(pill);
  }

  if (model.topEarner) {
    const badge = document.createElement('div');
    badge.className = 'bankapp-badge';
    const icon = document.createElement('span');
    icon.className = 'bankapp-badge__icon';
    icon.textContent = '🏅';
    const body = document.createElement('div');
    body.className = 'bankapp-badge__body';
    const title = document.createElement('span');
    title.className = 'bankapp-badge__title';
    title.textContent = 'Top earner today';
    const value = document.createElement('span');
    value.className = 'bankapp-badge__value';
    value.textContent = `${model.topEarner.label} • ${formatCurrency(model.topEarner.amount || 0)}`;
    body.append(title, value);
    badge.append(icon, body);
    container.appendChild(badge);
  }

  return container;
}

function createLedgerColumn(title, entries = [], direction = 'in') {
  const column = document.createElement('article');
  column.className = `bankapp-ledger__column bankapp-ledger__column--${direction}`;

  const heading = document.createElement('h3');
  heading.textContent = title;
  column.appendChild(heading);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = direction === 'out'
      ? 'No spending recorded yet.'
      : 'No earnings logged today.';
    column.appendChild(empty);
    return column;
  }

  entries.forEach(group => {
    const card = document.createElement('div');
    card.className = 'bankapp-ledger-group';

    const header = document.createElement('div');
    header.className = 'bankapp-ledger-group__header';
    const icon = document.createElement('span');
    icon.className = 'bankapp-ledger-group__icon';
    icon.textContent = group.icon || (direction === 'out' ? '📉' : '💵');
    const label = document.createElement('span');
    label.className = 'bankapp-ledger-group__title';
    label.textContent = group.label || 'Ledger';
    const total = document.createElement('span');
    total.className = 'bankapp-ledger-group__total';
    const signed = direction === 'out' ? -group.total : group.total;
    total.textContent = formatSignedCurrency(signed);
    header.append(icon, label, total);
    card.appendChild(header);

    if (group.entries?.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-ledger-group__list';
      group.entries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'bankapp-ledger-group__item';
        const name = document.createElement('span');
        name.className = 'bankapp-ledger-group__name';
        name.textContent = entry.label;
        const amount = document.createElement('span');
        amount.className = 'bankapp-ledger-group__amount';
        const signedAmount = direction === 'out' ? -entry.amount : entry.amount;
        amount.textContent = formatSignedCurrency(signedAmount);
        item.append(name, amount);
        if (entry.note) {
          const note = document.createElement('span');
          note.className = 'bankapp-ledger-group__note';
          note.textContent = entry.note;
          item.appendChild(note);
        }
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    column.appendChild(card);
  });

  return column;
}

function renderFinanceLedger(model = {}) {
  const { section, body } = createBankSection('Daily Cashflow (Ledger)', 'Today’s payouts and costs grouped by stream.');

  const ledger = document.createElement('div');
  ledger.className = 'bankapp-ledger';
  ledger.append(
    createLedgerColumn('Inflows', Array.isArray(model.inflows) ? model.inflows : [], 'in'),
    createLedgerColumn('Outflows', Array.isArray(model.outflows) ? model.outflows : [], 'out')
  );

  body.appendChild(ledger);
  return section;
}

function renderFinanceObligations(model = {}) {
  const { section, body } = createBankSection('Pending & Upcoming Obligations', 'Keep upkeep, payroll, and tuition funded.');
  const entries = Array.isArray(model.entries) ? model.entries : [];

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No obligations queued. Everything is funded!';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-obligations';

  entries.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--obligation';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.label || 'Obligation';
    const amount = document.createElement('span');
    amount.className = 'bankapp-card__amount';
    amount.textContent = formatCurrency(entry.amount || 0);
    header.append(title, amount);
    card.appendChild(header);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'bankapp-card__note';
      note.textContent = entry.note;
      card.appendChild(note);
    }

    if (Array.isArray(entry.items) && entry.items.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-card__list';
      entry.items.forEach(item => {
        const row = document.createElement('li');
        row.className = 'bankapp-card__list-item';
        const name = document.createElement('span');
        name.textContent = item.label || 'Entry';
        const value = document.createElement('span');
        value.textContent = formatCurrency(item.amount || 0);
        row.append(name, value);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}

function renderFinancePendingIncome(entries = []) {
  const { section, body } = createBankSection('In-Flight Earnings', 'Assets with payouts pending the next day rollover.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No pending payouts. Every asset has settled for today.';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-pending';

  list.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--pending';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.label || entry.assetName || 'Asset';
    const amount = document.createElement('span');
    amount.className = 'bankapp-card__amount';
    amount.textContent = formatCurrency(entry.amount || 0);
    header.append(title, amount);
    card.appendChild(header);

    if (entry.assetName) {
      const note = document.createElement('p');
      note.className = 'bankapp-card__note';
      note.textContent = entry.assetName;
      card.appendChild(note);
    }

    if (entry.breakdown?.length) {
      const listEl = document.createElement('ul');
      listEl.className = 'bankapp-card__list';
      entry.breakdown.forEach(item => {
        if (!item || !item.amount) return;
        const row = document.createElement('li');
        row.className = 'bankapp-card__list-item';
        const label = document.createElement('span');
        label.textContent = item.label || 'Breakdown';
        const value = document.createElement('span');
        value.textContent = formatCurrency(item.amount || 0);
        row.append(label, value);
        listEl.appendChild(row);
      });
      card.appendChild(listEl);
    }

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}

function renderFinancePerformance(entries = []) {
  const { section, body } = createBankSection('Asset Performance Table', 'Active instances ranked by average daily return.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active assets yet. Launch a venture to start tracking ROI.';
    body.appendChild(empty);
    return section;
  }

  const table = document.createElement('table');
  table.className = 'bankapp-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Asset', 'Avg / day', 'Latest yield', 'Upkeep', 'Resale value'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  list.forEach(entry => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = entry.label || entry.assetName || 'Asset';
    const average = document.createElement('td');
    average.textContent = formatCurrency(entry.average || 0);
    const latest = document.createElement('td');
    latest.textContent = formatCurrency(entry.latest || 0);
    const upkeep = document.createElement('td');
    upkeep.textContent = formatCurrency(entry.upkeep || 0);
    const sale = document.createElement('td');
    sale.textContent = formatCurrency(entry.saleValue || 0);
    row.append(name, average, latest, upkeep, sale);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  body.appendChild(table);
  return section;
}

function renderFinanceOpportunities(model = {}) {
  const { section, body } = createBankSection('Investments & Opportunity Costs', 'Line up future launches, upgrades, and hustles.');

  const container = document.createElement('div');
  container.className = 'bankapp-opportunities';

  const assetEntries = Array.isArray(model.assets) ? model.assets.slice(0, 4) : [];
  const upgradeEntries = Array.isArray(model.upgrades) ? model.upgrades.slice(0, 4) : [];
  const hustleEntries = Array.isArray(model.hustles) ? model.hustles.slice(0, 4) : [];

  function createOpportunityBlock(title, entries, renderItem) {
    const block = document.createElement('article');
    block.className = 'bankapp-opportunities__block';
    const heading = document.createElement('h3');
    heading.textContent = title;
    block.appendChild(heading);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'bankapp-empty';
      empty.textContent = 'Nothing queued yet.';
      block.appendChild(empty);
      return block;
    }
    const list = document.createElement('ul');
    list.className = 'bankapp-opportunities__list';
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'bankapp-opportunities__item';
      renderItem(entry, item);
      list.appendChild(item);
    });
    block.appendChild(list);
    return block;
  }

  container.append(
    createOpportunityBlock('Assets', assetEntries, (entry, node) => {
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Asset';
      const cost = document.createElement('span');
      cost.className = 'bankapp-opportunities__value';
      cost.textContent = formatCurrency(entry.cost || 0);
      const note = document.createElement('span');
      note.className = 'bankapp-opportunities__note';
      const ready = entry.ready ? 'Ready to launch' : 'Prereqs pending';
      const payout = entry.payoutRange
        ? `Est. $${formatMoney(entry.payoutRange.min || 0)}–$${formatMoney(entry.payoutRange.max || 0)} / day`
        : '';
      const setup = entry.setup
        ? `${entry.setup.days || 0} day${entry.setup.days === 1 ? '' : 's'} • ${formatHours(entry.setup.hoursPerDay || 0)}/day`
        : '';
      note.textContent = [ready, payout, setup].filter(Boolean).join(' • ');
      node.append(name, cost, note);
    }),
    createOpportunityBlock('Upgrades', upgradeEntries, (entry, node) => {
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Upgrade';
      const cost = document.createElement('span');
      cost.className = 'bankapp-opportunities__value';
      cost.textContent = formatCurrency(entry.cost || 0);
      const status = document.createElement('span');
      status.className = 'bankapp-opportunities__note';
      if (entry.purchased) {
        status.textContent = 'Owned';
      } else if (entry.ready) {
        status.textContent = 'Affordable now';
      } else if (!entry.affordable) {
        status.textContent = 'Save up to unlock';
      } else {
        status.textContent = 'Requirements pending';
      }
      node.append(name, cost, status);
    }),
    createOpportunityBlock('Hustles', hustleEntries, (entry, node) => {
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Hustle';
      const roi = document.createElement('span');
      roi.className = 'bankapp-opportunities__value';
      const payout = Number(entry.payout) || 0;
      const time = Number(entry.time) || 0;
      const roiValue = time > 0 ? payout / time : payout;
      roi.textContent = `${formatCurrency(payout)} • ${formatHours(time)} • ${formatMoney(Math.round(roiValue * 100) / 100)} $/h`;
      const requirements = document.createElement('span');
      requirements.className = 'bankapp-opportunities__note';
      const unmet = entry.requirements?.filter(req => !req.met).map(req => req.label);
      requirements.textContent = unmet?.length ? `Needs: ${unmet.join(', ')}` : 'Ready to run';
      node.append(name, roi, requirements);
    })
  );

  body.appendChild(container);
  return section;
}

function renderFinanceEducation(entries = []) {
  const { section, body } = createBankSection('Education Investments', 'Courses in progress with tuition already committed.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active courses. Enroll in a study track to plan tuition.';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-education';

  list.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--education';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.name || 'Course';
    const tuition = document.createElement('span');
    tuition.className = 'bankapp-card__amount';
    tuition.textContent = entry.tuition > 0 ? formatCurrency(entry.tuition) : 'Free';
    header.append(title, tuition);
    card.appendChild(header);

    const note = document.createElement('p');
    note.className = 'bankapp-card__note';
    note.textContent = `${entry.remainingDays} day${entry.remainingDays === 1 ? '' : 's'} left • ${formatHours(entry.hoursPerDay || 0)}/day`;
    card.appendChild(note);

    if (entry.bonus) {
      const bonus = document.createElement('p');
      bonus.className = 'bankapp-card__note bankapp-card__note--muted';
      bonus.textContent = entry.bonus;
      card.appendChild(bonus);
    }

    const status = document.createElement('p');
    status.className = 'bankapp-card__status';
    status.textContent = entry.studiedToday ? 'Today’s study scheduled' : 'Waiting for today’s study slot';
    card.appendChild(status);

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}

function renderFinancePage(model = {}) {
  const page = SERVICE_PAGES.find(entry => entry.type === 'finance');
  if (!page) return null;

  const refs = ensurePageContent(page, ({ body }) => {
    body.innerHTML = '';
    body.classList.add('bankapp');
  });
  if (!refs) return null;

  const container = document.createElement('div');
  container.className = 'bankapp';

  if (model.header) {
    container.appendChild(renderFinanceHeader(model.header));
  }
  container.appendChild(renderFinanceLedger(model.ledger || {}));
  container.appendChild(renderFinanceObligations(model.obligations || {}));
  container.appendChild(renderFinancePendingIncome(model.pendingIncome || []));
  container.appendChild(renderFinancePerformance(model.assetPerformance || []));
  container.appendChild(renderFinanceOpportunities(model.opportunities || {}));
  container.appendChild(renderFinanceEducation(model.education || []));

  refs.body.appendChild(container);

  return {
    id: page.id,
    meta: model.summary?.meta || 'Finance dashboard ready'
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
  const financeSummary = renderFinancePage(models.finance);
  if (financeSummary) summaries.push(financeSummary);

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
