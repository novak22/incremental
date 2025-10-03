import { formatHours, formatMoney } from '../../../../core/helpers.js';
import {
  getQuickActionIds as getDigishelfQuickActionIds,
  selectDigishelfNiche
} from '../../../cards/model/digishelf.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import { formatCurrency as baseFormatCurrency } from '../utils/formatting.js';
import { createDailyLifecycleSummary } from '../utils/lifecycleSummaries.js';
import { showLaunchConfirmation } from '../utils/launchDialog.js';

const VIEW_EBOOKS = 'ebooks';
const VIEW_STOCK = 'stock';
const VIEW_PRICING = 'pricing';

const QUICK_ACTION_LABELS = {
  ebook: {
    writeChapter: 'Write Volume'
  },
  stockPhotos: {
    planShoot: 'Launch Gallery',
    batchEdit: 'Upload Batch'
  }
};

let currentState = {
  view: VIEW_EBOOKS,
  selectedType: 'ebook',
  selectedId: null,
  launchOpen: false
};

let currentModel = {
  ebook: { instances: [], summary: {}, launch: null },
  stock: { instances: [], summary: {}, launch: null },
  overview: { meta: '' },
  pricing: [],
  summary: { meta: '' }
};

let currentMount = null;
let currentPage = null;

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });

const {
  describeSetupSummary: describeLaunchSetup,
  describeUpkeepSummary: describeLaunchUpkeep
} = createDailyLifecycleSummary({
  parseValue: clampNumber,
  formatHoursValue: formatHours,
  formatSetupCost: cost => `$${formatMoney(cost)} upfront`,
  formatUpkeepCost: cost => `$${formatMoney(cost)} per day`,
  setupFallback: 'Instant launch',
  upkeepFallback: 'No upkeep required'
});

function confirmResourceLaunch(definition = {}) {
  const resourceName = definition.singular || definition.name || 'collection';
  const setupSummary = describeLaunchSetup(definition.setup);
  const upkeepSummary = describeLaunchUpkeep(definition.maintenance);
  return showLaunchConfirmation({
    theme: 'digishelf',
    icon: '📚',
    title: 'Publish this lineup?',
    resourceName,
    tagline: 'Preview the commitment, then dazzle the marketplace.',
    setupSummary,
    upkeepSummary,
    confirmLabel: 'Ship it',
    cancelLabel: 'Maybe later'
  });
}

function ensureState(model) {
  const ebookInstances = Array.isArray(model.ebook?.instances) ? model.ebook.instances : [];
  const stockInstances = Array.isArray(model.stock?.instances) ? model.stock.instances : [];
  const hasEbooks = ebookInstances.length > 0;
  const hasStock = stockInstances.length > 0;

  if (currentState.view === VIEW_EBOOKS && !hasEbooks && hasStock) {
    currentState.view = VIEW_STOCK;
  }
  if (currentState.view === VIEW_STOCK && !hasStock && hasEbooks) {
    currentState.view = VIEW_EBOOKS;
  }

  const preferredType = currentState.view === VIEW_STOCK ? 'stockPhotos' : 'ebook';
  if (!hasEbooks && !hasStock) {
    currentState.selectedId = null;
    currentState.selectedType = preferredType;
    return;
  }

  const collection = preferredType === 'ebook' ? ebookInstances : stockInstances;
  if (!collection.length) {
    currentState.selectedId = null;
    currentState.selectedType = preferredType;
    return;
  }

  const active = collection.find(entry => entry.status?.id === 'active');
  const fallback = collection[0];
  const existing = collection.find(entry => entry.id === currentState.selectedId);
  const nextSelection = existing || active || fallback;
  currentState.selectedId = nextSelection?.id || null;
  currentState.selectedType = preferredType;
}

function setView(view) {
  currentState.view = view;
  if (view === VIEW_EBOOKS) {
    currentState.selectedType = 'ebook';
  } else if (view === VIEW_STOCK) {
    currentState.selectedType = 'stockPhotos';
  }
  ensureState(currentModel);
  render(currentModel, { mount: currentMount, page: currentPage });
}

