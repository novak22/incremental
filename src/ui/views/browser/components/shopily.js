import { ensureArray, formatHours } from '../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../utils/formatting.js';
import { createDailyLifecycleSummary } from '../utils/lifecycleSummaries.js';
import { createWorkspacePathController } from '../utils/workspacePaths.js';
import { selectShopilyNiche } from '../../../cards/model/index.js';
import { performQualityAction } from '../../../../game/assets/index.js';
import {
  getAssetDefinition,
  getAssetState,
  getState,
  getUpgradeDefinition,
  getUpgradeState
} from '../../../../core/state.js';

const VIEW_DASHBOARD = 'dashboard';
const VIEW_UPGRADES = 'upgrades';
const VIEW_PRICING = 'pricing';

const UPGRADE_STATUS_TONES = {
  owned: 'owned',
  ready: 'ready',
  unaffordable: 'unaffordable',
  locked: 'locked'
};

let currentState = {
  view: VIEW_DASHBOARD,
  selectedStoreId: null,
  selectedUpgradeId: null
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

const workspacePathController = createWorkspacePathController({
  derivePath: () => {
    switch (currentState.view) {
      case VIEW_PRICING:
        return 'pricing';
      case VIEW_UPGRADES: {
        const upgradeId = currentState.selectedUpgradeId;
        return upgradeId ? `upgrades/${upgradeId}` : 'upgrades';
      }
      case VIEW_DASHBOARD:
      default: {
        const storeId = currentState.selectedStoreId;
        return storeId ? `store/${storeId}` : '';
      }
    }
  }
});

const formatCurrency = amount =>
  baseFormatCurrency(amount, { precision: 'integer', clampZero: true });
const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });
const formatPercent = value =>
  baseFormatPercent(value, { nullFallback: '—', signDisplay: 'always' });

const {
  describeSetupSummary: describePlanSetupSummary,
  describeUpkeepSummary: describePlanUpkeepSummary
} = createDailyLifecycleSummary({
  formatHoursValue: formatHours,
  setupHoursSuffix: ' / day',
  upkeepHoursSuffix: '/day',
  formatUpkeepCost: cost => formatCurrency(cost),
  setupFallback: 'Instant',
  upkeepFallback: 'No upkeep'
});

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

function ensureSelectedUpgrade() {
  if (currentState.view !== VIEW_UPGRADES) {
    return;
  }
  const upgrades = Array.isArray(currentModel.upgrades) ? currentModel.upgrades : [];
  if (!upgrades.length) {
    currentState.selectedUpgradeId = null;
    return;
  }
  const ready = upgrades.find(entry => entry?.snapshot?.ready);
  const existing = upgrades.find(entry => entry.id === currentState.selectedUpgradeId);
  currentState.selectedUpgradeId = (existing || ready || upgrades[0]).id;
}

function setView(view, options = {}) {
  const nextView = view || VIEW_DASHBOARD;
  const nextState = { ...currentState, view: nextView };
  if (options.storeId) {
    nextState.selectedStoreId = options.storeId;
  }
  if (options.upgradeId) {
    nextState.selectedUpgradeId = options.upgradeId;
  }
  currentState = nextState;
  ensureSelectedStore();
  ensureSelectedUpgrade();
  renderApp();
}

function getSelectedStore() {
  const instances = Array.isArray(currentModel.instances) ? currentModel.instances : [];
  return instances.find(entry => entry.id === currentState.selectedStoreId) || null;
}

function getSelectedUpgrade() {
  const upgrades = Array.isArray(currentModel.upgrades) ? currentModel.upgrades : [];
  return upgrades.find(entry => entry.id === currentState.selectedUpgradeId) || null;
}

function handleQuickAction(instanceId, actionId) {
  if (!instanceId || !actionId) return;
  performQualityAction('dropshipping', instanceId, actionId);
}

function handleNicheSelect(instanceId, value) {
  if (!instanceId) return;
  selectShopilyNiche('dropshipping', instanceId, value);
}

function handleUpgradeSelect(upgradeId) {
  if (!upgradeId) return;
  setView(VIEW_UPGRADES, { upgradeId });
}

function formatKeyLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
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

