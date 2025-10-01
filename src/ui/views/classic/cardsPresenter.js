import {
  getAssetGallery,
  getHustleControls,
  getUpgradeDockList,
  getUpgradeEmptyNode,
  getUpgradeLaneList,
  getUpgradeList,
  getUpgradeOverview
} from '../../elements/registry.js';
import { getAssetState, getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';
import {
  assetRequirementsMetById,
  describeRequirement,
  formatAssetRequirementLabel,
  getDefinitionRequirements,
  listAssetRequirementDescriptors
} from '../../../game/requirements.js';
import {
  describeInstance,
  describeInstanceNetHourly
} from '../../assetInstances.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance,
  formatMaintenanceSummary
} from '../../../game/assets/helpers.js';
import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import {
  getPendingEquipmentUpgrades,
  isUpgradeDisabled
} from '../../assetUpgrades.js';
import { getAssetEffectMultiplier } from '../../../game/upgrades/effects.js';
import {
  canPerformQualityAction,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityNextRequirements,
  getQualityTracks,
  getNextQualityLevel,
  getInstanceQualityRange,
  performQualityAction
} from '../../../game/assets/quality.js';
import { applyCardFilters } from '../../layout.js';
import {
  buildAssetModels,
  buildUpgradeModels,
  describeAssetCardSummary,
  describeAssetLaunchAvailability,
  describeUpgradeStatus,
  formatInstanceUpkeep,
  getAssetGroupId,
  getAssetGroupLabel,
  getAssetGroupNote,
  getUpgradeSnapshot
} from '../../cards/model.js';
import {
  createAssetDetailHighlights,
  createInstanceCard,
  formatPercent,
  calculateInstanceProgress,
  buildSpecialActionButtons,
  formatInstanceDailyAverage
} from './assetDetails.js';
import { showSlideOver } from './components/slideOver.js';
import {
  cacheEducationModels,
  isStudyDefinition,
  renderStudySection,
  updateStudySection,
  updateStudyTrack
} from './studySection.js';
import {
  cacheHustleModels,
  renderHustles,
  tryUpdateHustleCard,
  updateHustles
} from './hustleCards.js';
import { emitUIEvent } from './utils/events.js';

const upgradeUi = new Map();
const upgradeSections = new Map();
const upgradeLaneItems = new Map();
let currentAssetDefinitions = [];
let currentAssetModels = { groups: [], launchers: [] };
const assetGroupUi = new Map();
const assetModelGroupByDefinition = new Map();
const assetDefinitionLookup = new Map();
let assetPortfolioNode = null;
let assetHubNode = null;
let assetEmptyNotice = null;
let currentUpgradeDefinitions = [];
let currentUpgradeModels = { categories: [], overview: { purchased: 0, ready: 0, total: 0, note: '' } };
const upgradeDefinitionLookup = new Map();
let assetLaunchPanelExpanded = false;

function normalizeRegistries(registries = {}) {
  return {
    hustles: Array.isArray(registries?.hustles) ? registries.hustles : [],
    education: Array.isArray(registries?.education) ? registries.education : [],
    assets: Array.isArray(registries?.assets) ? registries.assets : [],
    upgrades: Array.isArray(registries?.upgrades) ? registries.upgrades : []
  };
}

function cacheAssetModels(models = {}) {
  const groups = Array.isArray(models?.groups) ? models.groups : [];
  const launchers = Array.isArray(models?.launchers) ? models.launchers : [];
  currentAssetModels = { groups, launchers };
  assetModelGroupByDefinition.clear();
  groups.forEach(group => {
    if (!group?.id) return;
    const definitions = Array.isArray(group.definitions) ? group.definitions : [];
    definitions.forEach(entry => {
      const definitionId = entry?.id || entry?.definition?.id;
      if (definitionId) {
        assetModelGroupByDefinition.set(definitionId, group);
      }
    });
  });
}

function cacheAssetDefinitions(definitions = []) {
  assetDefinitionLookup.clear();
  definitions.forEach(definition => {
    if (definition?.id) {
      assetDefinitionLookup.set(definition.id, definition);
    }
  });
}

function cacheUpgradeDefinitions(definitions = []) {
  upgradeDefinitionLookup.clear();
  currentUpgradeDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  currentUpgradeDefinitions.forEach(definition => {
    if (definition?.id) {
      upgradeDefinitionLookup.set(definition.id, definition);
    }
  });
}

function cacheCardModels(models = {}) {
  cacheHustleModels(models?.hustles);
  cacheEducationModels(models?.education);
  cacheAssetModels(models?.assets);
  cacheUpgradeModels(models?.upgrades);
}

