import { ensureArray, formatHours, formatMoney } from '../../../../core/helpers.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import { selectServerHubNiche } from '../../../cards/model/index.js';

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

function formatCurrency(amount) {
  const numeric = Math.max(0, Math.round(Number(amount) || 0));
  return `$${formatMoney(numeric)}`;
}

function formatNetCurrency(amount) {
  const numeric = Number(amount) || 0;
  const absolute = Math.abs(numeric);
  const formatted = `$${formatMoney(Math.round(absolute))}`;
  return numeric >= 0 ? formatted : `-${formatted}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const percent = Math.round(numeric * 100);
  const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${sign}${Math.abs(percent)}%`;
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

function handleLaunch() {
  const launch = currentModel.launch;
  if (!launch || launch.disabled) {
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

function renderHero(model) {
  const header = document.createElement('header');
  header.className = 'serverhub-header';

  const hero = document.createElement('div');
  hero.className = 'serverhub-hero';
  const title = document.createElement('h1');
  title.textContent = 'Scale your micro SaaS ideas with ServerHub.';
  const note = document.createElement('p');
  note.textContent = currentPageMeta?.tagline
    || 'Deploy, monitor, and optimise every micro app from one professional console.';
  hero.append(title, note);

  const actions = document.createElement('div');
  actions.className = 'serverhub-hero__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-button serverhub-button--primary';
  button.textContent = 'Deploy New App';
  if (model.launch?.disabled) {
    button.disabled = true;
  }
  const reasons = ensureArray(model.launch?.availability?.reasons).filter(Boolean);
  if (reasons.length) {
    button.title = reasons.join('\n');
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    handleLaunch();
  });
  actions.appendChild(button);

  if (model.summary?.setup > 0) {
    const setupInfo = document.createElement('p');
    setupInfo.className = 'serverhub-hero__note';
    setupInfo.textContent = `${model.summary.setup} app${model.summary.setup === 1 ? '' : 's'} finishing launch prep.`;
    actions.appendChild(setupInfo);
  }

  header.append(hero, actions);
  return header;
}

function renderMetrics(model) {
  const metrics = document.createElement('div');
  metrics.className = 'serverhub-metrics';
  ensureArray(model.summary?.hero).forEach(metric => {
    const card = document.createElement('article');
    card.className = 'serverhub-metric';
    const label = document.createElement('h2');
    label.className = 'serverhub-metric__label';
    label.textContent = metric.label;
    const value = document.createElement('p');
    value.className = 'serverhub-metric__value';
    if (metric.id === 'active') {
      value.textContent = String(metric.value || 0);
    } else {
      value.textContent = formatNetCurrency(metric.value || 0);
    }
    const note = document.createElement('span');
    note.className = 'serverhub-metric__note';
    note.textContent = metric.note || '';
    card.append(label, value, note);
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
  cta.addEventListener('click', handleLaunch);
  empty.appendChild(cta);
  return empty;
}

function renderQuickAction(instance, actionId, label) {
  const action = instance?.actionsById?.[actionId];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-quick-action';
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
  ['App Name', 'Niche', 'Daily Earnings', 'Daily Upkeep', 'ROI', 'Actions'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(instance => {
    const row = document.createElement('tr');
    row.dataset.appId = instance.id;
    if (instance.id === currentState.selectedAppId) {
      row.classList.add('is-selected');
    }

    const nameCell = document.createElement('td');
    nameCell.className = 'serverhub-table__cell--name';
    const name = document.createElement('span');
    name.className = 'serverhub-table__name';
    name.textContent = instance.label;
    const status = document.createElement('span');
    status.className = 'serverhub-status';
    status.dataset.state = instance.status?.id || 'setup';
    status.textContent = instance.status?.label || 'Setup';
    nameCell.append(name, status);

    const nicheCell = document.createElement('td');
    nicheCell.className = 'serverhub-table__cell--niche';
    if (instance.niche) {
      const nicheName = document.createElement('strong');
      nicheName.textContent = instance.niche.name;
      const nicheNote = document.createElement('span');
      nicheNote.className = 'serverhub-niche-note';
      const trend = instance.niche.label ? `${instance.niche.label}` : 'Trend data pending';
      nicheNote.textContent = trend;
      nicheCell.append(nicheName, nicheNote);
    } else {
      nicheCell.textContent = 'Unassigned';
    }

    const payoutCell = document.createElement('td');
    payoutCell.textContent = formatCurrency(instance.latestPayout);

    const upkeepCell = document.createElement('td');
    upkeepCell.textContent = formatCurrency(instance.upkeepCost);

    const roiCell = document.createElement('td');
    roiCell.textContent = formatPercent(instance.roi);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'serverhub-table__cell--actions';
    const actionGroup = document.createElement('div');
    actionGroup.className = 'serverhub-action-group';
    actionGroup.append(
      renderQuickAction(instance, 'shipFeature', 'Scale Up'),
      renderQuickAction(instance, 'improveStability', 'Optimize')
    );
    const detailsButton = document.createElement('button');
    detailsButton.type = 'button';
    detailsButton.className = 'serverhub-quick-action serverhub-quick-action--ghost';
    detailsButton.textContent = 'View Details';
    detailsButton.addEventListener('click', event => {
      event.stopPropagation();
      selectApp(instance.id);
    });
    actionGroup.appendChild(detailsButton);
    actionsCell.appendChild(actionGroup);

    row.append(nameCell, nicheCell, payoutCell, upkeepCell, roiCell, actionsCell);
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

function renderActionsList(instance) {
  const list = document.createElement('div');
  list.className = 'serverhub-action-list';
  ensureArray(instance.actions).forEach(action => {
    const card = document.createElement('article');
    card.className = 'serverhub-action-card';
    const title = document.createElement('h3');
    title.textContent = action.label;
    const meta = document.createElement('p');
    meta.className = 'serverhub-action-card__meta';
    const parts = [];
    if (action.time > 0) parts.push(`${formatHours(action.time)} time`);
    if (action.cost > 0) parts.push(`${formatCurrency(action.cost)} budget`);
    meta.textContent = parts.length ? parts.join(' • ') : 'No cost';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'serverhub-button serverhub-button--secondary';
    button.textContent = action.available ? 'Run action' : 'Locked';
    if (!action.available) {
      button.disabled = true;
      if (action.disabledReason) {
        button.title = action.disabledReason;
      }
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      handleQuickAction(instance.id, action.id);
    });
    card.append(title, meta, button);
    list.appendChild(card);
  });
  return list;
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
  const heading = document.createElement('h3');
  heading.textContent = `Quality milestone — Tier ${instance.milestone.level}`;
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
  panels.className = 'serverhub-detail__panels';
  panels.append(
    renderQualitySection(instance),
    renderPayoutBreakdown(instance),
    renderNicheSection(instance)
  );

  const actionsHeading = document.createElement('h3');
  actionsHeading.className = 'serverhub-detail__actions-heading';
  actionsHeading.textContent = 'Action console';

  aside.append(header, stats, panels, actionsHeading, renderActionsList(instance));
  return aside;
}

function renderAppsView(model) {
  const container = document.createElement('section');
  container.className = 'serverhub-view serverhub-view--apps';
  const layout = document.createElement('div');
  layout.className = 'serverhub-layout';

  const activeInstances = ensureArray(model.instances).filter(instance => instance.status?.id === 'active');
  layout.append(renderAppsTable(activeInstances), renderDetailPanel(model));

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

function renderApp() {
  if (!currentMount) return;
  ensureSelectedApp();
  currentMount.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'serverhub';
  root.append(
    renderHero(currentModel),
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
