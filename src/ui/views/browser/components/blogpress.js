import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { selectBlogpressNiche } from '../../../cards/model/index.js';
import { performQualityAction } from '../../../../game/assets/index.js';

const VIEW_HOME = 'home';
const VIEW_DETAIL = 'detail';
const VIEW_PRICING = 'pricing';
const VIEW_BLUEPRINTS = 'blueprints';

let currentState = {
  view: VIEW_HOME,
  selectedBlogId: null
};
let currentModel = {
  definition: null,
  instances: [],
  summary: {}
};
let currentMount = null;
let currentPageMeta = null;

function formatCurrency(amount) {
  return `$${formatMoney(Math.max(0, Math.round(Number(amount) || 0)))}`;
}

function formatRange(range = {}) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 0;
  if (min <= 0 && max <= 0) {
    return 'No payout yet';
  }
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function ensureSelectedBlog() {
  const instances = Array.isArray(currentModel.instances) ? currentModel.instances : [];
  if (!instances.length) {
    currentState.selectedBlogId = null;
    if (currentState.view === VIEW_DETAIL) {
      currentState.view = VIEW_HOME;
    }
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === currentState.selectedBlogId);
  currentState.selectedBlogId = (target || active || fallback)?.id || fallback.id;
}

function setView(view, options = {}) {
  const nextView = view || VIEW_HOME;
  if (nextView === VIEW_DETAIL && options.blogId) {
    currentState.selectedBlogId = options.blogId;
  }
  currentState.view = nextView;
  ensureSelectedBlog();
  render(currentModel, { mount: currentMount, page: currentPageMeta });
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('blog', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectBlogpressNiche('blog', instanceId, value);
}

function createNavButton(label, view, { count = null } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-tab';
  button.dataset.view = view;
  button.textContent = label;
  if (count !== null) {
    const badge = document.createElement('span');
    badge.className = 'blogpress-tab__badge';
    badge.textContent = count;
    button.appendChild(badge);
  }
  button.addEventListener('click', () => {
    setView(view);
  });
  return button;
}

function renderHeader(model) {
  const header = document.createElement('header');
  header.className = 'blogpress__header';

  const title = document.createElement('div');
  title.className = 'blogpress__title';
  const heading = document.createElement('h1');
  heading.textContent = 'BlogPress';
  const note = document.createElement('p');
  note.textContent = 'Your faux CMS for cozy blog empires.';
  title.append(heading, note);

  const nav = document.createElement('nav');
  nav.className = 'blogpress-tabs';
  const activeCount = model.summary?.active || 0;
  const setupCount = model.summary?.setup || 0;
  nav.append(
    createNavButton('My Blogs', VIEW_HOME, { count: activeCount || null }),
    createNavButton('Pricing', VIEW_PRICING),
    createNavButton('Blueprints', VIEW_BLUEPRINTS, { count: setupCount || null })
  );

  const actions = document.createElement('div');
  actions.className = 'blogpress__actions';
  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = 'blogpress-button blogpress-button--primary';
  launchButton.textContent = 'Spin up new blog';
  launchButton.addEventListener('click', () => setView(VIEW_BLUEPRINTS));
  actions.appendChild(launchButton);

  header.append(title, nav, actions);

  if (setupCount > 0) {
    const info = document.createElement('p');
    info.className = 'blogpress__hint';
    info.textContent = `${setupCount} blog${setupCount === 1 ? '' : 's'} finishing launch prep.`;
    header.appendChild(info);
  }

  return header;
}

function renderSummaryBar(model) {
  const summary = document.createElement('div');
  summary.className = 'blogpress-summary';
  const total = model.summary?.total || 0;
  const active = model.summary?.active || 0;
  const needsUpkeep = model.summary?.needsUpkeep || 0;
  const summaryItems = [
    `${active} active`,
    `${total} total`,
    needsUpkeep > 0 ? `${needsUpkeep} need upkeep` : 'Upkeep funded'
  ];
  summary.textContent = summaryItems.join(' • ');
  return summary;
}

function createTableCell(content, className) {
  const cell = document.createElement('td');
  if (className) {
    cell.className = className;
  }
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

function renderHomeView(model) {
  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--home';

  container.appendChild(renderSummaryBar(model));

  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) {
    const empty = document.createElement('div');
    empty.className = 'blogpress-empty';
    const message = document.createElement('p');
    message.textContent = 'No blogs live yet. Launch a blueprint to start earning cozy ad pennies.';
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'blogpress-button blogpress-button--primary';
    cta.textContent = 'Launch first blog';
    cta.addEventListener('click', () => setView(VIEW_BLUEPRINTS));
    empty.append(message, cta);
    container.appendChild(empty);
    return container;
  }

  const table = document.createElement('table');
  table.className = 'blogpress-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Blog', 'Niche', 'Status', 'Latest payout', 'Upkeep', 'Quality', 'Quick action'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(instance => {
    const row = document.createElement('tr');
    row.dataset.blogId = instance.id;
    if (instance.id === currentState.selectedBlogId) {
      row.classList.add('is-selected');
    }

    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'blogpress-table__link';
    nameButton.textContent = instance.label;
    nameButton.addEventListener('click', () => setView(VIEW_DETAIL, { blogId: instance.id }));
    row.appendChild(createTableCell(nameButton, 'blogpress-table__cell blogpress-table__cell--label'));

    const niche = instance.niche;
    const nicheCell = document.createElement('div');
    nicheCell.className = 'blogpress-niche';
    const nicheName = document.createElement('span');
    nicheName.className = 'blogpress-niche__name';
    nicheName.textContent = niche?.name || 'Unassigned';
    nicheCell.appendChild(nicheName);
    if (niche?.label) {
      const tone = (niche.label || 'steady').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const badge = document.createElement('span');
      badge.className = `blogpress-badge blogpress-badge--tone-${tone}`;
      badge.textContent = niche.label;
      nicheCell.appendChild(badge);
    }
    row.appendChild(createTableCell(nicheCell));

    const status = document.createElement('span');
    status.className = `blogpress-status blogpress-status--${instance.status?.id || 'setup'}`;
    status.textContent = instance.status?.label || 'Setup';
    row.appendChild(createTableCell(status));

    const payoutCell = document.createElement('div');
    payoutCell.className = 'blogpress-payout';
    const latest = document.createElement('strong');
    latest.textContent = instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : '—';
    const average = document.createElement('span');
    average.textContent = instance.averagePayout > 0
      ? `Avg ${formatCurrency(instance.averagePayout)}`
      : instance.status?.id === 'active'
        ? 'No earnings yet'
        : 'Launch pending';
    payoutCell.append(latest, average);
    row.appendChild(createTableCell(payoutCell));

    const upkeep = document.createElement('span');
    const parts = [];
    const maintenanceHours = instance.maintenance?.parts?.find(part => part.includes('h'));
    if (maintenanceHours) parts.push(maintenanceHours);
    const maintenanceCost = instance.maintenance?.parts?.find(part => part.includes('$'));
    if (maintenanceCost) parts.push(maintenanceCost);
    upkeep.textContent = parts.length ? parts.join(' • ') : 'None';
    row.appendChild(createTableCell(upkeep));

    const qualityCell = document.createElement('div');
    qualityCell.className = 'blogpress-quality';
    const levelBadge = document.createElement('span');
    levelBadge.className = 'blogpress-quality__level';
    levelBadge.textContent = `Q${instance.qualityLevel}`;
    const levelLabel = document.createElement('span');
    levelLabel.className = 'blogpress-quality__label';
    levelLabel.textContent = instance.qualityInfo?.name || 'Skeleton Drafts';
    qualityCell.append(levelBadge, levelLabel);
    row.appendChild(createTableCell(qualityCell));

    const actionCell = document.createElement('div');
    actionCell.className = 'blogpress-table__actions';
    if (instance.quickAction) {
      const quick = instance.quickAction;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'blogpress-button blogpress-button--ghost';
      button.textContent = quick.label;
      button.disabled = !quick.available;
      if (quick.disabledReason) {
        button.title = quick.disabledReason;
      }
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (button.disabled) return;
        handleQuickAction(instance.id, quick.id);
      });
      const effort = document.createElement('span');
      effort.className = 'blogpress-table__meta';
      const partsMeta = [];
      if (quick.time > 0) partsMeta.push(formatHours(quick.time));
      if (quick.cost > 0) partsMeta.push(formatCurrency(quick.cost));
      effort.textContent = partsMeta.length ? partsMeta.join(' • ') : 'Instant';
      actionCell.append(button, effort);
    } else {
      const none = document.createElement('span');
      none.className = 'blogpress-table__meta';
      none.textContent = 'No actions unlocked yet';
      actionCell.appendChild(none);
    }
    row.appendChild(createTableCell(actionCell, 'blogpress-table__cell blogpress-table__cell--actions'));

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

function createBackButton(label = 'Back to blogs') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--link';
  button.textContent = label;
  button.addEventListener('click', () => setView(VIEW_HOME));
  return button;
}

function renderOverviewPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--overview';

  const title = document.createElement('h2');
  title.textContent = instance.label;
  panel.appendChild(title);

  const badge = document.createElement('span');
  badge.className = `blogpress-badge blogpress-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  panel.appendChild(badge);

  const list = document.createElement('dl');
  list.className = 'blogpress-stats';

  const stats = [
    { label: 'Lifetime income', value: formatCurrency(instance.lifetimeIncome) },
    { label: 'Estimated spend', value: formatCurrency(instance.estimatedSpend) },
    {
      label: 'Yesterday payout',
      value: instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : '—'
    },
    {
      label: 'Average / day',
      value: instance.averagePayout > 0 ? formatCurrency(instance.averagePayout) : 'No earnings yet'
    },
    {
      label: 'Pending payout',
      value: instance.pendingIncome > 0 ? formatCurrency(instance.pendingIncome) : 'None in queue'
    }
  ];

  stats.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    list.append(dt, dd);
  });

  panel.appendChild(list);
  return panel;
}

function renderNichePanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--niche';

  const title = document.createElement('h3');
  title.textContent = 'Audience niche';
  panel.appendChild(title);

  const current = document.createElement('p');
  current.className = 'blogpress-panel__lead';
  current.textContent = instance.niche?.name || 'Unassigned — pick a specialty once and lock it in.';
  panel.appendChild(current);

  if (instance.niche?.summary) {
    const summary = document.createElement('p');
    summary.className = 'blogpress-panel__note';
    summary.textContent = instance.niche.summary;
    panel.appendChild(summary);
  }

  if (!instance.nicheLocked) {
    const field = document.createElement('label');
    field.className = 'blogpress-field';
    field.textContent = 'Choose niche';

    const select = document.createElement('select');
    select.className = 'blogpress-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a niche';
    select.appendChild(placeholder);
    instance.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.label
        ? `${option.name} (${option.label})`
        : option.name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      handleNicheSelect(instance.id, select.value);
      setView(VIEW_DETAIL, { blogId: instance.id });
    });
    field.appendChild(select);
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Niches lock after selection, so pick the trend that feels dreamy.';
    panel.append(field, hint);
  } else {
    const locked = document.createElement('p');
    locked.className = 'blogpress-panel__hint';
    locked.textContent = 'Niche locked — ride the trend or pair with boosts to pivot later.';
    panel.appendChild(locked);
  }

  return panel;
}

function renderQualityPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--quality';

  const header = document.createElement('div');
  header.className = 'blogpress-panel__header';
  const title = document.createElement('h3');
  title.textContent = `Quality ${instance.qualityLevel} — ${instance.qualityInfo?.name || 'Skeleton Drafts'}`;
  header.appendChild(title);
  panel.appendChild(header);

  if (instance.qualityInfo?.description) {
    const description = document.createElement('p');
    description.className = 'blogpress-panel__note';
    description.textContent = instance.qualityInfo.description;
    panel.appendChild(description);
  }

  const progress = document.createElement('div');
  progress.className = 'blogpress-progress';
  const fill = document.createElement('div');
  fill.className = 'blogpress-progress__fill';
  fill.style.width = `${Math.round((instance.milestone.percent || 0) * 100)}%`;
  progress.appendChild(fill);
  panel.appendChild(progress);

  if (instance.milestone.nextLevel) {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = `Next milestone: Quality ${instance.milestone.nextLevel.level} — ${instance.milestone.nextLevel.name}. ${instance.milestone.nextLevel.description || ''}`;
    panel.appendChild(milestone);
  } else {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = 'Top tier unlocked — this blog is shining bright!';
    panel.appendChild(milestone);
  }

  const summary = document.createElement('p');
  summary.className = 'blogpress-panel__hint';
  summary.textContent = instance.milestone.summary;
  panel.appendChild(summary);

  const range = document.createElement('p');
  range.className = 'blogpress-panel__range';
  range.textContent = `Daily range at this tier: ${formatRange(instance.qualityRange)}`;
  panel.appendChild(range);

  return panel;
}

function renderPayoutPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--payout';
  const title = document.createElement('h3');
  title.textContent = 'Payout recap';
  panel.appendChild(title);

  const total = document.createElement('p');
  total.className = 'blogpress-panel__lead';
  total.textContent = instance.latestPayout > 0
    ? `Latest payout: ${formatCurrency(instance.latestPayout)}`
    : 'No payout logged yesterday.';
  panel.appendChild(total);

  if (instance.payoutBreakdown.entries.length) {
    const list = document.createElement('ul');
    list.className = 'blogpress-list';
    instance.payoutBreakdown.entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'blogpress-list__item';
      const label = document.createElement('span');
      label.className = 'blogpress-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'blogpress-list__value';
      const amount = Number(entry.amount) || 0;
      value.textContent = amount >= 0 ? `+${formatCurrency(amount)}` : `−${formatCurrency(Math.abs(amount))}`;
      item.append(label, value);
      list.appendChild(item);
    });
    panel.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'blogpress-panel__hint';
    empty.textContent = 'Run quick actions and fund upkeep to unlock modifier breakdowns.';
    panel.appendChild(empty);
  }

  return panel;
}

function renderActionPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--actions';
  const title = document.createElement('h3');
  title.textContent = 'Upgrade actions';
  panel.appendChild(title);

  if (!instance.actions.length) {
    const note = document.createElement('p');
    note.className = 'blogpress-panel__hint';
    note.textContent = 'No quality actions unlocked yet. Progress through story beats to reveal them.';
    panel.appendChild(note);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'blogpress-action-list';

  instance.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'blogpress-action';
    const label = document.createElement('div');
    label.className = 'blogpress-action__label';
    label.textContent = action.label;
    const meta = document.createElement('span');
    meta.className = 'blogpress-action__meta';
    const parts = [];
    if (action.time > 0) parts.push(formatHours(action.time));
    if (action.cost > 0) parts.push(formatCurrency(action.cost));
    meta.textContent = parts.length ? parts.join(' • ') : 'Instant';
    label.appendChild(meta);
    item.appendChild(label);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blogpress-button blogpress-button--primary';
    button.textContent = action.available ? 'Run' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      handleQuickAction(instance.id, action.id);
    });
    item.appendChild(button);

    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

function renderUpkeepPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--upkeep';
  const title = document.createElement('h3');
  title.textContent = 'Daily upkeep';
  panel.appendChild(title);

  const upkeepParts = instance.maintenance?.parts || [];
  const note = document.createElement('p');
  note.className = 'blogpress-panel__lead';
  note.textContent = upkeepParts.length ? upkeepParts.join(' • ') : 'No upkeep required';
  panel.appendChild(note);

  if (instance.status?.id === 'active' && !instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'blogpress-panel__warning';
    warning.textContent = 'Upkeep missed today — fund it to unlock tomorrow’s payout.';
    panel.appendChild(warning);
  } else {
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Keep hours and cash funded to secure the next payday.';
    panel.appendChild(hint);
  }

  return panel;
}

function renderDetailView(model) {
  const instance = model.instances.find(entry => entry.id === currentState.selectedBlogId);
  if (!instance) {
    return renderHomeView(model);
  }

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--detail';

  const back = createBackButton();
  container.appendChild(back);
  container.appendChild(renderOverviewPanel(instance));

  const grid = document.createElement('div');
  grid.className = 'blogpress-detail-grid';
  grid.append(
    renderNichePanel(instance),
    renderQualityPanel(instance),
    renderPayoutPanel(instance),
    renderActionPanel(instance),
    renderUpkeepPanel(instance)
  );
  container.appendChild(grid);

  return container;
}

function renderPricingView(model) {
  const pricing = model.pricing || {};
  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--pricing';

  const intro = document.createElement('div');
  intro.className = 'blogpress-pricing__intro';
  const title = document.createElement('h2');
  title.textContent = 'BlogPress pricing & growth map';
  const lead = document.createElement('p');
  const setup = pricing.setup || {};
  const maintenance = pricing.maintenance || {};
  lead.textContent = `Blueprint: ${setup.days || 0} day${setup.days === 1 ? '' : 's'} × ${formatHours(setup.hoursPerDay || 0)} ($${formatMoney(setup.cost || 0)}) • Daily upkeep ${formatHours(maintenance.hours || 0)} • $${formatMoney(maintenance.cost || 0)}`;
  intro.append(title, lead);
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'blogpress-pricing__grid';
  pricing.levels?.forEach(level => {
    const card = document.createElement('article');
    card.className = 'blogpress-plan';
    const heading = document.createElement('h3');
    heading.textContent = `Quality ${level.level} — ${level.name}`;
    const range = document.createElement('p');
    range.className = 'blogpress-plan__range';
    range.textContent = `Income: ${formatRange(level.income)}`;
    const description = document.createElement('p');
    description.textContent = level.description || '';
    card.append(heading, range, description);
    grid.appendChild(card);
  });
  container.appendChild(grid);

  const nicheBlock = document.createElement('section');
  nicheBlock.className = 'blogpress-pricing__section';
  const nicheTitle = document.createElement('h3');
  nicheTitle.textContent = 'Niche heat map';
  const nicheNote = document.createElement('p');
  const topNiches = pricing.topNiches || [];
  nicheNote.textContent = topNiches.length
    ? `Top picks today: ${topNiches.map(entry => `${entry.name} (${entry.label || 'steady'})`).join(', ')}.`
    : 'Niche intel unlocks once blueprints are live.';
  nicheBlock.append(nicheTitle, nicheNote);
  const nicheHint = document.createElement('p');
  nicheHint.className = 'blogpress-panel__hint';
  nicheHint.textContent = 'Pick once per blog — a locked niche hugs its trend multiplier for life.';
  nicheBlock.appendChild(nicheHint);
  container.appendChild(nicheBlock);

  const actionBlock = document.createElement('section');
  actionBlock.className = 'blogpress-pricing__section';
  const actionTitle = document.createElement('h3');
  actionTitle.textContent = 'Quality action lineup';
  actionBlock.appendChild(actionTitle);
  const actionList = document.createElement('ul');
  actionList.className = 'blogpress-list';
  pricing.actions?.forEach(action => {
    const item = document.createElement('li');
    item.className = 'blogpress-list__item';
    const label = document.createElement('span');
    label.className = 'blogpress-list__label';
    label.textContent = action.label;
    const value = document.createElement('span');
    value.className = 'blogpress-list__value';
    const parts = [];
    if (action.time > 0) parts.push(formatHours(action.time));
    if (action.cost > 0) parts.push(formatCurrency(action.cost));
    value.textContent = parts.length ? parts.join(' • ') : 'Instant';
    item.append(label, value);
    actionList.appendChild(item);
  });
  actionBlock.appendChild(actionList);
  container.appendChild(actionBlock);

  const upgradeBlock = document.createElement('section');
  upgradeBlock.className = 'blogpress-pricing__section';
  const upgradeTitle = document.createElement('h3');
  upgradeTitle.textContent = 'Upgrade boosts';
  upgradeBlock.appendChild(upgradeTitle);
  const upgradeList = document.createElement('ul');
  upgradeList.className = 'blogpress-list';
  if (pricing.upgrades?.length) {
    pricing.upgrades.forEach(upgrade => {
      const item = document.createElement('li');
      item.className = 'blogpress-list__item';
      const label = document.createElement('span');
      label.className = 'blogpress-list__label';
      label.textContent = upgrade.name;
      const value = document.createElement('span');
      value.className = 'blogpress-list__value';
      value.textContent = `${formatCurrency(upgrade.cost)} • ${upgrade.description}`;
      item.append(label, value);
      upgradeList.appendChild(item);
    });
  } else {
    const item = document.createElement('li');
    item.className = 'blogpress-list__item';
    item.textContent = 'Upgrades unlock once your first blog goes live.';
    upgradeList.appendChild(item);
  }
  upgradeBlock.appendChild(upgradeList);
  container.appendChild(upgradeBlock);

  return container;
}

function renderBlueprintView(model) {
  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--blueprint';

  const card = document.createElement('article');
  card.className = 'blogpress-blueprint';
  const title = document.createElement('h2');
  title.textContent = 'Spin up a new blog';
  const summary = document.createElement('p');
  const setup = model.pricing?.setup || {};
  summary.textContent = `${setup.days || 0} day blueprint • ${formatHours(setup.hoursPerDay || 0)} focus per day • $${formatMoney(setup.cost || 0)} upfront.`;
  card.append(title, summary);

  const launch = model.launch || {};
  if (launch.availability?.reasons?.length) {
    const list = document.createElement('ul');
    list.className = 'blogpress-requirements';
    launch.availability.reasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--primary';
  button.textContent = launch.label || 'Launch blog';
  button.disabled = launch.disabled || launch.availability?.disabled;
  button.addEventListener('click', () => {
    if (button.disabled) return;
    launch.onClick?.();
    setView(VIEW_HOME);
  });
  card.appendChild(button);

  const hint = document.createElement('p');
  hint.className = 'blogpress-panel__hint';
  hint.textContent = 'Reminder: niches lock after launch, so browse the heat map before committing!';
  card.appendChild(hint);

  container.appendChild(card);
  return container;
}

function renderLockedState() {
  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--locked';
  const message = document.createElement('p');
  message.className = 'blogpress-empty__message';
  message.textContent = 'BlogPress unlocks once the Personal Blog blueprint is discovered.';
  container.appendChild(message);
  return container;
}

function renderCurrentView(model) {
  switch (currentState.view) {
    case VIEW_PRICING:
      return renderPricingView(model);
    case VIEW_BLUEPRINTS:
      return renderBlueprintView(model);
    case VIEW_DETAIL:
      return renderDetailView(model);
    case VIEW_HOME:
    default:
      return renderHomeView(model);
  }
}

export function render(model = {}, context = {}) {
  currentModel = model || {};
  if (context.mount) {
    currentMount = context.mount;
  }
  if (context.page) {
    currentPageMeta = context.page;
  }
  if (!currentMount) {
    return currentModel.summary || {};
  }

  if (!currentModel.definition) {
    currentMount.innerHTML = '';
    currentMount.appendChild(renderLockedState());
    return currentModel.summary || {};
  }

  ensureSelectedBlog();

  currentMount.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'blogpress';
  root.appendChild(renderHeader(currentModel));
  root.appendChild(renderCurrentView(currentModel));

  currentMount.appendChild(root);

  const activeNav = currentMount.querySelectorAll('.blogpress-tab');
  activeNav.forEach(button => {
    const isActive = button.dataset.view === currentState.view
      || (currentState.view === VIEW_DETAIL && button.dataset.view === VIEW_HOME);
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  return currentModel.summary || {};
}

export default { render };
