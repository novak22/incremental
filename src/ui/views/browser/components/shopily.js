import { ensureArray, formatHours } from '../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../utils/formatting.js';
import { selectShopilyNiche } from '../../../cards/model/index.js';
import { performQualityAction } from '../../../../game/assets/index.js';

const VIEW_DASHBOARD = 'dashboard';
const VIEW_UPGRADES = 'upgrades';
const VIEW_PRICING = 'pricing';

let currentState = {
  view: VIEW_DASHBOARD,
  selectedStoreId: null
};
let currentModel = {
  definition: null,
  instances: [],
  summary: {},
  metrics: {},
  pricing: null,
  upgrades: [],
  launch: null
};
let currentMount = null;
let currentPageMeta = null;
let routeListener = null;

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });
const formatPercent = value =>
  baseFormatPercent(value, { nullFallback: '—', signDisplay: 'always' });

function ensureSelectedStore() {
  const instances = Array.isArray(currentModel.instances) ? currentModel.instances : [];
  if (!instances.length) {
    currentState.selectedStoreId = null;
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === currentState.selectedStoreId);
  currentState.selectedStoreId = (target || active || fallback)?.id || instances[0].id;
}

function getCurrentRoute() {
  switch (currentState.view) {
    case VIEW_PRICING:
      return 'pricing';
    case VIEW_UPGRADES:
      return 'upgrades';
    case VIEW_DASHBOARD:
    default: {
      const storeId = currentState.selectedStoreId;
      return storeId ? `store/${storeId}` : '';
    }
  }
}

function notifyRouteChange() {
  if (typeof routeListener === 'function') {
    routeListener(getCurrentRoute());
  }
}

function setView(view, options = {}) {
  const nextView = view || VIEW_DASHBOARD;
  const nextState = { ...currentState, view: nextView };
  if (options.storeId) {
    nextState.selectedStoreId = options.storeId;
  }
  currentState = nextState;
  ensureSelectedStore();
  renderApp();
}

function getSelectedStore() {
  const instances = Array.isArray(currentModel.instances) ? currentModel.instances : [];
  return instances.find(entry => entry.id === currentState.selectedStoreId) || null;
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('dropshipping', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectShopilyNiche('dropshipping', instanceId, value);
}

function createNavButton(label, view, { badge = null } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-nav__button';
  if (currentState.view === view) {
    button.classList.add('is-active');
  }
  button.textContent = label;
  if (badge !== null) {
    const badgeEl = document.createElement('span');
    badgeEl.className = 'shopily-nav__badge';
    badgeEl.textContent = badge;
    button.appendChild(badgeEl);
  }
  button.addEventListener('click', () => setView(view));
  return button;
}

function createLaunchButton(launch) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-button shopily-button--primary';
  button.textContent = launch?.label || 'Launch New Store';
  button.disabled = Boolean(launch?.disabled);
  const reasons = ensureArray(launch?.availability?.reasons).filter(Boolean);
  if (reasons.length) {
    button.title = reasons.join('\n');
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    launch?.onClick?.();
  });
  return button;
}

function renderTopBar(model) {
  const bar = document.createElement('header');
  bar.className = 'shopily-topbar';

  const title = document.createElement('div');
  title.className = 'shopily-topbar__title';
  const heading = document.createElement('h1');
  heading.textContent = currentPageMeta?.headline || 'Shopily Commerce Deck';
  const note = document.createElement('p');
  note.textContent = currentPageMeta?.tagline || 'Launch, nurture, and upgrade every store from one clean dashboard.';
  title.append(heading, note);

  const nav = document.createElement('nav');
  nav.className = 'shopily-nav';
  const activeCount = model.summary?.active || 0;
  const readyUpgrades = ensureArray(model.upgrades).filter(entry => entry?.snapshot?.ready).length;
  nav.append(
    createNavButton('My Stores', VIEW_DASHBOARD, { badge: activeCount || null }),
    createNavButton('Upgrades', VIEW_UPGRADES, { badge: readyUpgrades || null }),
    createNavButton('Shopily Pricing', VIEW_PRICING)
  );

  const actions = document.createElement('div');
  actions.className = 'shopily-topbar__actions';
  actions.appendChild(createLaunchButton(model.launch));

  const topRow = document.createElement('div');
  topRow.className = 'shopily-topbar__row';
  topRow.append(title, actions);

  bar.append(topRow, nav);
  return bar;
}

function describeMetricTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

function renderMetrics(metrics = {}) {
  const grid = document.createElement('dl');
  grid.className = 'shopily-metrics';
  const entries = [
    {
      label: 'Total Stores',
      value: metrics.totalStores || 0,
      note: 'Active & in setup',
      tone: 'neutral'
    },
    {
      label: 'Daily Sales',
      value: formatCurrency(metrics.dailySales || 0),
      note: 'Yesterday’s payouts',
      tone: describeMetricTone(metrics.dailySales)
    },
    {
      label: 'Daily Upkeep',
      value: formatCurrency(metrics.dailyUpkeep || 0),
      note: 'Cash needed each day',
      tone: describeMetricTone(-(metrics.dailyUpkeep || 0))
    },
    {
      label: 'Net / Day',
      value: formatSignedCurrency(metrics.netDaily || 0),
      note: 'Sales minus upkeep',
      tone: describeMetricTone(metrics.netDaily)
    }
  ];

  entries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'shopily-metric';
    item.dataset.tone = entry.tone;

    const label = document.createElement('dt');
    label.className = 'shopily-metric__label';
    label.textContent = entry.label;

    const value = document.createElement('dd');
    value.className = 'shopily-metric__value';
    value.textContent = entry.value;

    const note = document.createElement('span');
    note.className = 'shopily-metric__note';
    note.textContent = entry.note;

    item.append(label, value, note);
    grid.appendChild(item);
  });

  return grid;
}

function renderHero(model) {
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
  hero.append(body, renderMetrics(model.metrics));
  return hero;
}

function formatNicheDelta(delta) {
  if (delta === null || delta === undefined) return '';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  const icon = numeric > 0 ? '⬆️' : '⬇️';
  return `${icon} ${Math.abs(Math.round(numeric * 100))}%`;
}

function renderStoreTable(instances = []) {
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
      if (instance.id === currentState.selectedStoreId) {
        row.classList.add('is-selected');
      }
      row.addEventListener('click', () => setView(VIEW_DASHBOARD, { storeId: instance.id }));

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
        const delta = formatNicheDelta(instance.niche.delta);
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
        setView(VIEW_UPGRADES, { storeId: instance.id });
      });
      const detailButton = document.createElement('button');
      detailButton.type = 'button';
      detailButton.className = 'shopily-button shopily-button--link';
      detailButton.textContent = 'View Details';
      detailButton.addEventListener('click', event => {
        event.stopPropagation();
        setView(VIEW_DASHBOARD, { storeId: instance.id });
      });
      actionCell.append(upgradeButton, detailButton);

      row.append(nameCell, nicheCell, earningsCell, upkeepCell, roiCell, actionCell);
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  return table;
}

function renderQualityPanel(instance) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = `Quality ${instance.qualityLevel}`;
  panel.appendChild(heading);

  if (instance.qualityInfo?.description) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = instance.qualityInfo.description;
    panel.appendChild(note);
  }

  const progress = document.createElement('div');
  progress.className = 'shopily-progress';
  const fill = document.createElement('div');
  fill.className = 'shopily-progress__fill';
  fill.style.setProperty('--shopily-progress', String((instance.milestone?.percent || 0) * 100));
  progress.appendChild(fill);

  const summary = document.createElement('p');
  summary.className = 'shopily-panel__note';
  summary.textContent = instance.milestone?.summary || 'Push quality actions to unlock the next tier.';

  panel.append(progress, summary);
  return panel;
}

