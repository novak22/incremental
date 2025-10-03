import { ensureArray, formatHours } from '../../../../core/helpers.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import { selectServerHubNiche } from '../../../cards/model/index.js';
import {
  formatCurrency as baseFormatCurrency,
  formatNetCurrency as baseFormatNetCurrency,
  formatPercent as baseFormatPercent
} from '../utils/formatting.js';
import { createLifecycleSummary } from '../utils/lifecycleSummaries.js';
import { showLaunchConfirmation } from '../utils/launchDialog.js';

const VIEW_APPS = 'apps';
const VIEW_UPGRADES = 'upgrades';
const VIEW_PRICING = 'pricing';

let currentState = {
  view: VIEW_APPS,
  selectedAppId: null
};
let currentModel = {
  instances: [],
  summary: {},
  upgrades: [],
  pricing: []
};
let currentMount = null;
let currentPageMeta = null;

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatNetCurrency = amount =>
  baseFormatNetCurrency(amount, { precision: 'integer' });
const formatPercent = value =>
  baseFormatPercent(value, { nullFallback: '—', signDisplay: 'always' });

const ACTION_CONSOLE_ORDER = [
  { id: 'shipFeature', label: 'Ship Feature' },
  { id: 'improveStability', label: 'Improve Stability' },
  { id: 'launchCampaign', label: 'Launch Campaign' },
  { id: 'deployEdgeNodes', label: 'Deploy Edge Nodes' }
];

const { describeSetupSummary: formatSetupSummary, describeUpkeepSummary: formatUpkeepSummary } =
  createLifecycleSummary({
    parseValue: value => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    },
    formatSetupHours: hours => `${formatHours(hours)} per day`,
    formatUpkeepHours: hours => `${formatHours(hours)} per day`,
    formatSetupCost: cost => `${formatCurrency(cost)} upfront`,
    formatUpkeepCost: cost => `${formatCurrency(cost)} per day`,
    setupFallback: 'Instant setup',
    upkeepFallback: 'No upkeep required'
  });

function confirmLaunchWithDetails(definition = {}) {
  const resourceName = definition.singular || definition.name || 'app';
  const setupSummary = formatSetupSummary(definition.setup);
  const upkeepSummary = formatUpkeepSummary(definition.maintenance);
  return showLaunchConfirmation({
    theme: 'serverhub',
    icon: '🛰️',
    title: 'Deploy this app?',
    resourceName,
    tagline: 'Give your SaaS a smooth liftoff with a quick double-check.',
    setupSummary,
    upkeepSummary,
    confirmLabel: 'Deploy app',
    cancelLabel: 'Hold launch'
  });
}

function ensureSelectedApp() {
  const instances = ensureArray(currentModel.instances);
  if (!instances.length) {
    currentState.selectedAppId = null;
    return;
  }
  const active = instances.find(entry => entry.status?.id === 'active');
  const fallback = instances[0];
  const target = instances.find(entry => entry.id === currentState.selectedAppId);
  currentState.selectedAppId = (target || active || fallback)?.id || instances[0].id;
}

function setView(view) {
  currentState = { ...currentState, view: view || VIEW_APPS };
  ensureSelectedApp();
  renderApp();
}

function selectApp(appId) {
  if (!appId) return;
  currentState = { ...currentState, selectedAppId: appId, view: VIEW_APPS };
  renderApp();
}

function getSelectedApp() {
  const instances = ensureArray(currentModel.instances);
  return instances.find(entry => entry.id === currentState.selectedAppId) || null;
}

async function handleLaunch() {
  const launch = currentModel.launch;
  if (!launch || launch.disabled) {
    return;
  }
  const confirmed = await confirmLaunchWithDetails(currentModel.definition);
  if (!confirmed) {
    return;
  }
  launch.onClick?.();
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('saas', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId || !value) return;
  selectServerHubNiche('saas', instanceId, value);
}

function createNavButton(label, view, { badge = null } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-nav__button';
  if (currentState.view === view) {
    button.classList.add('is-active');
  }
  button.textContent = label;
  if (badge !== null) {
    const badgeEl = document.createElement('span');
    badgeEl.className = 'serverhub-nav__badge';
    badgeEl.textContent = badge;
    button.appendChild(badgeEl);
  }
  button.addEventListener('click', () => setView(view));
  return button;
}