function describeUpgradeSnapshotTone(snapshot = {}) {
  if (snapshot.purchased) return UPGRADE_STATUS_TONES.owned;
  if (snapshot.ready) return UPGRADE_STATUS_TONES.ready;
  if (!snapshot.affordable) return UPGRADE_STATUS_TONES.unaffordable;
  return UPGRADE_STATUS_TONES.locked;
}

function describeUpgradeAffordability(upgrade) {
  const snapshot = upgrade?.snapshot || {};
  if (snapshot.purchased) return 'Already installed and humming.';
  if (snapshot.ready) return 'You can fund this upgrade right now.';
  if (!snapshot.affordable) {
    const state = getState();
    const balance = Number(state?.money) || 0;
    const deficit = Math.max(0, Number(upgrade?.cost || 0) - balance);
    if (deficit <= 0) {
      return 'Stack a little more cash to cover this upgrade.';
    }
    return `Need ${formatCurrency(deficit)} more to fund this upgrade.`;
  }
  if (snapshot.disabled) return 'Meet the prerequisites to unlock checkout.';
  return 'Progress the requirements to unlock this purchase.';
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
      const definition = getUpgradeDefinition(requirement.id);
      const label = definition?.name || formatKeyLabel(requirement.id);
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

function getRequirementEntries(upgrade) {
  const requirements = ensureArray(upgrade?.definition?.requirements);
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

function collectUpgradeHighlights(upgrade) {
  const highlights = [];
  const effectSummary = describeEffectSummary(upgrade?.effects || {}, upgrade?.affects || {});
  if (effectSummary) {
    highlights.push(effectSummary);
  }
  if (upgrade?.boosts) {
    highlights.push(upgrade.boosts);
  }
  if (upgrade?.definition?.unlocks) {
    highlights.push(`Unlocks ${upgrade.definition.unlocks}`);
  }
  const provides = formatSlotMap(upgrade?.definition?.provides);
  if (provides) {
    highlights.push(`Provides ${provides}`);
  }
  const consumes = formatSlotMap(upgrade?.definition?.consumes);
  if (consumes) {
    highlights.push(`Consumes ${consumes}`);
  }
  return highlights;
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
  const tone = describeUpgradeSnapshotTone(upgrade.snapshot);
  card.dataset.status = tone;
  if (upgrade.id === currentState.selectedUpgradeId) {
    card.classList.add('is-active');
  }
  card.tabIndex = 0;

  card.addEventListener('click', () => handleUpgradeSelect(upgrade.id));
  card.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleUpgradeSelect(upgrade.id);
    }
  });

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

  const summary = document.createElement('p');
  summary.className = 'shopily-upgrade__summary';
  summary.textContent = upgrade.description || 'Commerce boost';

  const highlights = document.createElement('ul');
  highlights.className = 'shopily-upgrade__highlights';
  const highlightEntries = collectUpgradeHighlights(upgrade);
  if (!highlightEntries.length) {
    const fallback = document.createElement('li');
    fallback.textContent = 'Stacks with dropshipping payouts and progress.';
    highlights.appendChild(fallback);
  } else {
    highlightEntries.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlights.appendChild(item);
    });
  }

  const footer = document.createElement('div');
  footer.className = 'shopily-upgrade__footer';

  const meta = document.createElement('div');
  meta.className = 'shopily-upgrade__meta';

  const price = document.createElement('span');
  price.className = 'shopily-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);

  const status = document.createElement('span');
  status.className = 'shopily-upgrade__status';
  status.textContent = upgrade.status || 'Progress for this soon';

  meta.append(price, status);

  const actions = document.createElement('div');
  actions.className = 'shopily-upgrade__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'shopily-button shopily-button--ghost';
  viewButton.textContent = 'View product';
  viewButton.addEventListener('click', event => {
    event.stopPropagation();
    handleUpgradeSelect(upgrade.id);
  });

  actions.appendChild(viewButton);
  footer.append(meta, actions);

  card.append(header, summary, highlights, footer);
  return card;
}