function renderNichePanel(instance) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Audience niche';
  panel.appendChild(heading);

  if (instance.niche) {
    const nicheLine = document.createElement('p');
    nicheLine.className = 'shopily-panel__lead';
    nicheLine.textContent = instance.niche.name;
    panel.appendChild(nicheLine);

    const vibe = document.createElement('p');
    vibe.className = 'shopily-panel__note';
    const delta = formatNicheDelta(instance.niche.delta);
    const boost = formatPercent(instance.niche.multiplier - 1);
    vibe.textContent = `${instance.niche.summary || 'Trend snapshot unavailable.'} ${delta ? `(${delta})` : boost !== '—' ? `(${boost})` : ''}`.trim();
    panel.appendChild(vibe);
  } else {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No niche assigned yet. Pick a trending lane for bonus payouts.';
    panel.appendChild(empty);
  }

  if (!instance.nicheLocked && ensureArray(instance.nicheOptions).length) {
    const field = document.createElement('label');
    field.className = 'shopily-field';
    field.textContent = 'Assign niche';

    const select = document.createElement('select');
    select.className = 'shopily-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a niche';
    select.appendChild(placeholder);

    instance.nicheOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.id;
      optionEl.textContent = `${option.name} — ${formatPercent(option.multiplier - 1)} boost`;
      select.appendChild(optionEl);
    });

    select.value = instance.niche?.id || '';
    select.addEventListener('change', event => {
      handleNicheSelect(instance.id, event.target.value || null);
    });

    field.appendChild(select);
    panel.appendChild(field);
  } else if (instance.nicheLocked && instance.niche) {
    const locked = document.createElement('p');
    locked.className = 'shopily-panel__hint';
    locked.textContent = 'Niche locked in — upgrades can refresh trend strength.';
    panel.appendChild(locked);
  }

  return panel;
}

function renderStatsPanel(instance) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Store health';
  panel.appendChild(heading);

  const list = document.createElement('dl');
  list.className = 'shopily-stats';
  const entries = [
    { label: 'Latest payout', value: formatCurrency(instance.latestPayout || 0) },
    { label: 'Average / day', value: formatCurrency(instance.averagePayout || 0) },
    { label: 'Lifetime sales', value: formatCurrency(instance.lifetimeIncome || 0) },
    { label: 'Lifetime spend', value: formatCurrency(instance.lifetimeSpend || 0) },
    { label: 'Profit to date', value: formatSignedCurrency(instance.profit || 0) },
    { label: 'Lifetime ROI', value: formatPercent(instance.roi) },
    { label: 'Resale value', value: formatCurrency(instance.resaleValue || 0) }
  ];

  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'shopily-stats__row';
    const term = document.createElement('dt');
    term.textContent = entry.label;
    const value = document.createElement('dd');
    value.textContent = entry.value;
    row.append(term, value);
    list.appendChild(row);
  });

  panel.appendChild(list);

  if (!instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'shopily-panel__warning';
    warning.textContent = 'Maintenance unfunded — cover daily upkeep to avoid shutdowns.';
    panel.appendChild(warning);
  }

  if (instance.maintenance?.parts?.length) {
    const upkeep = document.createElement('p');
    upkeep.className = 'shopily-panel__note';
    upkeep.textContent = `Daily upkeep: ${instance.maintenance.parts.join(' • ')}`;
    panel.appendChild(upkeep);
  }

  return panel;
}