function renderHeader(model) {
  const header = document.createElement('header');
  header.className = 'serverhub-header';

  const intro = document.createElement('div');
  intro.className = 'serverhub-header__intro';
  const title = document.createElement('h1');
  title.className = 'serverhub-header__title';
  title.textContent = 'ServerHub Cloud Console';
  const subtitle = document.createElement('p');
  subtitle.className = 'serverhub-header__subtitle';
  subtitle.textContent = 'Deploy SaaS apps, monitor uptime, and optimize ROI.';
  intro.append(title, subtitle);

  const actions = document.createElement('div');
  actions.className = 'serverhub-header__actions';

  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = 'serverhub-button serverhub-button--primary';
  launchButton.textContent = '+ Deploy New App';
  if (model.launch?.disabled) {
    launchButton.disabled = true;
  }
  const reasons = ensureArray(model.launch?.availability?.reasons).filter(Boolean);
  if (reasons.length) {
    launchButton.title = reasons.join('\n');
  }
  launchButton.addEventListener('click', async () => {
    if (launchButton.disabled) return;
    await handleLaunch();
  });

  const upgradesButton = document.createElement('button');
  upgradesButton.type = 'button';
  upgradesButton.className = 'serverhub-button serverhub-button--quiet';
  upgradesButton.textContent = 'Upgrades';
  upgradesButton.ariaPressed = currentState.view === VIEW_UPGRADES ? 'true' : 'false';
  if (currentState.view === VIEW_UPGRADES) {
    upgradesButton.classList.add('is-active');
  }
  upgradesButton.addEventListener('click', () => setView(VIEW_UPGRADES));

  const pricingButton = document.createElement('button');
  pricingButton.type = 'button';
  pricingButton.className = 'serverhub-button serverhub-button--quiet';
  pricingButton.textContent = 'Pricing';
  pricingButton.ariaPressed = currentState.view === VIEW_PRICING ? 'true' : 'false';
  if (currentState.view === VIEW_PRICING) {
    pricingButton.classList.add('is-active');
  }
  pricingButton.addEventListener('click', () => setView(VIEW_PRICING));

  actions.append(launchButton, pricingButton, upgradesButton);

  if (model.summary?.setup > 0) {
    const setupInfo = document.createElement('p');
    setupInfo.className = 'serverhub-header__meta';
    setupInfo.textContent = `${model.summary.setup} app${model.summary.setup === 1 ? '' : 's'} finishing launch prep.`;
    actions.appendChild(setupInfo);
  }

  header.append(intro, actions);
  return header;
}

function renderMetrics(model) {
  const metrics = document.createElement('section');
  metrics.className = 'serverhub-kpis';
  const heroMetrics = ensureArray(model.summary?.hero);
  heroMetrics.forEach(metric => {
    const card = document.createElement('article');
    card.className = 'serverhub-kpi';

    const label = document.createElement('span');
    label.className = 'serverhub-kpi__label';
    label.textContent = metric.label;

    const value = document.createElement('p');
    value.className = 'serverhub-kpi__value';
    if (metric.id === 'active') {
      value.textContent = `${metric.value || 0} deployed`;
    } else if (metric.id === 'net') {
      value.textContent = formatNetCurrency(metric.value || 0);
    } else {
      value.textContent = formatCurrency(metric.value || 0);
    }

    const noteText = metric.note || '';
    const note = document.createElement('span');
    note.className = 'serverhub-kpi__note';
    note.textContent = noteText;

    card.append(label, value);
    if (noteText) {
      card.appendChild(note);
    }
    metrics.appendChild(card);
  });
  return metrics;
}

function renderEmptyTable() {
  const empty = document.createElement('div');
  empty.className = 'serverhub-empty';
  const message = document.createElement('p');
  message.textContent = 'No SaaS apps live yet. Deploy a new instance to kickstart recurring revenue.';
  empty.appendChild(message);
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'serverhub-button serverhub-button--primary';
  cta.textContent = 'Deploy New App';
  cta.addEventListener('click', async () => {
    await handleLaunch();
  });
  empty.appendChild(cta);
  return empty;
}