function toggleLaunchPanel() {
  currentState.launchOpen = !currentState.launchOpen;
  render(currentModel, { mount: currentMount, page: currentPage });
}

function selectInstance(type, id) {
  currentState.selectedType = type;
  currentState.selectedId = id;
  render(currentModel, { mount: currentMount, page: currentPage });
}

function handleQualityAction(assetId, instanceId, actionId) {
  if (!assetId || !instanceId || !actionId) return;
  performQualityAction(assetId, instanceId, actionId);
}

function handleNicheSelect(assetId, instanceId, value) {
  if (!assetId || !instanceId || !value) return;
  selectDigishelfNiche(assetId, instanceId, value);
}

function createHeroStat(label, value, tone = 'default') {
  const stat = document.createElement('div');
  stat.className = `digishelf-hero__stat digishelf-hero__stat--${tone}`;

  const statValue = document.createElement('span');
  statValue.className = 'digishelf-hero__value';
  statValue.textContent = value;
  const statLabel = document.createElement('span');
  statLabel.className = 'digishelf-hero__label';
  statLabel.textContent = label;

  stat.append(statValue, statLabel);
  return stat;
}

function renderLaunchCard(assetId, model) {
  if (!model?.definition || !model.launch) {
    const locked = document.createElement('article');
    locked.className = 'digishelf-launch digishelf-launch--locked';
    const heading = document.createElement('h3');
    heading.textContent = 'Locked';
    const note = document.createElement('p');
    note.textContent = 'Complete requirements in the classic dashboard to unlock this resource.';
    locked.append(heading, note);
    return locked;
  }

  const card = document.createElement('article');
  card.className = 'digishelf-launch';

  const title = document.createElement('h3');
  title.textContent = model.definition.name;

  const summary = document.createElement('p');
  summary.textContent = model.definition.description || 'Launch a fresh income stream in minutes.';

  const meta = document.createElement('p');
  meta.className = 'digishelf-launch__meta';
  const setup = model.definition.setup || {};
  const upkeep = model.definition.maintenance || {};
  const setupSummary = describeLaunchSetup(setup);
  const upkeepSummary = describeLaunchUpkeep(upkeep);
  meta.textContent = `${setupSummary} • ${upkeepSummary}`;

  const actions = document.createElement('div');
  actions.className = 'digishelf-launch__actions';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--primary';
  button.textContent = model.launch.label || 'Launch';
  button.disabled = Boolean(model.launch.disabled || model.launch.availability?.disabled);
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    const confirmed = await confirmResourceLaunch(model.definition);
    if (!confirmed) {
      return;
    }
    model.launch.onClick?.();
  });

  actions.appendChild(button);

  if (Array.isArray(model.launch.availability?.reasons) && model.launch.availability.reasons.length) {
    const reasons = document.createElement('ul');
    reasons.className = 'digishelf-launch__reasons';
    model.launch.availability.reasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      reasons.appendChild(item);
    });
    card.append(title, summary, meta, actions, reasons);
  } else {
    card.append(title, summary, meta, actions);
  }

  card.dataset.assetId = assetId;
  return card;
}

function renderHero(model) {
  const hero = document.createElement('section');
  hero.className = 'digishelf-hero';

  const copy = document.createElement('div');
  copy.className = 'digishelf-hero__copy';

  const heading = document.createElement('h1');
  heading.textContent = 'DigiShelf';

  const subheading = document.createElement('p');
  subheading.textContent = 'Your digital creations, one shelf away from the world.';

  copy.append(heading, subheading);

  const stats = document.createElement('div');
  stats.className = 'digishelf-hero__stats';
  stats.append(
    createHeroStat('Active E-Book Series', `${model.overview?.ebooksActive ?? 0}`),
    createHeroStat('Active Photo Galleries', `${model.overview?.stockActive ?? 0}`),
    createHeroStat('Daily Royalties', formatCurrency(model.overview?.totalDaily ?? 0), 'accent')
  );

  const actions = document.createElement('div');
  actions.className = 'digishelf-hero__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--primary';
  button.textContent = 'Publish a new resource';
  button.addEventListener('click', toggleLaunchPanel);

  actions.appendChild(button);

  hero.append(copy, stats, actions);

  if (currentState.launchOpen) {
    const launchPanel = document.createElement('div');
    launchPanel.className = 'digishelf-launcher';
    launchPanel.append(
      renderLaunchCard('ebook', model.ebook),
      renderLaunchCard('stockPhotos', model.stock)
    );
    hero.appendChild(launchPanel);
  }

  return hero;
}