function cacheUpgradeModels(models = {}) {
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

function findUpgradeModelById(id) {
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


function buildLaunchFeedbackMessage(definition) {
  const singular = definition.singular || definition.name || 'Venture';
  return `New ${singular.toLowerCase()} is being set up.`;
}


function formatUpkeepTotals(cost, hours) {
  const parts = [];
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  return parts.length ? parts.join(' • ') : 'None';
}

function buildAssetSummary(groups = []) {
  const totals = groups.reduce(
    (acc, group) => {
      (group.instances || []).forEach(entry => {
        if (!entry) return;
        const definition = entry.definition || assetDefinitionLookup.get(entry.definitionId);
        const instance = entry.instance || null;
        const status = instance?.status || entry.status || 'setup';

        acc.total += 1;
        if (status === 'active') {
          acc.active += 1;
          const maintenance = definition?.maintenance || {};
          acc.upkeepCost += Number(maintenance.cost) || 0;
          acc.upkeepHours += Number(maintenance.hours) || 0;
        } else {
          acc.setup += 1;
        }
      });
      return acc;
    },
    { total: 0, active: 0, setup: 0, upkeepCost: 0, upkeepHours: 0 }
  );

  if (totals.total === 0) {
    const empty = document.createElement('section');
    empty.className = 'venture-summary venture-summary--empty';
    const message = document.createElement('p');
    message.className = 'venture-summary__empty';
    message.textContent = 'No ventures launched yet. Spin up your first build to start the passive flow!';
    empty.appendChild(message);
    return empty;
  }

  const summary = document.createElement('section');
  summary.className = 'venture-summary';

  const stats = [
    { label: 'Ventures launched', value: totals.total },
    { label: 'Active & thriving', value: totals.active },
    { label: 'In incubation', value: totals.setup },
    { label: 'Daily upkeep', value: formatUpkeepTotals(totals.upkeepCost, totals.upkeepHours) }
  ];

  stats.forEach(entry => {
    const stat = document.createElement('div');
    stat.className = 'venture-summary__stat';
    const value = document.createElement('span');
    value.className = 'venture-summary__value';
    value.textContent = entry.value;
    const label = document.createElement('span');
    label.className = 'venture-summary__label';
    label.textContent = entry.label;
    stat.append(value, label);
    summary.appendChild(stat);
  });

  return summary;
}

function buildAssetLaunchTile(launcher, state = getState()) {
  if (!launcher) return null;
  const definition = launcher.definition;
  const action = launcher.action;
  if (!definition || !action || typeof action.onClick !== 'function') {
    return null;
  }

  const tile = document.createElement('article');
  tile.className = 'venture-launcher__tile';

  const heading = document.createElement('header');
  heading.className = 'venture-launcher__heading';
  const title = document.createElement('h3');
  title.className = 'venture-launcher__title';
  title.textContent = launcher.name || definition.name || definition.id || 'Venture';
  heading.appendChild(title);

  const tag = document.createElement('span');
  tag.className = 'venture-launcher__type';
  tag.textContent = launcher.singular || definition.singular || 'Passive venture';
  heading.appendChild(tag);
  tile.appendChild(heading);

  const summaryCopy = launcher.summary || describeAssetCardSummary(definition);
  if (summaryCopy) {
    const summary = document.createElement('p');
    summary.className = 'venture-launcher__summary';
    summary.textContent = summaryCopy;
    tile.appendChild(summary);
  }

  const stats = document.createElement('p');
  stats.className = 'venture-launcher__meta';
  const parts = [];
  const setupDays = Number(launcher.setup?.days ?? definition.setup?.days) || 0;
  const setupHours = Number(launcher.setup?.hoursPerDay ?? definition.setup?.hoursPerDay) || 0;
  if (setupDays > 0) {
    parts.push(`${setupDays} day${setupDays === 1 ? '' : 's'} of prep`);
  }
  if (setupHours > 0) {
    parts.push(`${formatHours(setupHours)}/day`);
  }
  const setupCost = Number(launcher.setup?.cost ?? definition.setup?.cost) || 0;
  if (setupCost > 0) {
    parts.push(`$${formatMoney(setupCost)} upfront`);
  }
  const maintenanceText = launcher.upkeep || formatInstanceUpkeep(definition);
  if (maintenanceText) {
    parts.push(`Upkeep ${maintenanceText}`);
  }
  stats.textContent = parts.join(' • ');
  tile.appendChild(stats);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'venture-launcher__button';
  button.textContent = action.label
    || `Launch ${launcher.singular || definition.singular || definition.name || 'venture'}`;
  button.disabled = Boolean(action.disabled);
  if (Array.isArray(action.reasons) && action.reasons.length) {
    button.title = action.reasons.join(' • ');
  } else if (Number(action.hours) > 0 || Number(action.cost) > 0) {
    const detailParts = [];
    if (Number(action.hours) > 0) detailParts.push(`Needs ${formatHours(action.hours)} free today`);
    if (Number(action.cost) > 0) detailParts.push(`Costs $${formatMoney(action.cost)}`);
    if (detailParts.length) {
      button.title = detailParts.join(' • ');
    }
  }
  if (button.disabled) {
    tile.classList.add('is-disabled');
  }

  const feedback = document.createElement('p');
  feedback.className = 'venture-launcher__feedback';
  feedback.hidden = true;
  tile.appendChild(feedback);

  button.addEventListener('click', event => {
    event.preventDefault();
    if (button.disabled) return;

    const beforeState = getAssetState(definition.id, getState());
    const beforeCount = Array.isArray(beforeState?.instances) ? beforeState.instances.length : 0;
    action.onClick();
    setTimeout(() => {
      const afterState = getAssetState(definition.id, getState());
      const afterCount = Array.isArray(afterState?.instances) ? afterState.instances.length : 0;
      if (afterCount > beforeCount) {
        feedback.textContent = buildLaunchFeedbackMessage(definition);
        feedback.hidden = false;
        tile.classList.add('venture-launcher__tile--success');
        setTimeout(() => {
          feedback.hidden = true;
          tile.classList.remove('venture-launcher__tile--success');
        }, 2400);
        const refreshedModels = buildAssetModels(currentAssetDefinitions);
        updateAssets(currentAssetDefinitions, refreshedModels);
        applyCardFilters();
      }
    }, 40);
  });

  tile.appendChild(button);
  return tile;
}
function buildAssetLaunchPanel(launchers = [], state = getState()) {
  const tiles = launchers
    .map(launcher => buildAssetLaunchTile(launcher, state))
    .filter(Boolean);
  if (!tiles.length) {
    assetLaunchPanelExpanded = false;
    return null;
  }

  const container = document.createElement('section');
  container.className = 'venture-launcher';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'venture-launcher__trigger primary';
  trigger.textContent = assetLaunchPanelExpanded ? 'Hide launch options' : 'Launch a new venture';
  trigger.setAttribute('aria-expanded', assetLaunchPanelExpanded ? 'true' : 'false');
  const contentId = 'venture-launcher-options';
  trigger.setAttribute('aria-controls', contentId);
  if (assetLaunchPanelExpanded) {
    trigger.classList.add('is-open');
  }
  container.appendChild(trigger);

  const content = document.createElement('div');
  content.className = 'venture-launcher__content';
  content.id = contentId;
  content.hidden = !assetLaunchPanelExpanded;

  const header = document.createElement('div');
  header.className = 'venture-launcher__header';
  const title = document.createElement('h3');
  title.className = 'venture-launcher__heading-title';
  title.textContent = 'Launch a new venture';
  header.appendChild(title);
  const note = document.createElement('p');
  note.className = 'venture-launcher__note';
  note.textContent = 'Pick a build to celebrate a brand-new income stream.';
  header.appendChild(note);
  content.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'venture-launcher__grid';
  tiles.forEach(tile => grid.appendChild(tile));
  content.appendChild(grid);
  container.appendChild(content);

  trigger.addEventListener('click', event => {
    event.preventDefault();
    assetLaunchPanelExpanded = !assetLaunchPanelExpanded;
    content.hidden = !assetLaunchPanelExpanded;
    trigger.setAttribute('aria-expanded', assetLaunchPanelExpanded ? 'true' : 'false');
    trigger.textContent = assetLaunchPanelExpanded ? 'Hide launch options' : 'Launch a new venture';
    trigger.classList.toggle('is-open', assetLaunchPanelExpanded);
  });
  return container;
}
function buildAssetHub(groups, launchers, state = getState()) {
  const summary = buildAssetSummary(groups);
  const launchPanel = buildAssetLaunchPanel(launchers, state);
  if (!summary && !launchPanel) return null;

  const container = document.createElement('div');
  container.className = 'venture-hub';
  if (summary) container.appendChild(summary);
  if (launchPanel) container.appendChild(launchPanel);
  return container;
}
function createMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'asset-overview-card__metric';
  const metricLabel = document.createElement('span');
  metricLabel.className = 'asset-overview-card__metric-label';
  metricLabel.textContent = label;
  const metricValue = document.createElement('span');
  metricValue.className = 'asset-overview-card__metric-value';
  metricValue.textContent = value;
  metric.append(metricLabel, metricValue);
  return metric;
}

function buildMetricsRow(definition, instance, state, riskLabel) {
  const metrics = document.createElement('div');
  metrics.className = 'asset-overview-card__metrics';
  metrics.appendChild(createMetric('Daily haul', formatInstanceDailyAverage(instance, state)));
  metrics.appendChild(createMetric('Upkeep', formatInstanceUpkeep(definition) || 'None'));
  metrics.appendChild(createMetric('Risk', riskLabel));

  const netLabel = describeInstanceNetHourly(definition, instance);
  if (netLabel) {
    metrics.appendChild(createMetric('Net / hour', netLabel));
  }

  const nicheInfo = getInstanceNicheInfo(instance, state);
  const trend = nicheInfo?.popularity;
  if (trend) {
    const impact = Number(trend.multiplier);
    const impactLabel = Number.isFinite(impact) ? formatPercent(impact - 1) : null;
    const descriptor = trend.label || (impact > 1 ? 'Hot streak' : impact < 1 ? 'Cooling' : 'Steady');
    const value = impactLabel ? `${descriptor} • ${impactLabel}` : descriptor;
    metrics.appendChild(createMetric('Trend', value));
  }

  return metrics;
}

function buildNicheField(definition, instance, state) {
  const field = document.createElement('div');
  field.className = 'asset-overview-card__field asset-overview-card__field--niche';

  const label = document.createElement('span');
  label.className = 'asset-overview-card__label';
  label.textContent = 'Niche';
  field.appendChild(label);

  const info = getInstanceNicheInfo(instance, state);
  if (info) {
    field.dataset.locked = 'true';
    const badge = document.createElement('span');
    badge.className = 'asset-overview-card__badge';
    badge.textContent = info.definition?.name || 'Assigned';
    const impact = Number(info.popularity?.multiplier);
    const percent = Number.isFinite(impact) ? formatPercent(impact - 1) : null;
    const summary = info.popularity?.summary || 'Demand shifts update daily.';
    if (Number.isFinite(impact)) {
      badge.dataset.trend = impact > 1 ? 'up' : impact < 1 ? 'down' : 'steady';
    }
    field.appendChild(badge);
    const note = document.createElement('span');
    note.className = 'asset-overview-card__note';
    note.textContent = percent ? `${summary} • Impact ${percent}` : summary;
    field.appendChild(note);
    return field;
  }

  const select = document.createElement('select');
  select.className = 'asset-overview-card__niche-select';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Assign a niche';
  select.appendChild(placeholder);

  getAssignableNicheSummaries(definition, state).forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.definition.id;
    const popularity = entry.popularity?.label ? ` — ${entry.popularity.label}` : '';
    option.textContent = `${entry.definition.name}${popularity}`;
    select.appendChild(option);
  });

  select.addEventListener('change', event => {
    const { value } = event.target;
    if (!value) return;
    const assigned = assignInstanceToNiche(definition.id, instance.id, value);
    if (assigned) {
      select.disabled = true;
      updateAssets(currentAssetDefinitions, currentAssetModels);
      applyCardFilters();
    }
  });

  field.appendChild(select);
  const hint = document.createElement('span');
  hint.className = 'asset-overview-card__note';
  hint.textContent = 'Lock in a niche to let this venture ride daily popularity rolls.';
  field.appendChild(hint);
  return field;
}