function renderQuickAction(instance, actionId, label) {
  const action = instance?.actionsById?.[actionId];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-button serverhub-button--quiet serverhub-button--compact';
  button.textContent = label;
  if (!action || !action.available) {
    button.disabled = true;
  }
  const reason = action?.disabledReason;
  if (reason) {
    button.title = reason;
  }
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    handleQuickAction(instance.id, actionId);
  });
  return button;
}

function renderAppsTable(instances) {
  const wrapper = document.createElement('div');
  wrapper.className = 'serverhub-table-wrapper';

  if (!instances.length) {
    wrapper.appendChild(renderEmptyTable());
    return wrapper;
  }

  const table = document.createElement('table');
  table.className = 'serverhub-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  [
    { label: 'App Name', className: 'serverhub-table__heading--name' },
    { label: 'Status', className: 'serverhub-table__heading--status' },
    { label: 'Niche', className: 'serverhub-table__heading--niche' },
    { label: 'Daily Earnings', className: 'serverhub-table__heading--payout' },
    { label: 'Daily Upkeep', className: 'serverhub-table__heading--upkeep' },
    { label: 'ROI %', className: 'serverhub-table__heading--roi' },
    { label: 'Actions', className: 'serverhub-table__heading--actions' }
  ].forEach(({ label, className }) => {
    const th = document.createElement('th');
    th.className = `serverhub-table__heading ${className || ''}`.trim();
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(instance => {
    const row = document.createElement('tr');
    row.dataset.appId = instance.id;
    row.className = 'serverhub-table__row';
    if (instance.id === currentState.selectedAppId) {
      row.classList.add('is-selected');
    }

    const nameCell = document.createElement('td');
    nameCell.className = 'serverhub-table__cell serverhub-table__cell--name';
    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'serverhub-table__link';
    nameButton.textContent = instance.label;
    nameButton.addEventListener('click', event => {
      event.stopPropagation();
      selectApp(instance.id);
    });
    nameCell.appendChild(nameButton);

    const statusCell = document.createElement('td');
    statusCell.className = 'serverhub-table__cell serverhub-table__cell--status';
    const status = document.createElement('span');
    status.className = 'serverhub-status';
    status.dataset.state = instance.status?.id || 'setup';
    status.textContent = instance.status?.label || 'Setup';
    statusCell.appendChild(status);

    const nicheCell = document.createElement('td');
    nicheCell.className = 'serverhub-table__cell serverhub-table__cell--niche';
    if (instance.niche) {
      const nicheName = document.createElement('strong');
      nicheName.className = 'serverhub-niche__name';
      nicheName.textContent = instance.niche.name;
      const nicheNote = document.createElement('span');
      nicheNote.className = 'serverhub-niche__note';
      const trend = instance.niche.label ? `${instance.niche.label}` : 'Trend data pending';
      nicheNote.textContent = trend;
      nicheCell.append(nicheName, nicheNote);
    } else if (instance.nicheLocked) {
      const locked = document.createElement('span');
      locked.className = 'serverhub-niche__locked';
      locked.textContent = 'Locked';
      nicheCell.appendChild(locked);
    } else {
      const select = document.createElement('select');
      select.className = 'serverhub-select serverhub-select--inline';
      select.ariaLabel = `Assign niche to ${instance.label}`;
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Assign niche';
      select.appendChild(placeholder);
      ensureArray(instance.nicheOptions).forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
        select.appendChild(opt);
      });
      select.addEventListener('click', event => event.stopPropagation());
      select.addEventListener('change', event => {
        const value = event.target.value;
        if (!value) return;
        handleNicheSelect(instance.id, value);
      });
      nicheCell.appendChild(select);
    }

    const payoutCell = document.createElement('td');
    payoutCell.className = 'serverhub-table__cell serverhub-table__cell--payout';
    payoutCell.textContent = formatCurrency(instance.latestPayout);

    const upkeepCell = document.createElement('td');
    upkeepCell.className = 'serverhub-table__cell serverhub-table__cell--upkeep';
    upkeepCell.textContent = formatCurrency(instance.upkeepCost);

    const roiCell = document.createElement('td');
    roiCell.className = 'serverhub-table__cell serverhub-table__cell--roi';
    roiCell.textContent = formatPercent(instance.roi);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'serverhub-table__cell serverhub-table__cell--actions';
    const actionGroup = document.createElement('div');
    actionGroup.className = 'serverhub-action-group';
    actionGroup.append(
      renderQuickAction(instance, 'shipFeature', 'Scale Up'),
      renderQuickAction(instance, 'improveStability', 'Optimize')
    );
    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'serverhub-button serverhub-button--ghost serverhub-button--compact';
    detailsButton.textContent = 'View Details';
    detailsButton.addEventListener('click', event => {
      event.stopPropagation();
      selectApp(instance.id);
    });
    actionGroup.appendChild(detailsButton);
    actionsCell.appendChild(actionGroup);

    row.append(
      nameCell,
      statusCell,
      nicheCell,
      payoutCell,
      upkeepCell,
      roiCell,
      actionsCell
    );
    row.addEventListener('click', () => selectApp(instance.id));
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function createStat(label, value, note = '') {
  const item = document.createElement('div');
  item.className = 'serverhub-detail__stat';
  const title = document.createElement('span');
  title.className = 'serverhub-detail__stat-label';
  title.textContent = label;
  const amount = document.createElement('strong');
  amount.className = 'serverhub-detail__stat-value';
  amount.textContent = value;
  item.append(title, amount);
  if (note) {
    const noteEl = document.createElement('span');
    noteEl.className = 'serverhub-detail__stat-note';
    noteEl.textContent = note;
    item.appendChild(noteEl);
  }
  return item;
}

function renderActionConsole(instance) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel serverhub-panel--actions';
  const heading = document.createElement('h3');
  heading.textContent = 'Action console';
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'serverhub-action-console';

  const actions = ensureArray(instance.actions);
  let rendered = 0;

  ACTION_CONSOLE_ORDER.forEach(({ id, label }) => {
    const action = instance.actionsById?.[id]
      || actions.find(entry => entry.id === id);
    if (!action) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'serverhub-action-console__button';
    const actionLabel = document.createElement('span');
    actionLabel.className = 'serverhub-action-console__label';
    actionLabel.textContent = action.label || label;
    const meta = document.createElement('span');
    meta.className = 'serverhub-action-console__meta';
    const timeLabel = Number(action.time) > 0 ? formatHours(action.time) : 'Instant';
    const costLabel = formatCurrency(action.cost || 0);
    meta.textContent = `${timeLabel} • ${costLabel}`;
    if (!action.available) {
      button.disabled = true;
      if (action.disabledReason) {
        button.title = action.disabledReason;
      }
    }
    button.append(actionLabel, meta);
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (button.disabled) return;
      handleQuickAction(instance.id, action.id);
    });
    list.appendChild(button);
    rendered += 1;
  });

  if (!rendered) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-panel__hint';
    empty.textContent = 'Quality actions unlock as your SaaS portfolio grows.';
    section.appendChild(empty);
  } else {
    section.appendChild(list);
  }

  return section;
}