function createTabButton(label, view) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-tab';
  if (currentState.view === view) {
    button.classList.add('is-active');
  }
  button.textContent = label;
  button.addEventListener('click', () => setView(view));
  return button;
}

function renderTabs() {
  const nav = document.createElement('nav');
  nav.className = 'digishelf-tabs';
  nav.append(
    createTabButton('E-Books', VIEW_EBOOKS),
    createTabButton('Stock Photos', VIEW_STOCK),
    createTabButton('Pricing & Plans', VIEW_PRICING)
  );
  return nav;
}

function renderStatusBadge(instance) {
  const badge = document.createElement('span');
  badge.className = `digishelf-badge digishelf-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  return badge;
}

function renderUpkeepCell(instance) {
  const wrapper = document.createElement('div');
  wrapper.className = 'digishelf-upkeep';
  const maintenance = instance.maintenance;
  if (maintenance?.parts?.length) {
    const value = document.createElement('strong');
    value.textContent = maintenance.parts.join(' + ');
    wrapper.appendChild(value);
  } else {
    const none = document.createElement('span');
    none.textContent = 'None';
    wrapper.appendChild(none);
  }

  const status = document.createElement('span');
  status.className = instance.maintenanceFunded
    ? 'digishelf-upkeep__status is-funded'
    : 'digishelf-upkeep__status is-missed';
  status.textContent = instance.maintenanceFunded ? 'Funded' : 'Skipped today';
  wrapper.appendChild(status);
  return wrapper;
}

function renderActionButton(label, { disabled = false, title = '', onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'digishelf-button digishelf-button--ghost';
  button.textContent = label;
  button.disabled = Boolean(disabled);
  if (title) {
    button.title = title;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onClick?.();
  });
  return button;
}

function findActionById(instance, actionId) {
  if (!actionId) return null;
  return instance.actions?.find(action => action.id === actionId) || null;
}

function renderEbookRow(instance) {
  const row = document.createElement('tr');
  row.dataset.instanceId = instance.id;
  if (currentState.selectedType === 'ebook' && currentState.selectedId === instance.id) {
    row.classList.add('is-selected');
  }

  row.addEventListener('click', () => selectInstance('ebook', instance.id));

  const titleCell = document.createElement('td');
  titleCell.className = 'digishelf-cell digishelf-cell--label';
  const title = document.createElement('div');
  title.className = 'digishelf-label';
  const name = document.createElement('strong');
  name.textContent = instance.label;
  const status = renderStatusBadge(instance);
  title.append(name, status);
  titleCell.appendChild(title);

  const earningsCell = document.createElement('td');
  earningsCell.className = 'digishelf-cell digishelf-cell--earnings';
  const payout = document.createElement('strong');
  payout.textContent = formatCurrency(instance.latestPayout || instance.averagePayout);
  const range = document.createElement('span');
  range.textContent = `${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  earningsCell.append(payout, range);

  const milestoneCell = document.createElement('td');
  milestoneCell.className = 'digishelf-cell';
  const milestone = document.createElement('div');
  milestone.className = 'digishelf-milestone';
  const level = document.createElement('strong');
  level.textContent = `Quality ${instance.milestone?.level ?? 0}`;
  const summary = document.createElement('span');
  summary.textContent = instance.milestone?.summary || 'Progress brewing.';
  milestone.append(level, summary);
  milestoneCell.appendChild(milestone);

  const upkeepCell = document.createElement('td');
  upkeepCell.className = 'digishelf-cell';
  upkeepCell.appendChild(renderUpkeepCell(instance));

  const actionsCell = document.createElement('td');
  actionsCell.className = 'digishelf-cell digishelf-cell--actions';
  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'digishelf-actions';

  const quickActions = getDigishelfQuickActionIds('ebook');
  quickActions.forEach(actionId => {
    const action = findActionById(instance, actionId);
    if (!action) return;
    const label = QUICK_ACTION_LABELS.ebook?.[actionId] || action.label;
    const button = renderActionButton(label, {
      disabled: !action.available,
      title: action.disabledReason,
      onClick: () => handleQualityAction('ebook', instance.id, actionId)
    });
    actionWrapper.appendChild(button);
  });

  const detailButton = renderActionButton('View Details', {
    onClick: () => selectInstance('ebook', instance.id)
  });
  actionWrapper.appendChild(detailButton);

  actionsCell.appendChild(actionWrapper);

  row.append(titleCell, earningsCell, milestoneCell, upkeepCell, actionsCell);
  return row;
}

function renderStockRow(instance) {
  const row = document.createElement('tr');
  row.dataset.instanceId = instance.id;
  if (currentState.selectedType === 'stockPhotos' && currentState.selectedId === instance.id) {
    row.classList.add('is-selected');
  }

  row.addEventListener('click', () => selectInstance('stockPhotos', instance.id));

  const titleCell = document.createElement('td');
  titleCell.className = 'digishelf-cell digishelf-cell--label';
  const label = document.createElement('div');
  label.className = 'digishelf-label';
  const name = document.createElement('strong');
  name.textContent = instance.label;
  const status = renderStatusBadge(instance);
  label.append(name, status);
  titleCell.appendChild(label);

  const photosCell = document.createElement('td');
  photosCell.className = 'digishelf-cell';
  const totalShoots = clampNumber(instance.progress?.shoots);
  const totalEdits = clampNumber(instance.progress?.editing);
  const uploads = document.createElement('strong');
  uploads.textContent = `${totalShoots} shoots / ${totalEdits} edits`;
  const hint = document.createElement('span');
  hint.textContent = 'Shoots • Edits logged';
  photosCell.append(uploads, hint);

  const earningsCell = document.createElement('td');
  earningsCell.className = 'digishelf-cell digishelf-cell--earnings';
  const payout = document.createElement('strong');
  payout.textContent = formatCurrency(instance.latestPayout || instance.averagePayout);
  const range = document.createElement('span');
  range.textContent = `${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  earningsCell.append(payout, range);

  const upkeepCell = document.createElement('td');
  upkeepCell.className = 'digishelf-cell';
  upkeepCell.appendChild(renderUpkeepCell(instance));

  const actionsCell = document.createElement('td');
  actionsCell.className = 'digishelf-cell digishelf-cell--actions';
  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'digishelf-actions';

  const quickActions = getDigishelfQuickActionIds('stockPhotos');
  quickActions.forEach(actionId => {
    const action = findActionById(instance, actionId);
    if (!action) return;
    const label = QUICK_ACTION_LABELS.stockPhotos?.[actionId] || action.label;
    const button = renderActionButton(label, {
      disabled: !action.available,
      title: action.disabledReason,
      onClick: () => handleQualityAction('stockPhotos', instance.id, actionId)
    });
    actionWrapper.appendChild(button);
  });

  const detailLink = document.createElement('button');
  detailLink.type = 'button';
  detailLink.className = 'digishelf-button digishelf-button--link';
  detailLink.textContent = 'View Details';
  detailLink.addEventListener('click', event => {
    event.stopPropagation();
    selectInstance('stockPhotos', instance.id);
  });
  actionWrapper.appendChild(detailLink);

  actionsCell.appendChild(actionWrapper);

  row.append(titleCell, photosCell, earningsCell, upkeepCell, actionsCell);
  return row;
}

function renderTable(instances, type) {
  const table = document.createElement('table');
  table.className = 'digishelf-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const headers = type === 'ebook'
    ? ['Title', 'Daily Earnings', 'Quality Milestone', 'Upkeep', 'Actions']
    : ['Gallery', 'Photos Uploaded', 'Daily Earnings', 'Upkeep', 'Actions'];

  headers.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!instances.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = headers.length;
    emptyCell.className = 'digishelf-empty';
    emptyCell.textContent = type === 'ebook'
      ? 'No e-book series live yet. Spin one up to start collecting royalties.'
      : 'No stock galleries live yet. Launch a collection to start syndicating shots.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    instances.forEach(instance => {
      const row = type === 'ebook'
        ? renderEbookRow(instance)
        : renderStockRow(instance);
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
}

function createSection(titleText) {
  const section = document.createElement('section');
  section.className = 'digishelf-panel';
  const header = document.createElement('header');
  header.className = 'digishelf-panel__header';
  const title = document.createElement('h3');
  title.textContent = titleText;
  header.appendChild(title);
  section.appendChild(header);
  return section;
}

function renderNichePanel(instance, assetId) {
  const panel = createSection('Audience Niche');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (instance.niche) {
    const badge = document.createElement('div');
    badge.className = 'digishelf-niche';
    const name = document.createElement('strong');
    name.textContent = instance.niche.name;
    const note = document.createElement('span');
    note.textContent = instance.niche.summary || 'Steady interest today';
    badge.append(name, note);
    content.appendChild(badge);
  }

  if (!instance.nicheLocked && Array.isArray(instance.nicheOptions) && instance.nicheOptions.length) {
    const field = document.createElement('label');
    field.className = 'digishelf-field';
    field.textContent = 'Assign a niche';
    const select = document.createElement('select');
    select.className = 'digishelf-select';
    select.innerHTML = '<option value="">Choose a niche</option>';
    instance.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} (${option.label || 'steady'})`;
      select.appendChild(opt);
    });
    select.addEventListener('change', event => {
      const { value } = event.target;
      if (value) {
        handleNicheSelect(assetId, instance.id, value);
      }
    });
    content.appendChild(field);
    content.appendChild(select);
  } else if (!instance.niche) {
    const hint = document.createElement('p');
    hint.className = 'digishelf-panel__hint';
    hint.textContent = 'Niches unlock after launch wraps. Check back tomorrow!';
    content.appendChild(hint);
  } else {
    const locked = document.createElement('p');
    locked.className = 'digishelf-panel__hint';
    locked.textContent = 'Niche locked in — ride the trend and stack modifiers.';
    content.appendChild(locked);
  }

  panel.appendChild(content);
  return panel;
}