function buildQualityBlock(definition, instance) {
  const progressInfo = calculateInstanceProgress(definition, instance);
  const container = document.createElement('section');
  container.className = 'asset-overview-card__quality';

  const heading = document.createElement('div');
  heading.className = 'asset-overview-card__quality-heading';
  const title = document.createElement('span');
  title.className = 'asset-overview-card__quality-level';
  const tierName = progressInfo.levelInfo?.name ? ` — ${progressInfo.levelInfo.name}` : '';
  title.textContent = `Quality ${progressInfo.level}${tierName}`;
  heading.appendChild(title);

  if (progressInfo.nextLevel) {
    const next = document.createElement('span');
    next.className = 'asset-overview-card__quality-next';
    const nextName = progressInfo.nextLevel.name ? ` — ${progressInfo.nextLevel.name}` : '';
    next.textContent = `Next: Quality ${progressInfo.nextLevel.level}${nextName}`;
    heading.appendChild(next);
  } else {
    const maxed = document.createElement('span');
    maxed.className = 'asset-overview-card__quality-next';
    maxed.textContent = 'Top tier reached — bask in the payouts!';
    heading.appendChild(maxed);
  }

  container.appendChild(heading);

  if (progressInfo.nextLevel) {
    const progress = document.createElement('div');
    progress.className = 'asset-overview-card__progress';
    const track = document.createElement('div');
    track.className = 'asset-overview-card__progress-track';
    const fill = document.createElement('div');
    fill.className = 'asset-overview-card__progress-fill';
    fill.style.setProperty('--progress', String(Math.max(0, Math.min(1, progressInfo.percent))));
    track.appendChild(fill);
    progress.appendChild(track);

    const label = document.createElement('span');
    label.className = 'asset-overview-card__progress-label';
    if (progressInfo.ready) {
      label.textContent = 'All requirements met! Fire a quality action to rank up.';
    } else if (progressInfo.summary) {
      label.textContent = progressInfo.summary;
    } else {
      label.textContent = 'Work quality actions to unlock the next tier.';
    }
    progress.appendChild(label);
    container.appendChild(progress);
  }

  return container;
}