function renderNicheSection(instance) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'Niche targeting';
  section.appendChild(heading);

  if (instance.niche) {
    const summary = document.createElement('p');
    summary.className = 'serverhub-panel__lead';
    const label = instance.niche.label ? `${instance.niche.label} • ` : '';
    summary.textContent = `${label}${instance.niche.summary || 'Audience details updating daily.'}`;
    section.appendChild(summary);
  }

  if (instance.nicheLocked) {
    const locked = document.createElement('p');
    locked.className = 'serverhub-panel__hint';
    locked.textContent = 'Niche locked in — reroll popularity tomorrow for fresh multipliers.';
    section.appendChild(locked);
  } else {
    const field = document.createElement('label');
    field.className = 'serverhub-field';
    field.textContent = 'Assign niche';
    const select = document.createElement('select');
    select.className = 'serverhub-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a niche';
    select.appendChild(placeholder);
    ensureArray(instance.nicheOptions).forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} (${option.label || 'Popularity pending'})`;
      select.appendChild(opt);
    });
    select.addEventListener('change', event => {
      const value = event.target.value;
      if (!value) return;
      handleNicheSelect(instance.id, value);
    });
    field.appendChild(select);
    section.appendChild(field);
  }

  return section;
}

function renderPayoutBreakdown(instance) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'Payout recap';
  section.appendChild(heading);

  const total = document.createElement('p');
  total.className = 'serverhub-panel__lead';
  total.textContent = `Yesterday: ${formatCurrency(instance.payoutBreakdown?.total || instance.latestPayout)}`;
  section.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'serverhub-breakdown';
  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const item = document.createElement('li');
    item.textContent = 'Core subscriptions, no modifiers yesterday.';
    list.appendChild(item);
  } else {
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'serverhub-breakdown__item';
      const label = document.createElement('span');
      label.className = 'serverhub-breakdown__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'serverhub-breakdown__value';
      const percent = entry.percent !== null && entry.percent !== undefined
        ? ` (${formatPercent(entry.percent)})`
        : '';
      value.textContent = `${formatCurrency(entry.amount)}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
  }
  section.appendChild(list);
  return section;
}