function renderPayoutBreakdown(instance) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Payout recap';
  panel.appendChild(heading);

  if (!instance.payoutBreakdown.entries.length) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = 'No payout modifiers yet. Unlock upgrades and courses to stack multipliers.';
    panel.appendChild(note);
  } else {
    const list = document.createElement('ul');
    list.className = 'shopily-list';
    instance.payoutBreakdown.entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-list__item';
      const label = document.createElement('span');
      label.className = 'shopily-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'shopily-list__value';
      const amount = formatCurrency(entry.amount || 0);
      const percent = entry.percent !== null && entry.percent !== undefined
        ? ` (${formatPercent(entry.percent)})`
        : '';
      value.textContent = `${amount}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  const total = document.createElement('p');
  total.className = 'shopily-panel__note';
  total.textContent = `Yesterday’s total: ${formatCurrency(instance.payoutBreakdown.total || 0)}`;
  panel.appendChild(total);

  return panel;
}

function renderActionList(instance) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Quality actions';
  panel.appendChild(heading);

  if (!instance.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No actions unlocked yet. Install upgrades to expand your playbook.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'shopily-action-list';

  instance.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'shopily-action';

    const label = document.createElement('div');
    label.className = 'shopily-action__label';
    label.textContent = action.label;

    const meta = document.createElement('div');
    meta.className = 'shopily-action__meta';
    const time = action.time > 0 ? formatHours(action.time) : 'Instant';
    const cost = action.cost > 0 ? formatCurrency(action.cost) : 'No spend';
    meta.textContent = `${time} • ${cost}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopily-button shopily-button--secondary';
    button.textContent = action.available ? 'Run now' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      handleQuickAction(instance.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

function renderStoreDetail(instance) {
  const detail = document.createElement('aside');
  detail.className = 'shopily-detail';

  if (!instance) {
    const empty = document.createElement('div');
    empty.className = 'shopily-detail__empty';
    empty.textContent = 'Select a store to inspect payouts, niches, and upgrades.';
    detail.appendChild(empty);
    return detail;
  }

  const header = document.createElement('header');
  header.className = 'shopily-detail__header';
  const title = document.createElement('h2');
  title.textContent = instance.label;
  const status = document.createElement('span');
  status.className = 'shopily-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Setup';
  header.append(title, status);
  detail.appendChild(header);

  if (instance.pendingIncome > 0) {
    const pending = document.createElement('p');
    pending.className = 'shopily-panel__hint';
    pending.textContent = `Pending payouts: ${formatCurrency(instance.pendingIncome)} once upkeep clears.`;
    detail.appendChild(pending);
  }

  detail.append(
    renderStatsPanel(instance),
    renderQualityPanel(instance),
    renderNichePanel(instance),
    renderPayoutBreakdown(instance),
    renderActionList(instance)
  );

  return detail;
}

function renderDashboardView(model) {
  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--dashboard';

  container.appendChild(renderHero(model));

  const grid = document.createElement('div');
  grid.className = 'shopily-grid';
  grid.append(renderStoreTable(model.instances), renderStoreDetail(getSelectedStore()));
  container.appendChild(grid);

  return container;
}

function describeEffectSummary(effects = {}, affects = {}) {
  const effectParts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) return;
    const percent = Math.round((numeric - 1) * 100);
    let label;
    switch (effect) {
      case 'payout_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% payout`;
        break;
      case 'quality_progress_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% quality speed`;
        break;
      case 'setup_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% setup speed`;
        break;
      case 'maint_time_mult':
        label = `${percent >= 0 ? '+' : ''}${percent}% upkeep speed`;
        break;
      default:
        label = `${effect}: ${numeric}`;
    }
    effectParts.push(label);
  });
  if (!effectParts.length) return '';
  const scope = [];
  const assetIds = ensureArray(affects.assets?.ids);
  if (assetIds.length) scope.push(`stores (${assetIds.join(', ')})`);
  const assetTags = ensureArray(affects.assets?.tags);
  if (assetTags.length) scope.push(`tags ${assetTags.join(', ')}`);
  return scope.length ? `${effectParts.join(' • ')} → ${scope.join(' & ')}` : effectParts.join(' • ');
}

function renderUpgradeCard(upgrade) {
  const card = document.createElement('article');
  card.className = 'shopily-upgrade';
  card.dataset.status = upgrade.snapshot?.purchased ? 'owned' : upgrade.snapshot?.ready ? 'ready' : 'locked';

  const header = document.createElement('header');
  header.className = 'shopily-upgrade__header';
  const title = document.createElement('h3');
  title.textContent = upgrade.name;
  header.appendChild(title);
  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'shopily-upgrade__badge';
    badge.textContent = upgrade.tag.label;
    header.appendChild(badge);
  }

  const description = document.createElement('p');
  description.className = 'shopily-upgrade__summary';
  description.textContent = upgrade.description || 'Commerce boost';

  const price = document.createElement('p');
  price.className = 'shopily-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);

  const effect = document.createElement('p');
  effect.className = 'shopily-upgrade__note';
  effect.textContent = describeEffectSummary(upgrade.effects, upgrade.affects) || 'Stacks with store payouts and progress.';

  const status = document.createElement('p');
  status.className = 'shopily-upgrade__status';
  status.textContent = upgrade.status || 'Progress for this soon';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-button shopily-button--primary';
  if (upgrade.snapshot?.purchased) {
    button.textContent = 'Owned';
    button.disabled = true;
  } else if (upgrade.snapshot?.ready) {
    button.textContent = 'Install upgrade';
  } else if (upgrade.snapshot?.affordable === false) {
    button.textContent = 'Save up';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    upgrade.action?.onClick?.();
  });

  card.append(header, description, price, effect, status, button);
  return card;
}