function buildPayoutBreakdownList(entries) {
  const list = document.createElement('ul');
  list.className = 'asset-overview-card__payout-list';
  entries.forEach(entry => {
    if (!entry?.label) return;
    const amount = Math.round(Number(entry.amount) || 0);
    if (entry.type !== 'base' && amount === 0) return;
    const item = document.createElement('li');
    item.className = 'asset-overview-card__payout-item';
    if (entry.type === 'base') {
      item.classList.add('is-base');
    } else if (amount >= 0) {
      item.classList.add('is-positive');
    } else {
      item.classList.add('is-negative');
    }

    const label = document.createElement('span');
    label.className = 'asset-overview-card__payout-label';
    label.textContent = entry.label;
    if (entry.percent !== null && entry.percent !== undefined) {
      const formattedPercent = formatPercent(entry.percent);
      if (formattedPercent) {
        const percent = document.createElement('span');
        percent.className = 'asset-overview-card__payout-percent';
        percent.textContent = ` (${formattedPercent})`;
        label.appendChild(percent);
      }
    }

    const value = document.createElement('span');
    value.className = 'asset-overview-card__payout-value';
    if (entry.type === 'base') {
      value.textContent = `$${formatMoney(Math.abs(amount))}`;
    } else {
      const sign = amount >= 0 ? '+' : '\u2212';
      value.textContent = `${sign}$${formatMoney(Math.abs(amount))}`;
    }

    item.append(label, value);
    list.appendChild(item);
  });
  return list;
}

function buildPayoutBlock(definition, instance) {
  const container = document.createElement('section');
  container.className = 'asset-overview-card__payout';

  const header = document.createElement('div');
  header.className = 'asset-overview-card__payout-header';
  const label = document.createElement('span');
  label.className = 'asset-overview-card__label';
  label.textContent = 'Latest payout';
  header.appendChild(label);
  container.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'asset-overview-card__payout-summary';
  container.appendChild(summary);

  const breakdown = document.createElement('div');
  breakdown.className = 'asset-overview-card__payout-details';
  container.appendChild(breakdown);

  if (instance.status !== 'active') {
    summary.textContent = 'Launch the venture to start logging payouts.';
    const note = document.createElement('p');
    note.className = 'asset-overview-card__payout-note';
    note.textContent = 'No payout breakdown until the build goes live.';
    breakdown.appendChild(note);
    return container;
  }

  const breakdownData = instance.lastIncomeBreakdown;
  const total = Number(breakdownData?.total) || Number(instance.lastIncome) || 0;
  const entries = Array.isArray(breakdownData?.entries) ? breakdownData.entries : [];

  if (!entries.length || total <= 0) {
    const range = getInstanceQualityRange(definition, instance);
    const min = Math.max(0, Number(range?.min) || 0);
    const max = Math.max(min, Number(range?.max) || 0);
    summary.textContent = 'No payout logged yesterday.';
    const note = document.createElement('p');
    note.className = 'asset-overview-card__payout-note';
    note.textContent = `Fund upkeep to roll $${formatMoney(min)}–$${formatMoney(max)} per day.`;
    breakdown.appendChild(note);
    return container;
  }

  summary.textContent = `Earned $${formatMoney(Math.max(0, Math.round(total)))} yesterday.`;
  breakdown.appendChild(buildPayoutBreakdownList(entries));
  return container;
}