function renderQualitySection(instance) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';
  const heading = document.createElement('div');
  heading.className = 'serverhub-panel__header';
  const title = document.createElement('h3');
  title.textContent = 'Quality tier';
  const badge = document.createElement('span');
  badge.className = 'serverhub-panel__badge';
  badge.textContent = `Tier ${instance.milestone.level}`;
  heading.append(title, badge);
  section.appendChild(heading);

  const progress = document.createElement('div');
  progress.className = 'serverhub-progress';
  progress.style.setProperty('--serverhub-progress', String(Math.round((instance.milestone.percent || 0) * 100)));
  const progressFill = document.createElement('span');
  progressFill.className = 'serverhub-progress__fill';
  progress.appendChild(progressFill);

  const summary = document.createElement('p');
  summary.className = 'serverhub-panel__hint';
  summary.textContent = instance.milestone.summary;

  section.append(progress, summary);
  return section;
}

function renderDetailPanel(model) {
  const aside = document.createElement('aside');
  aside.className = 'serverhub-sidebar';
  const instance = getSelectedApp();
  if (!instance) {
    const empty = document.createElement('div');
    empty.className = 'serverhub-detail__empty';
    empty.textContent = 'Select an app to inspect uptime, payouts, and quality progress.';
    aside.appendChild(empty);
    return aside;
  }

  const header = document.createElement('header');
  header.className = 'serverhub-detail__header';
  const title = document.createElement('h2');
  title.textContent = instance.label;
  const status = document.createElement('span');
  status.className = 'serverhub-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Active';
  header.append(title, status);

  const tabs = document.createElement('div');
  tabs.className = 'serverhub-detail__tabs';
  const overviewTab = document.createElement('button');
  overviewTab.type = 'button';
  overviewTab.className = 'serverhub-detail__tab is-active';
  overviewTab.textContent = 'Overview';
  overviewTab.disabled = true;
  tabs.appendChild(overviewTab);

  const stats = document.createElement('div');
  stats.className = 'serverhub-detail__stats';
  stats.append(
    createStat('Daily earnings', formatCurrency(instance.latestPayout)),
    createStat('Average daily', formatCurrency(instance.averagePayout)),
    createStat('Pending income', formatCurrency(instance.pendingIncome)),
    createStat('Lifetime revenue', formatCurrency(instance.lifetimeIncome)),
    createStat('Lifetime spend', formatCurrency(instance.lifetimeSpend)),
    createStat('Net profit', formatNetCurrency(instance.profit)),
    createStat('ROI', formatPercent(instance.roi)),
    createStat('Days live', `${instance.daysLive} day${instance.daysLive === 1 ? '' : 's'}`)
  );

  const panels = document.createElement('div');
  panels.className = 'serverhub-detail__grid';
  panels.append(
    renderQualitySection(instance),
    renderNicheSection(instance),
    renderPayoutBreakdown(instance)
  );

  aside.append(header, tabs, stats, panels, renderActionConsole(instance));
  return aside;
}