function renderUpgradesView(model) {
  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--upgrades';

  const intro = document.createElement('div');
  intro.className = 'shopily-upgrades__intro';
  intro.innerHTML = '<h2>Commerce upgrade ladder</h2><p>These infrastructure plays reuse the existing upgrade logic so every purchase hits immediately.</p>';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'shopily-upgrades';

  const upgrades = ensureArray(model.upgrades);
  if (!upgrades.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-empty';
    empty.textContent = 'No commerce upgrades unlocked yet. Build more stores and finish the E-Commerce Playbook to reveal new boosts.';
    grid.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      grid.appendChild(renderUpgradeCard(upgrade));
    });
  }

  container.appendChild(grid);
  return container;
}

function describeSetup(plan) {
  if (!plan) return 'Setup timeline varies';
  const parts = [];
  if (plan.setupDays > 0) {
    parts.push(`${plan.setupDays} day${plan.setupDays === 1 ? '' : 's'}`);
  }
  if (plan.setupHours > 0) {
    parts.push(`${formatHours(plan.setupHours)} / day`);
  }
  return parts.length ? parts.join(' • ') : 'Instant';
}

function describeUpkeep(plan) {
  if (!plan) return 'No upkeep';
  const parts = [];
  if (plan.upkeepHours > 0) {
    parts.push(`${formatHours(plan.upkeepHours)}/day`);
  }
  if (plan.upkeepCost > 0) {
    parts.push(formatCurrency(plan.upkeepCost));
  }
  return parts.length ? parts.join(' • ') : 'No upkeep';
}

function renderPlanCard(plan) {
  const card = document.createElement('article');
  card.className = 'shopily-plan';

  const header = document.createElement('header');
  header.className = 'shopily-plan__header';
  const title = document.createElement('h3');
  title.textContent = plan.name;
  header.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'shopily-plan__summary';
  summary.textContent = plan.summary;

  const list = document.createElement('ul');
  list.className = 'shopily-plan__list';
  const items = [
    { label: 'Setup cost', value: formatCurrency(plan.setupCost || 0) },
    { label: 'Setup timeline', value: describeSetup(plan) },
    { label: 'Daily upkeep', value: describeUpkeep(plan) },
    { label: 'Expected sales', value: plan.expectedSales || '$0/day' }
  ];

  items.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'shopily-plan__item';
    const label = document.createElement('span');
    label.className = 'shopily-plan__label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'shopily-plan__value';
    value.textContent = entry.value;
    item.append(label, value);
    list.appendChild(item);
  });

  card.append(header, summary, list);
  return card;
}

function renderPricingView(model) {
  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--pricing';

  const intro = document.createElement('div');
  intro.className = 'shopily-pricing__intro';
  intro.innerHTML = '<h2>Plans & expectations</h2><p>Each tier references the existing dropshipping backend — setup costs, upkeep, and payout ladders stay perfectly in sync.</p>';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'shopily-pricing';

  const plans = ensureArray(model.pricing?.plans);
  if (!plans.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-empty';
    empty.textContent = 'Pricing data unlocks once dropshipping is available.';
    grid.appendChild(empty);
  } else {
    plans.forEach(plan => grid.appendChild(renderPlanCard(plan)));
  }

  container.appendChild(grid);
  return container;
}

function renderApp() {
  if (!currentMount) {
    notifyRouteChange();
    return;
  }
  currentMount.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'shopily';
  root.appendChild(renderTopBar(currentModel));

  switch (currentState.view) {
    case VIEW_UPGRADES:
      root.appendChild(renderUpgradesView(currentModel));
      break;
    case VIEW_PRICING:
      root.appendChild(renderPricingView(currentModel));
      break;
    case VIEW_DASHBOARD:
    default:
      root.appendChild(renderDashboardView(currentModel));
      break;
  }

  currentMount.appendChild(root);
  notifyRouteChange();
}

function render(model, { mount, page, onRouteChange } = {}) {
  currentModel = model || currentModel;
  currentMount = mount || currentMount;
  currentPageMeta = page || currentPageMeta;
  if (typeof onRouteChange === 'function') {
    routeListener = onRouteChange;
  }
  ensureSelectedStore();
  renderApp();
  const urlPath = getCurrentRoute();
  return { meta: model?.summary?.meta || 'Launch your first store', urlPath };
}

export default {
  render
};