function createAssetInstanceCard(definition, instance, index, state = getState()) {
  const card = document.createElement('article');
  card.className = 'asset-overview-card';
  card.dataset.asset = definition.id;
  card.dataset.instance = instance.id;
  card.dataset.group = getAssetGroupId(definition);
  card.dataset.state = instance.status === 'active' ? 'active' : 'setup';
  if (typeof instance.nicheId === 'string') {
    card.dataset.niche = instance.nicheId;
  } else {
    delete card.dataset.niche;
  }
  const needsMaintenance = instance.status === 'active' && !instance.maintenanceFundedToday;
  card.dataset.needsMaintenance = needsMaintenance ? 'true' : 'false';
  card.dataset.risk = definition.tag?.type === 'advanced' ? 'high' : 'medium';
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;

  const header = document.createElement('header');
  header.className = 'asset-overview-card__header';

  const heading = document.createElement('div');
  heading.className = 'asset-overview-card__heading';

  const status = document.createElement('span');
  status.className = 'asset-overview-card__status';
  if (instance.status === 'active') {
    status.textContent = needsMaintenance ? 'Earning • upkeep due' : 'Earning';
  } else {
    const remaining = Number(instance.daysRemaining);
    if (Number.isFinite(remaining) && remaining > 0) {
      status.textContent = `Incubating • ${remaining} day${remaining === 1 ? '' : 's'} left`;
    } else {
      status.textContent = 'Incubating';
    }
  }
  heading.appendChild(status);

  const title = document.createElement('h3');
  title.className = 'asset-overview-card__title';
  title.textContent = instanceLabel(definition, index);
  heading.appendChild(title);

  const type = document.createElement('span');
  type.className = 'asset-overview-card__type';
  type.textContent = definition.singular || definition.name;
  heading.appendChild(type);

  header.appendChild(heading);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'asset-overview-card__body';
  body.appendChild(buildNicheField(definition, instance, state));
  body.appendChild(buildQualityBlock(definition, instance));
  body.appendChild(buildPayoutBlock(definition, instance));

  const riskLabel = card.dataset.risk === 'high' ? 'High' : 'Moderate';
  body.appendChild(buildMetricsRow(definition, instance, state, riskLabel));
  card.appendChild(body);

  const footer = document.createElement('footer');
  footer.className = 'asset-overview-card__footer';

  const actions = document.createElement('div');
  actions.className = 'asset-overview-card__actions';
  const specialButtons = buildSpecialActionButtons(definition, instance, state);
  specialButtons.forEach(button => {
    button.classList.add('asset-overview-card__action', 'ghost');
    actions.appendChild(button);
  });
  footer.appendChild(actions);

  const links = document.createElement('div');
  links.className = 'asset-overview-card__links';
  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'ghost';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openInstanceDetails(definition, instance, index, state);
  });
  links.appendChild(detailsButton);
  footer.appendChild(links);
  card.appendChild(footer);

  card.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    openInstanceDetails(definition, instance, index, state);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target === card) {
      event.preventDefault();
      openInstanceDetails(definition, instance, index, state);
    }
  });

  return card;
}

function createAssetGroupSection(group, state = getState()) {
  const section = document.createElement('section');
  section.className = 'asset-portfolio__group';
  section.dataset.group = group.id;

  const header = document.createElement('header');
  header.className = 'asset-portfolio__header';

  const heading = document.createElement('div');
  heading.className = 'asset-portfolio__heading';
  if (group.icon) {
    const emblem = document.createElement('span');
    emblem.className = 'asset-portfolio__icon';
    emblem.textContent = group.icon;
    heading.appendChild(emblem);
  }
  const title = document.createElement('h3');
  title.className = 'asset-portfolio__title';
  title.textContent = `${group.label} ventures`;
  heading.appendChild(title);
  if (group.note) {
    const note = document.createElement('p');
    note.className = 'asset-portfolio__note';
    note.textContent = group.note;
    heading.appendChild(note);
  }
  header.appendChild(heading);

  const toolbar = document.createElement('div');
  toolbar.className = 'asset-portfolio__toolbar';
  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'ghost asset-portfolio__detail-button';
  detailButton.textContent = 'View category details';
  detailButton.addEventListener('click', event => {
    event.preventDefault();
    openAssetGroupDetails(group);
  });
  toolbar.appendChild(detailButton);

  const count = document.createElement('span');
  count.className = 'asset-portfolio__count';
  const ventureCount = Array.isArray(group.instances) ? group.instances.length : 0;
  count.textContent = ventureCount
    ? `${ventureCount} venture${ventureCount === 1 ? '' : 's'}`
    : 'No ventures yet';
  toolbar.appendChild(count);

  header.appendChild(toolbar);
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'asset-portfolio__cards';
  grid.setAttribute('role', 'list');

  const instances = Array.isArray(group.instances) ? group.instances.slice() : [];
  instances.sort((a, b) => {
    const aInstance = a?.instance || null;
    const bInstance = b?.instance || null;
    const aStatus = aInstance?.status || a?.status || 'setup';
    const bStatus = bInstance?.status || b?.status || 'setup';
    const aActive = aStatus === 'active';
    const bActive = bStatus === 'active';
    if (aActive !== bActive) {
      return aActive ? -1 : 1;
    }
    const aDay = Number(aInstance?.createdOnDay) || Number.MAX_SAFE_INTEGER;
    const bDay = Number(bInstance?.createdOnDay) || Number.MAX_SAFE_INTEGER;
    return aDay - bDay;
  });

  let renderedCount = 0;
  instances.forEach(entry => {
    if (!entry) return;
    const definition = entry.definition || assetDefinitionLookup.get(entry.definitionId);
    if (!definition) return;
    const assetState = getAssetState(definition.id, state);
    const stateInstances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const instance = stateInstances[entry.index] || entry.instance;
    if (!instance) return;
    const card = createAssetInstanceCard(definition, instance, entry.index, state);
    if (card) {
      grid.appendChild(card);
      renderedCount += 1;
    }
  });

  if (!renderedCount) {
    const emptyGroup = document.createElement('p');
    emptyGroup.className = 'asset-portfolio__empty';
    emptyGroup.textContent = 'No launched ventures in this category yet.';
    grid.appendChild(emptyGroup);
  }

  section.appendChild(grid);
  return section;
}