function renderAppsView(model) {
  const container = document.createElement('section');
  container.className = 'serverhub-view serverhub-view--apps';
  const layout = document.createElement('div');
  layout.className = 'serverhub-layout';

  const allInstances = ensureArray(model.instances);
  layout.append(renderAppsTable(allInstances), renderDetailPanel(model));

  container.appendChild(layout);
  return container;
}

function describeUpgradeEffects(effects = {}, affects = {}) {
  const parts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    if (!Number.isFinite(Number(value))) return;
    const percent = Math.round((Number(value) - 1) * 100);
    if (effect === 'payout_mult') {
      parts.push(`${percent >= 0 ? '+' : ''}${percent}% payouts`);
    } else if (effect === 'quality_progress_mult') {
      parts.push(`${percent >= 0 ? '+' : ''}${percent}% quality speed`);
    } else if (effect === 'maint_time_mult') {
      parts.push(`${percent >= 0 ? '+' : ''}${percent}% upkeep time`);
    } else if (effect === 'setup_time_mult') {
      parts.push(`${percent >= 0 ? '+' : ''}${percent}% setup time`);
    }
  });
  if (!parts.length) return '';
  const scope = [];
  const ids = ensureArray(affects.assets?.ids);
  if (ids.length) scope.push(`Apps: ${ids.join(', ')}`);
  const tags = ensureArray(affects.assets?.tags);
  if (tags.length) scope.push(`Tags: ${tags.join(', ')}`);
  return scope.length ? `${parts.join(' • ')} → ${scope.join(' & ')}` : parts.join(' • ');
}

function renderUpgradesView(model) {
  const container = document.createElement('section');
  container.className = 'serverhub-view serverhub-view--upgrades';
  const intro = document.createElement('div');
  intro.className = 'serverhub-upgrades__intro';
  intro.innerHTML = '<h2>Infrastructure boosts</h2><p>Purchase upgrades to unlock faster deployments, happier customers, and higher SaaS payouts.</p>';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'serverhub-upgrades';
  const upgrades = ensureArray(model.upgrades);
  if (!upgrades.length) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-empty';
    empty.textContent = 'No infrastructure upgrades unlocked yet. Progress your SaaS ladder to reveal new boosts.';
    grid.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      const card = document.createElement('article');
      card.className = 'serverhub-upgrade';
      card.dataset.status = upgrade.snapshot?.purchased ? 'owned' : upgrade.snapshot?.ready ? 'ready' : 'locked';

      const header = document.createElement('header');
      header.className = 'serverhub-upgrade__header';
      const title = document.createElement('h3');
      title.textContent = upgrade.name;
      header.appendChild(title);
      if (upgrade.tag?.label) {
        const badge = document.createElement('span');
        badge.className = 'serverhub-upgrade__badge';
        badge.textContent = upgrade.tag.label;
        header.appendChild(badge);
      }

      const description = document.createElement('p');
      description.className = 'serverhub-upgrade__summary';
      description.textContent = upgrade.description || 'Infrastructure boost';

      const price = document.createElement('p');
      price.className = 'serverhub-upgrade__price';
      price.textContent = formatCurrency(upgrade.cost || 0);

      const effect = document.createElement('p');
      effect.className = 'serverhub-upgrade__note';
      effect.textContent = describeUpgradeEffects(upgrade.effects, upgrade.affects)
        || 'Stacks with SaaS payouts and progress.';

      const status = document.createElement('p');
      status.className = 'serverhub-upgrade__status';
      status.textContent = upgrade.status || 'Progress toward unlock requirements.';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'serverhub-button serverhub-button--primary';
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
      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
  return container;
}