function renderUpgradeDetail(upgrade) {
  const detail = document.createElement('aside');
  detail.className = 'shopily-upgrade-detail';

  if (!upgrade) {
    const empty = document.createElement('div');
    empty.className = 'shopily-upgrade-detail__empty';
    empty.textContent = 'Select an upgrade to review requirements, highlights, and checkout.';
    detail.appendChild(empty);
    return detail;
  }

  const tone = describeUpgradeSnapshotTone(upgrade.snapshot);

  const header = document.createElement('header');
  header.className = 'shopily-upgrade-detail__header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'shopily-upgrade-detail__title';

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'shopily-upgrade-detail__tag';
    badge.textContent = upgrade.tag.label;
    titleBlock.appendChild(badge);
  }

  const heading = document.createElement('h2');
  heading.textContent = upgrade.name;
  titleBlock.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.className = 'shopily-upgrade-detail__blurb';
  blurb.textContent = upgrade.description || 'Commerce boost';
  titleBlock.appendChild(blurb);

  const priceBlock = document.createElement('div');
  priceBlock.className = 'shopily-upgrade-detail__price';
  const priceLabel = document.createElement('span');
  priceLabel.textContent = 'Price';
  const priceValue = document.createElement('strong');
  priceValue.textContent = formatCurrency(upgrade.cost || 0);
  priceBlock.append(priceLabel, priceValue);

  header.append(titleBlock, priceBlock);

  const statusRow = document.createElement('div');
  statusRow.className = 'shopily-upgrade-detail__status-row';

  const statusBadge = document.createElement('span');
  statusBadge.className = `shopily-upgrade-detail__badge shopily-upgrade-detail__badge--${tone}`;
  if (upgrade.snapshot?.purchased) {
    statusBadge.textContent = 'Owned';
  } else if (upgrade.snapshot?.ready) {
    statusBadge.textContent = 'Ready to buy';
  } else if (upgrade.snapshot?.affordable === false) {
    statusBadge.textContent = 'Save up';
  } else {
    statusBadge.textContent = 'Locked';
  }

  const statusNote = document.createElement('p');
  statusNote.className = 'shopily-upgrade-detail__note';
  statusNote.textContent = describeUpgradeAffordability(upgrade);

  statusRow.append(statusBadge, statusNote);

  const actions = document.createElement('div');
  actions.className = 'shopily-upgrade-detail__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-button shopily-button--primary';
  if (upgrade.snapshot?.purchased) {
    button.textContent = 'Owned and active';
    button.disabled = true;
  } else if (upgrade.snapshot?.ready) {
    button.textContent = 'Buy now';
  } else if (upgrade.snapshot?.affordable === false) {
    button.textContent = 'Save up to buy';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    upgrade.action?.onClick?.();
  });
  actions.appendChild(button);

  const highlightsSection = document.createElement('section');
  highlightsSection.className = 'shopily-upgrade-detail__section';
  const highlightsHeading = document.createElement('h3');
  highlightsHeading.textContent = 'Highlights';
  const highlightList = document.createElement('ul');
  highlightList.className = 'shopily-upgrade-detail__list';
  const detailHighlights = collectUpgradeHighlights(upgrade);
  if (!detailHighlights.length) {
    const item = document.createElement('li');
    item.textContent = 'Instantly boosts dropshipping payouts and action progress.';
    highlightList.appendChild(item);
  } else {
    detailHighlights.forEach(entry => {
      const item = document.createElement('li');
      item.textContent = entry;
      highlightList.appendChild(item);
    });
  }
  highlightsSection.append(highlightsHeading, highlightList);

  const requirementsSection = document.createElement('section');
  requirementsSection.className = 'shopily-upgrade-detail__section';
  const requirementsHeading = document.createElement('h3');
  requirementsHeading.textContent = 'Prerequisites';
  const requirementList = document.createElement('ul');
  requirementList.className = 'shopily-upgrade-detail__requirements';
  const requirementEntries = getRequirementEntries(upgrade);
  if (!requirementEntries.length) {
    const item = document.createElement('li');
    item.className = 'shopily-upgrade-detail__requirement is-met';
    item.textContent = 'No prerequisites — ready when you are!';
    requirementList.appendChild(item);
  } else {
    requirementEntries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-upgrade-detail__requirement';
      if (entry.met) {
        item.classList.add('is-met');
      }
      const icon = document.createElement('span');
      icon.className = 'shopily-upgrade-detail__requirement-icon';
      icon.textContent = entry.met ? '✓' : '•';
      const text = document.createElement('span');
      text.className = 'shopily-upgrade-detail__requirement-text';
      text.innerHTML = entry.html;
      item.append(icon, text);
      requirementList.appendChild(item);
    });
  }
  requirementsSection.append(requirementsHeading, requirementList);

  const detailsSection = document.createElement('section');
  detailsSection.className = 'shopily-upgrade-detail__section';
  const detailsHeading = document.createElement('h3');
  detailsHeading.textContent = 'Detailed specs';
  const detailList = document.createElement('ul');
  detailList.className = 'shopily-upgrade-detail__list';
  const details = collectDetailStrings(upgrade.definition);
  if (!details.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional notes — install and enjoy the boost!';
    detailList.appendChild(item);
  } else {
    details.forEach(entry => {
      const item = document.createElement('li');
      if (typeof Node !== 'undefined' && entry instanceof Node) {
        item.appendChild(entry);
      } else {
        item.innerHTML = entry;
      }
      detailList.appendChild(item);
    });
  }
  detailsSection.append(detailsHeading, detailList);

  detail.append(header, statusRow, actions, highlightsSection, requirementsSection, detailsSection);
  return detail;
}