function renderAssets(definitions = [], assetModels = currentAssetModels) {
  const gallery = getAssetGallery();
  if (!gallery) return;

  if (assetModels && assetModels !== currentAssetModels) {
    cacheAssetModels(assetModels);
  }

  currentAssetDefinitions = Array.isArray(definitions) ? definitions : [];
  cacheAssetDefinitions(currentAssetDefinitions);

  const state = getState();
  gallery.innerHTML = '';
  assetGroupUi.clear();
  assetPortfolioNode = null;
  assetHubNode = null;
  if (assetEmptyNotice && gallery.contains(assetEmptyNotice)) {
    assetEmptyNotice.remove();
  }
  assetEmptyNotice = null;

  const groups = Array.isArray(currentAssetModels.groups) ? currentAssetModels.groups : [];
  const launchers = Array.isArray(currentAssetModels.launchers) ? currentAssetModels.launchers : [];

  const hub = buildAssetHub(groups, launchers, state);
  if (hub) {
    gallery.appendChild(hub);
    assetHubNode = hub;
  }

  if (!groups.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-gallery__empty';
    empty.textContent = 'No passive ventures discovered yet. Story beats will unlock them soon.';
    gallery.appendChild(empty);
    assetEmptyNotice = empty;
    applyCardFilters();
    return;
  }

  const portfolio = document.createElement('div');
  portfolio.className = 'asset-portfolio';
  assetPortfolioNode = portfolio;

  let totalInstances = 0;
  groups.forEach(group => {
    const section = createAssetGroupSection(group, state);
    portfolio.appendChild(section);
    assetGroupUi.set(group.id, section);
    totalInstances += Array.isArray(group.instances) ? group.instances.length : 0;
  });

  gallery.appendChild(portfolio);

  if (totalInstances === 0) {
    const empty = document.createElement('p');
    empty.className = 'asset-gallery__empty';
    empty.textContent = 'Launch a venture to see it here. Each build gets its own showcase card once active.';
    gallery.appendChild(empty);
    assetEmptyNotice = empty;
  }

  applyCardFilters();
}

function updateAssetHub() {
  const gallery = getAssetGallery();
  if (!gallery) return;

  const groups = Array.isArray(currentAssetModels.groups) ? currentAssetModels.groups : [];
  const launchers = Array.isArray(currentAssetModels.launchers) ? currentAssetModels.launchers : [];
  const hub = buildAssetHub(groups, launchers, getState());

  if (!hub) {
    if (assetHubNode && gallery.contains(assetHubNode)) {
      assetHubNode.remove();
    }
    assetHubNode = null;
    return;
  }

  if (assetHubNode && gallery.contains(assetHubNode)) {
    assetHubNode.replaceWith(hub);
  } else {
    gallery.prepend(hub);
  }
  assetHubNode = hub;
}

function updateAssetEmptyNotice(totalInstances) {
  const gallery = getAssetGallery();
  if (!gallery) return;

  if (totalInstances === 0) {
    const message = currentAssetModels.groups.length
      ? 'Launch a venture to see it here. Each build gets its own showcase card once active.'
      : 'No passive ventures discovered yet. Story beats will unlock them soon.';
    if (assetEmptyNotice && gallery.contains(assetEmptyNotice)) {
      assetEmptyNotice.textContent = message;
    } else {
      const empty = document.createElement('p');
      empty.className = 'asset-gallery__empty';
      empty.textContent = message;
      gallery.appendChild(empty);
      assetEmptyNotice = empty;
    }
    return;
  }

  if (assetEmptyNotice && gallery.contains(assetEmptyNotice)) {
    assetEmptyNotice.remove();
  }
  assetEmptyNotice = null;
}