function renderQualityPanel(instance) {
  const panel = createSection('Quality Ladder');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  const header = document.createElement('div');
  header.className = 'digishelf-quality';
  const level = document.createElement('strong');
  level.textContent = `Quality ${instance.milestone?.level ?? 0}`;
  const note = document.createElement('span');
  note.textContent = instance.qualityInfo?.name || 'Milestone in progress';
  header.append(level, note);

  const progress = document.createElement('div');
  progress.className = 'digishelf-progress';
  const fill = document.createElement('div');
  fill.className = 'digishelf-progress__fill';
  fill.style.setProperty('--digishelf-progress', `${Math.round((instance.milestone?.percent ?? 0) * 100)}%`);
  progress.appendChild(fill);

  const summary = document.createElement('p');
  summary.className = 'digishelf-panel__hint';
  summary.textContent = instance.milestone?.summary || 'Complete milestone actions to unlock bigger payouts.';

  content.append(header, progress, summary);

  panel.appendChild(content);
  return panel;
}

function renderPayoutPanel(instance) {
  const panel = createSection('Payout Recap');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (instance.payoutBreakdown?.entries?.length) {
    const list = document.createElement('ul');
    list.className = 'digishelf-list';
    instance.payoutBreakdown.entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'digishelf-list__item';
      const label = document.createElement('span');
      label.className = 'digishelf-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'digishelf-list__value';
      value.textContent = entry.percent !== null
        ? `${Math.round(entry.percent * 100)}%`
        : formatCurrency(entry.amount);
      item.append(label, value);
      list.appendChild(item);
    });
    const total = document.createElement('div');
    total.className = 'digishelf-panel__total';
    total.textContent = `Today: ${formatCurrency(instance.payoutBreakdown.total)}`;
    content.append(list, total);
  } else {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'Complete launch and upkeep to start logging daily royalties.';
    content.appendChild(empty);
  }

  panel.appendChild(content);
  return panel;
}