function renderUpgradesView(model) {
  const container = document.createElement('section');
  container.className = 'shopily-view shopily-view--upgrades';

  ensureSelectedUpgrade();

  const upgrades = ensureArray(model.upgrades);

  const intro = document.createElement('div');
  intro.className = 'shopily-upgrades__intro';
  intro.innerHTML = '<h2>Commerce upgrade ladder</h2><p>These infrastructure plays reuse the existing upgrade logic so every purchase hits immediately.</p>';

  const layout = document.createElement('div');
  layout.className = 'shopily-upgrades__layout';

  const catalog = document.createElement('div');
  catalog.className = 'shopily-upgrades__catalog';
  catalog.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'shopily-upgrades';
  if (!upgrades.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-empty';
    empty.textContent = 'No commerce upgrades unlocked yet. Build more stores and finish the E-Commerce Playbook to reveal new boosts.';
    list.appendChild(empty);
  } else {
    upgrades.forEach(upgrade => {
      list.appendChild(renderUpgradeCard(upgrade));
    });
  }

  catalog.appendChild(list);

  layout.append(catalog, renderUpgradeDetail(getSelectedUpgrade()));
  container.appendChild(layout);

  return container;
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
  const setupTimeline = plan
    ? describePlanSetupSummary({
        days: plan.setupDays,
        hoursPerDay: plan.setupHours
      })
    : 'Setup timeline varies';
  const upkeepSummary = plan
    ? describePlanUpkeepSummary({
        hours: plan.upkeepHours,
        cost: plan.upkeepCost
      })
    : 'No upkeep';
  const items = [
    { label: 'Setup cost', value: formatCurrency(plan.setupCost || 0) },
    { label: 'Setup timeline', value: setupTimeline },
    { label: 'Daily upkeep', value: upkeepSummary },
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

function renderLockedState(lock) {
  const section = document.createElement('section');
  section.className = 'shopily shopily--locked';
  const message = document.createElement('p');
  message.className = 'shopily-empty';
  if (lock?.type === 'skill') {
    const courseNote = lock.courseName ? ` Complete ${lock.courseName} in Learnly to level up instantly.` : '';
    message.textContent = `${lock.workspaceLabel || 'Shopily'} unlocks at ${lock.skillName} Lv ${lock.requiredLevel}.${courseNote}`;
  } else {
    message.textContent = 'Shopily unlocks once the Dropshipping blueprint is discovered.';
  }
  section.appendChild(message);
  return section;
}

function renderApp() {
  if (!currentMount) {
    workspacePathController.sync();
    return;
  }
  if (!currentModel.definition) {
    currentMount.innerHTML = '';
    currentMount.appendChild(renderLockedState(currentModel.lock));
    workspacePathController.sync();
    return;
  }
  currentMount.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'shopily';
  root.appendChild(renderTopBar(currentModel));

  if (currentState.view === VIEW_UPGRADES) {
    ensureSelectedUpgrade();
  }

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
  workspacePathController.sync();
}

function render(model, { mount, page, onRouteChange } = {}) {
  currentModel = model || currentModel;
  currentMount = mount || currentMount;
  currentPageMeta = page || currentPageMeta;
  if (typeof onRouteChange === 'function') {
    workspacePathController.setListener(onRouteChange);
  }
  ensureSelectedStore();
  ensureSelectedUpgrade();
  renderApp();
  const urlPath = workspacePathController.getPath();
  return { meta: model?.summary?.meta || 'Launch your first store', urlPath };
}

export default {
  render
};