function updateAssets(definitions = [], assetModels = currentAssetModels) {
  if (assetModels && assetModels !== currentAssetModels) {
    cacheAssetModels(assetModels);
  }

  if (Array.isArray(definitions)) {
    currentAssetDefinitions = definitions;
  }
  cacheAssetDefinitions(currentAssetDefinitions);

  const gallery = getAssetGallery();
  if (!gallery) return;

  const groups = Array.isArray(currentAssetModels.groups) ? currentAssetModels.groups : [];
  if (!groups.length) {
    renderAssets(currentAssetDefinitions, currentAssetModels);
    return;
  }

  if (!assetPortfolioNode || !gallery.contains(assetPortfolioNode)) {
    renderAssets(currentAssetDefinitions, currentAssetModels);
    return;
  }

  const state = getState();
  const desiredOrder = new Map(groups.map((group, index) => [group.id, index]));

  assetGroupUi.forEach((section, groupId) => {
    if (!desiredOrder.has(groupId) && section?.parentNode) {
      section.parentNode.removeChild(section);
      assetGroupUi.delete(groupId);
    }
  });

  groups.forEach((group, index) => {
    const section = createAssetGroupSection(group, state);
    const existing = assetGroupUi.get(group.id);
    if (existing && existing.parentNode === assetPortfolioNode) {
      existing.replaceWith(section);
    } else if (index >= assetPortfolioNode.children.length) {
      assetPortfolioNode.appendChild(section);
    } else {
      assetPortfolioNode.insertBefore(section, assetPortfolioNode.children[index]);
    }
    assetGroupUi.set(group.id, section);
  });

  updateAssetHub();
  const totalInstances = groups.reduce(
    (sum, group) => sum + (Array.isArray(group.instances) ? group.instances.length : 0),
    0
  );
  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function updateAssetGroup(definitionId) {
  if (!definitionId) return;
  const group = assetModelGroupByDefinition.get(definitionId);
  if (!group) {
    updateAssets(currentAssetDefinitions, currentAssetModels);
    return;
  }

  const gallery = getAssetGallery();
  if (!gallery) return;
  if (!assetPortfolioNode || !gallery.contains(assetPortfolioNode)) {
    renderAssets(currentAssetDefinitions, currentAssetModels);
    return;
  }

  const state = getState();
  const section = createAssetGroupSection(group, state);
  const existing = assetGroupUi.get(group.id);
  const index = currentAssetModels.groups.findIndex(entry => entry.id === group.id);
  if (existing && existing.parentNode === assetPortfolioNode) {
    existing.replaceWith(section);
  } else if (index >= 0) {
    if (index >= assetPortfolioNode.children.length) {
      assetPortfolioNode.appendChild(section);
    } else {
      assetPortfolioNode.insertBefore(section, assetPortfolioNode.children[index]);
    }
  } else {
    assetPortfolioNode.appendChild(section);
  }
  assetGroupUi.set(group.id, section);
  updateAssetHub();
  const totalInstances = currentAssetModels.groups.reduce(
    (sum, entry) => sum + (Array.isArray(entry.instances) ? entry.instances.length : 0),
    0
  );
  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function openInstanceDetails(definition, instance, index, state = getState()) {
  const body = document.createElement('div');
  body.className = 'asset-detail';
  const section = document.createElement('section');
  section.className = 'asset-detail__section asset-detail__section--instances';
  const list = document.createElement('ul');
  list.className = 'asset-detail__instances';
  const item = createInstanceCard(definition, instance, index, state);
  if (item) {
    list.appendChild(item);
  }
  section.appendChild(list);
  body.appendChild(section);
  showSlideOver({
    eyebrow: getAssetGroupLabel(definition),
    title: instanceLabel(definition, index),
    body
  });
}

function openAssetGroupDetails(group) {
  if (!group || !Array.isArray(group.definitions) || !group.definitions.length) {
    return;
  }

  const container = document.createElement('div');
  container.className = 'asset-category-detail';

  if (group.note) {
    const intro = document.createElement('p');
    intro.className = 'asset-category-detail__intro';
    intro.textContent = group.note;
    container.appendChild(intro);
  }

  group.definitions.forEach(entry => {
    const definition = entry?.definition || entry;
    if (!definition) return;

    const card = document.createElement('article');
    card.className = 'asset-category-detail__card';

    const header = document.createElement('header');
    header.className = 'asset-category-detail__header';

    const title = document.createElement('h3');
    title.className = 'asset-category-detail__title';
    title.textContent = definition.name || definition.id || 'Venture';
    header.appendChild(title);

    const summaryCopy = describeAssetCardSummary(definition);
    if (summaryCopy) {
      const summary = document.createElement('p');
      summary.className = 'asset-category-detail__summary';
      summary.textContent = summaryCopy;
      header.appendChild(summary);
    }

    card.appendChild(header);

    const highlights = createAssetDetailHighlights(definition);
    if (highlights) {
      highlights.classList.add('asset-category-detail__blueprint');
      card.appendChild(highlights);
    }

    container.appendChild(card);
  });

  showSlideOver({
    eyebrow: 'Venture category',
    title: `${group.label} ventures`,
    body: container
  });
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
    const container = getUpgradeList();
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
  const list = getUpgradeLaneList();
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

  upgradeLaneItems.forEach((entry, categoryId) => {
    if (!entry) return;

    let total = 0;
    let readyCount = 0;
    let ownedCount = 0;

    if (categoryId === 'all') {
      total = Number.isFinite(Number(overview?.total)) ? Number(overview.total) : 0;
      readyCount = Number.isFinite(Number(overview?.ready)) ? Number(overview.ready) : 0;
      ownedCount = Number.isFinite(Number(overview?.purchased)) ? Number(overview.purchased) : 0;
    } else {
      const category = (categories ?? []).find(cat => cat?.id === categoryId);
      const families = category?.families ?? [];
      families.forEach(family => {
        (family?.definitions ?? []).forEach(model => {
          total += 1;
          if (model?.snapshot?.ready) readyCount += 1;
          if (model?.snapshot?.purchased) ownedCount += 1;
        });
      });
    }

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

function renderUpgradeOverview(upgradeModels) {
  const overview = getUpgradeOverview();
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
  const emptyNote = getUpgradeEmptyNode();
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

function updateUpgradeCard(definition, model) {
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

function renderUpgrades(definitions, upgradeModels) {
  const list = getUpgradeList();
  if (!list) return;
  list.tabIndex = -1;

  if (Array.isArray(definitions) && definitions.length) {
    cacheUpgradeDefinitions(definitions);
  }
  cacheUpgradeModels(upgradeModels);
  if ((!currentUpgradeModels.categories.length || !upgradeModels) && Array.isArray(definitions) && definitions.length) {
    cacheUpgradeModels(buildUpgradeModels(definitions));
  }

  list.innerHTML = '';
  upgradeUi.clear();
  upgradeSections.clear();
  upgradeLaneItems.clear();

  const categories = currentUpgradeModels.categories;
  renderUpgradeLaneMap(categories, currentUpgradeModels.overview);

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
    eyebrow.textContent = category.copy?.label || category.id;
    const title = document.createElement('h3');
    title.textContent = category.copy?.title || `${category.id} upgrades`;
    const note = document.createElement('p');
    note.textContent = category.copy?.note || 'Discover boosts in this lane to broaden your toolkit.';
    headingGroup.append(eyebrow, title, note);

    const count = document.createElement('span');
    count.className = 'upgrade-section__count';
    header.append(headingGroup, count);
    section.appendChild(header);

    const familiesContainer = document.createElement('div');
    familiesContainer.className = 'upgrade-section__families';
    const families = (category.families ?? []).length
      ? category.families
      : [
          {
            id: 'general',
            copy: {
              label: 'General upgrades',
              note: 'New discoveries will land here until a family appears.'
            },
            definitions: []
          }
        ];
    families.forEach(family => {
      const familyArticle = document.createElement('article');
      familyArticle.className = 'upgrade-family';
      familyArticle.dataset.category = category.id;
      familyArticle.dataset.family = family.id;

      const familyHeader = document.createElement('header');
      familyHeader.className = 'upgrade-family__header';
      const familyTitle = document.createElement('h4');
      familyTitle.textContent = family.copy?.label || family.id;
      const familyCount = document.createElement('span');
      familyCount.className = 'upgrade-family__count';
      familyHeader.append(familyTitle, familyCount);
      familyArticle.appendChild(familyHeader);

      if (family.copy?.note) {
        const familyNote = document.createElement('p');
        familyNote.className = 'upgrade-family__note';
        familyNote.textContent = family.copy.note;
        familyArticle.appendChild(familyNote);
      }

      const familyList = document.createElement('div');
      familyList.className = 'upgrade-family__list';
      const sorted = sortUpgradeModelsForFamily(family.definitions);
      sorted.forEach(model => {
        const definition = upgradeDefinitionLookup.get(model.id);
        if (definition) {
          renderUpgradeCard(definition, model, familyList);
        }
      });
      familyArticle.appendChild(familyList);

      const familyEmpty = document.createElement('p');
      familyEmpty.className = 'upgrade-family__empty';
      familyEmpty.textContent = 'No upgrades discovered yet in this family.';
      familyEmpty.hidden = sorted.length > 0;
      familyArticle.appendChild(familyEmpty);

      familiesContainer.appendChild(familyArticle);
      const familyKey = `${category.id}:${family.id}`;
      upgradeSections.set(familyKey, {
        section: familyArticle,
        list: familyList,
        count: familyCount,
        emptyMessage: familyEmpty,
        model: family
      });
    });
    section.appendChild(familiesContainer);

    const empty = document.createElement('p');
    empty.className = 'upgrade-section__empty';
    empty.textContent = 'Nothing matches this lane yet. Progress other goals or adjust filters.';
    empty.hidden = true;
    section.appendChild(empty);

    fragment.appendChild(section);
    upgradeSections.set(category.id, {
      section,
      list: familiesContainer,
      count,
      emptyMessage: empty,
      model: category
    });
  });

  list.appendChild(fragment);
  renderUpgradeOverview(currentUpgradeModels);
  renderUpgradeDock();
  refreshUpgradeSections();
}

function updateUpgrades(definitions, upgradeModels) {
  if (Array.isArray(definitions) && definitions.length) {
    cacheUpgradeDefinitions(definitions);
  }
  if (upgradeModels) {
    cacheUpgradeModels(upgradeModels);
  }
  if ((!currentUpgradeModels.categories.length || !upgradeModels) && Array.isArray(definitions) && definitions.length) {
    cacheUpgradeModels(buildUpgradeModels(definitions));
  }

  if (!upgradeUi.size) {
    return;
  }

  const categories = currentUpgradeModels.categories;

  categories.forEach(category => {
    const categoryEntry = upgradeSections.get(category.id);
    if (categoryEntry?.count) {
      const total = (category.families ?? []).reduce(
        (sum, family) => sum + (family?.definitions?.length ?? 0),
        0
      );
      categoryEntry.count.textContent = total ? `${total} total` : 'No upgrades yet';
    }
  });

  categories.forEach(category => {
    const families = category.families ?? [];
    families.forEach(family => {
      const sorted = sortUpgradeModelsForFamily(family.definitions);
      const familyKey = `${category.id}:${family.id}`;
      const familyEntry = upgradeSections.get(familyKey);
      if (familyEntry?.count) {
        familyEntry.count.textContent = sorted.length ? `${sorted.length} total` : 'No upgrades yet';
      }
      if (familyEntry?.emptyMessage) {
        familyEntry.emptyMessage.hidden = sorted.length > 0;
      }
      sorted.forEach(model => {
        const definition = upgradeDefinitionLookup.get(model.id);
        if (definition) {
          updateUpgradeCard(definition, model);
        }
      });
    });
  });

  renderUpgradeOverview(currentUpgradeModels);
  updateUpgradeLaneMap(currentUpgradeModels.categories, currentUpgradeModels.overview);
}

function renderUpgradeDock() {
  const dock = getUpgradeDockList();
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

function renderClassicCollections(registries, models) {
  const { hustles = [], education = [], assets = [], upgrades = [] } = registries;
  renderHustles(hustles, models?.hustles ?? []);
  renderAssets(assets, models?.assets ?? currentAssetModels);
  renderUpgrades(upgrades, models?.upgrades);
  renderStudySection(education, models?.education);
}

export function renderAll({ registries = {}, models = {} } = {}) {
  const normalized = normalizeRegistries(registries);
  cacheCardModels(models);
  renderClassicCollections(normalized, models);
}

export function updateCard(definition) {
  if (tryUpdateHustleCard(definition)) {
    return;
  }
  if (currentAssetDefinitions.some(def => def.id === definition.id)) {
    updateAssetGroup(definition.id);
    return;
  }
  if (upgradeUi.has(definition.id)) {
    const model = findUpgradeModelById(definition.id);
    updateUpgradeCard(definition, model);
    renderUpgradeDock();
    renderUpgradeOverview(currentUpgradeModels);
    refreshUpgradeSections();
    emitUIEvent('upgrades:state-updated');
    return;
  }
  if (isStudyDefinition(definition)) {
    updateStudyTrack(definition);
  }
}

function updateClassicCollections(registries, models) {
  const { hustles = [], education = [], assets = [], upgrades = [] } = registries;
  updateHustles(hustles, models?.hustles ?? []);
  updateAssets(assets, models?.assets ?? currentAssetModels);
  updateUpgrades(upgrades, models?.upgrades);
  updateStudySection(education, models?.education);
  renderUpgradeDock();
  refreshUpgradeSections();
  emitUIEvent('upgrades:state-updated');
}

export function update({ registries = {}, models = {} } = {}) {
  const normalized = normalizeRegistries(registries);
  cacheCardModels(models);
  updateClassicCollections(normalized, models);
}

const classicCardsPresenter = {
  renderAll,
  update,
  updateCard,
  refreshUpgradeSections
};

export default classicCardsPresenter;