function renderRoiPanel(instance) {
  const panel = createSection('Lifetime ROI');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body digishelf-panel__body--grid';

  const spend = document.createElement('div');
  spend.className = 'digishelf-stat';
  spend.innerHTML = `<span class="digishelf-stat__label">Invested</span><strong class="digishelf-stat__value">${formatCurrency(instance.estimatedSpend)}</strong>`;

  const earned = document.createElement('div');
  earned.className = 'digishelf-stat';
  earned.innerHTML = `<span class="digishelf-stat__label">Earned</span><strong class="digishelf-stat__value">${formatCurrency(instance.lifetimeIncome)}</strong>`;

  const roi = document.createElement('div');
  roi.className = 'digishelf-stat';
  const roiValue = Number.isFinite(instance.roi) ? `${Math.round(instance.roi * 100)}%` : '—';
  roi.innerHTML = `<span class="digishelf-stat__label">Return</span><strong class="digishelf-stat__value">${roiValue}</strong>`;

  content.append(spend, earned, roi);
  panel.appendChild(content);
  return panel;
}

function renderActionPanel(instance, assetId) {
  const panel = createSection('Action Queue');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (!instance.actions || !instance.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'No quality actions unlocked yet.';
    content.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'digishelf-action-list';
    instance.actions.forEach(action => {
      const item = document.createElement('li');
      item.className = 'digishelf-action';
      const label = document.createElement('div');
      label.className = 'digishelf-action__label';
      label.textContent = action.label;
      const meta = document.createElement('div');
      meta.className = 'digishelf-action__meta';
      const parts = [];
      if (action.time > 0) parts.push(formatHours(action.time));
      if (action.cost > 0) parts.push(`$${formatMoney(action.cost)}`);
      meta.textContent = parts.join(' • ') || 'No cost';
      const button = renderActionButton('Run Action', {
        disabled: !action.available,
        title: action.disabledReason,
        onClick: () => handleQualityAction(assetId, instance.id, action.id)
      });
      item.append(label, meta, button);
      list.appendChild(item);
    });
    content.appendChild(list);
  }

  panel.appendChild(content);
  return panel;
}