function renderPricingView(model) {
  const container = document.createElement('section');
  container.className = 'serverhub-view serverhub-view--pricing';
  const intro = document.createElement('div');
  intro.className = 'serverhub-pricing__intro';
  intro.innerHTML = '<h2>Hosting plans</h2><p>Choose the scale profile that matches your roadmap. All plans reuse the existing micro SaaS backend logic.</p>';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'serverhub-pricing';
  const plans = ensureArray(model.pricing);
  plans.forEach(plan => {
    const card = document.createElement('article');
    card.className = 'serverhub-plan';
    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = plan.title;
    header.appendChild(title);
    const summary = document.createElement('p');
    summary.className = 'serverhub-plan__summary';
    summary.textContent = plan.summary;

    const list = document.createElement('ul');
    list.className = 'serverhub-plan__list';
    const payoutRange = plan.payout || {};
    const min = Math.max(0, Number(payoutRange.min) || 0);
    const max = Math.max(0, Number(payoutRange.max) || 0);
    const payoutLabel = min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;

    [
      { label: 'Setup cost', value: formatCurrency(plan.setup?.cost || 0) },
      { label: 'Setup time', value: `${plan.setup?.days || 0} day${plan.setup?.days === 1 ? '' : 's'} • ${formatHours(plan.setup?.hoursPerDay || 0)}/day` },
      { label: 'Daily upkeep', value: `${formatCurrency(plan.upkeep?.cost || 0)} • ${formatHours(plan.upkeep?.hours || 0)}` },
      { label: 'Projected daily payout', value: payoutLabel }
    ].forEach(entry => {
      const item = document.createElement('li');
      item.className = 'serverhub-plan__item';
      const label = document.createElement('span');
      label.className = 'serverhub-plan__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'serverhub-plan__value';
      value.textContent = entry.value;
      item.append(label, value);
      list.appendChild(item);
    });

    card.append(header, summary, list);
    grid.appendChild(card);
  });

  if (!plans.length) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-empty';
    empty.textContent = 'Pricing details unlock after discovering the micro SaaS asset.';
    grid.appendChild(empty);
  }

  container.appendChild(grid);
  return container;
}

function renderNav(model) {
  const nav = document.createElement('nav');
  nav.className = 'serverhub-nav';
  const appsBadge = model.summary?.active || 0;
  const upgradesBadge = ensureArray(model.upgrades).filter(upgrade => upgrade.snapshot?.ready).length || null;
  nav.append(
    createNavButton('My Apps', VIEW_APPS, { badge: appsBadge || null }),
    createNavButton('Upgrades', VIEW_UPGRADES, { badge: upgradesBadge || null }),
    createNavButton('Pricing', VIEW_PRICING)
  );
  return nav;
}

function renderBody(model) {
  switch (currentState.view) {
    case VIEW_UPGRADES:
      return renderUpgradesView(model);
    case VIEW_PRICING:
      return renderPricingView(model);
    case VIEW_APPS:
    default:
      return renderAppsView(model);
  }
}

function renderLockedState(lock) {
  const wrapper = document.createElement('section');
  wrapper.className = 'serverhub serverhub--locked';
  const message = document.createElement('p');
  message.className = 'serverhub-empty';
  if (lock?.type === 'skill') {
    const courseNote = lock.courseName ? ` Complete ${lock.courseName} in Learnly to level up instantly.` : '';
    message.textContent = `${lock.workspaceLabel || 'This console'} unlocks at ${lock.skillName} Lv ${lock.requiredLevel}.${courseNote}`;
  } else {
    message.textContent = 'ServerHub unlocks once the SaaS Micro-App blueprint is discovered.';
  }
  wrapper.appendChild(message);
  return wrapper;
}

function renderApp() {
  if (!currentMount) return;
  if (!currentModel.definition) {
    currentMount.innerHTML = '';
    currentMount.appendChild(renderLockedState(currentModel.lock));
    return;
  }

  ensureSelectedApp();
  currentMount.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'serverhub';
  root.append(
    renderHeader(currentModel),
    renderMetrics(currentModel),
    renderNav(currentModel),
    renderBody(currentModel)
  );
  currentMount.appendChild(root);
}

function render(model, { mount, page }) {
  currentModel = model || {};
  currentMount = mount || null;
  currentPageMeta = page || null;
  ensureSelectedApp();
  renderApp();
  const meta = currentModel?.summary?.meta || 'Launch your first micro SaaS';
  return { meta };
}

export default {
  render
};