function renderDetail(instance, assetId) {
  const aside = document.createElement('aside');
  aside.className = 'digishelf-detail';

  if (!instance) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'Select a resource to review milestones, modifiers, and ROI.';
    aside.appendChild(empty);
    return aside;
  }

  const header = document.createElement('header');
  header.className = 'digishelf-detail__header';
  const name = document.createElement('h2');
  name.textContent = instance.label;
  const status = renderStatusBadge(instance);
  const payout = document.createElement('p');
  payout.className = 'digishelf-detail__payout';
  payout.textContent = `Today ${formatCurrency(instance.latestPayout)} • Range ${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  header.append(name, status, payout);

  aside.append(
    header,
    renderNichePanel(instance, assetId),
    renderQualityPanel(instance),
    renderPayoutPanel(instance),
    renderRoiPanel(instance),
    renderActionPanel(instance, assetId)
  );

  return aside;
}

function renderPricing(pricing = []) {
  const section = document.createElement('section');
  section.className = 'digishelf-pricing';

  const intro = document.createElement('div');
  intro.className = 'digishelf-pricing__intro';
  const heading = document.createElement('h2');
  heading.textContent = 'Pricing & Scaling Plans';
  const note = document.createElement('p');
  note.textContent = 'Compare launch effort, upkeep, and daily earning potential for each digital asset lane.';
  intro.append(heading, note);

  const grid = document.createElement('div');
  grid.className = 'digishelf-pricing__grid';

  pricing.forEach(plan => {
    const card = document.createElement('article');
    card.className = 'digishelf-plan';
    const title = document.createElement('h3');
    title.textContent = plan.title;
    const subtitle = document.createElement('p');
    subtitle.className = 'digishelf-plan__subtitle';
    subtitle.textContent = plan.subtitle;
    const summary = document.createElement('p');
    summary.textContent = plan.summary;

    const stats = document.createElement('ul');
    stats.className = 'digishelf-plan__stats';

    const setupItem = document.createElement('li');
    setupItem.innerHTML = `<span>Setup</span><strong>${plan.setup.days || plan.setup.hoursPerDay ? `${plan.setup.days}d • ${formatHours(plan.setup.hoursPerDay)}` : 'Instant'} • $${formatMoney(plan.setup.cost)}</strong>`;

    const upkeepItem = document.createElement('li');
    upkeepItem.innerHTML = `<span>Upkeep</span><strong>${plan.upkeep.hours ? `${formatHours(plan.upkeep.hours)}/day` : 'No hours'} • $${formatMoney(plan.upkeep.cost)}/day</strong>`;

    const payoutItem = document.createElement('li');
    payoutItem.innerHTML = `<span>Avg Daily Payout</span><strong>${formatCurrency(plan.averageDaily)}</strong>`;

    stats.append(setupItem, upkeepItem, payoutItem);

    const requirements = document.createElement('p');
    requirements.className = 'digishelf-plan__requirements';
    const education = plan.education?.length
      ? `Requires courses: ${plan.education.join(', ')}`
      : 'No courses required';
    const equipment = plan.equipment?.length
      ? `Gear: ${plan.equipment.join(', ')}`
      : 'Starter gear only';
    requirements.textContent = `${education} • ${equipment}`;

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'digishelf-button digishelf-button--primary';
    cta.textContent = plan.cta || 'Launch';
    cta.addEventListener('click', () => {
      currentState.launchOpen = true;
      if (plan.id === 'ebook') {
        setView(VIEW_EBOOKS);
      } else if (plan.id === 'stockPhotos') {
        setView(VIEW_STOCK);
      }
    });

    card.append(title, subtitle, summary, stats, requirements, cta);
    grid.appendChild(card);
  });

  section.append(intro, grid);
  return section;
}

function renderMain(model) {
  if (currentState.view === VIEW_PRICING) {
    return renderPricing(model.pricing);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'digishelf-grid';

  const type = currentState.view === VIEW_STOCK ? 'stockPhotos' : 'ebook';
  const set = type === 'ebook' ? model.ebook : model.stock;
  const table = renderTable(set.instances || [], type);
  wrapper.appendChild(table);

  const selected = (set.instances || []).find(instance => instance.id === currentState.selectedId) || null;
  wrapper.appendChild(renderDetail(selected, type));

  return wrapper;
}

function renderLockedState(lock) {
  const wrapper = document.createElement('section');
  wrapper.className = 'digishelf digishelf--locked';
  const message = document.createElement('p');
  message.className = 'digishelf-empty';
  if (lock?.type === 'skill') {
    const courseNote = lock.courseName ? ` Complete ${lock.courseName} in Learnly to level up instantly.` : '';
    message.textContent = `${lock.workspaceLabel || 'DigiShelf'} unlocks at ${lock.skillName} Lv ${lock.requiredLevel}.${courseNote}`;
  } else {
    message.textContent = 'DigiShelf unlocks once the digital asset blueprints are discovered.';
  }
  wrapper.appendChild(message);
  return wrapper;
}

function render(model, { mount, page } = {}) {
  if (mount) {
    currentMount = mount;
  }
  if (page) {
    currentPage = page;
  }
  if (!currentMount) {
    return { meta: model?.summary?.meta || model?.overview?.meta || '' };
  }

  currentModel = model || currentModel;
  if (currentModel.lock) {
    currentMount.innerHTML = '';
    currentMount.appendChild(renderLockedState(currentModel.lock));
    const meta = currentModel?.summary?.meta || currentModel?.overview?.meta || '';
    return { meta };
  }

  ensureState(currentModel);

  currentMount.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'digishelf';
  root.append(
    renderHero(currentModel),
    renderTabs(),
    renderMain(currentModel)
  );

  currentMount.appendChild(root);

  const meta = currentModel?.summary?.meta || currentModel?.overview?.meta || '';
  return { meta };
}

export default { render };

