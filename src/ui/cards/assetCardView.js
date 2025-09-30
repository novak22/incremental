import elements from '../elements.js';
import { getAssetState, getState } from '../../core/state.js';
import { formatDays, formatHours, formatMoney } from '../../core/helpers.js';
import {
  assetRequirementsMetById,
  formatAssetRequirementLabel,
  listAssetRequirementDescriptors
} from '../../game/requirements.js';
import { describeInstance, describeInstanceNetHourly } from '../assetInstances.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance,
  formatMaintenanceSummary
} from '../../game/assets/helpers.js';
import { getInstanceNicheInfo } from '../../game/assets/niches.js';
import { getPendingEquipmentUpgrades, isUpgradeDisabled } from '../assetUpgrades.js';
import { getAssetEffectMultiplier } from '../../game/upgrades/effects.js';
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
} from '../../game/assets/quality.js';
import { createAssetUpgradeShortcuts } from '../assetUpgradeShortcuts.js';
import { applyCardFilters } from '../layout.js';
import {
  createAssetDetailHighlights,
  createDefinitionSummary,
  createInstanceNicheSelector,
  createInstanceQuickActions,
  emitUIEvent,
  showSlideOver
} from './shared.js';

const ASSET_GROUP_NOTES = {
  Foundation: 'Reliable launchpads that get your empire compounding.',
  Creative: 'Audience magnets that thrive on storytelling and flair.',
  Commerce: 'Automation loops that keep the checkout bell ringing.',
  Tech: 'Systems and platforms with bigger upkeep but massive reach.'
};

let currentAssetDefinitions = [];
let assetLaunchPanelExpanded = false;

export function render(definitions = []) {
  renderAssets(definitions);
}

export function update(definition) {
  if (currentAssetDefinitions.some(def => def.id === definition.id)) {
    renderAssets(currentAssetDefinitions);
  }
}

function createInstanceListSection(definition, state, instancesOverride) {
  const instances = Array.isArray(instancesOverride)
    ? instancesOverride
    : (() => {
        const assetState = getAssetState(definition.id, state);
        return Array.isArray(assetState?.instances) ? assetState.instances : [];
      })();

  const section = document.createElement('section');
  section.className = 'asset-detail__section asset-detail__section--instances';
  const heading = document.createElement('h3');
  heading.textContent = 'Launched builds';
  section.appendChild(heading);

  if (!instances.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-detail__empty';
    empty.textContent = 'No builds launched yet. Spin one up to start earning.';
    section.appendChild(empty);
    return section;
  }

  const activeCards = [];
  const queuedCards = [];
  instances.forEach((instance, index) => {
    const card = createInstanceCard(definition, instance, index, state);
    if (!card) return;
    if (instance.status === 'active') {
      activeCards.push(card);
    } else {
      queuedCards.push(card);
    }
  });

  if (activeCards.length) {
    section.appendChild(
      createInstanceGroup(
        'Active builds',
        'These crews are live — keep tuning upgrades to lift your payouts.',
        activeCards
      )
    );
  }

  if (queuedCards.length) {
    section.appendChild(
      createInstanceGroup(
        'Launch queue',
        'Setup runs are staging here until they’re ready to go live.',
        queuedCards
      )
    );
  }

  return section;
}

function createInstanceGroup(title, subtitle, items) {
  const group = document.createElement('div');
  group.className = 'asset-detail__instance-group';

  const header = document.createElement('div');
  header.className = 'asset-detail__group-header';
  const groupTitle = document.createElement('h4');
  groupTitle.className = 'asset-detail__group-title';
  groupTitle.textContent = title;
  header.appendChild(groupTitle);
  if (subtitle) {
    const note = document.createElement('p');
    note.className = 'asset-detail__group-subtitle';
    note.textContent = subtitle;
    header.appendChild(note);
  }
  group.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'asset-detail__instances';
  items.forEach(item => list.appendChild(item));
  group.appendChild(list);
  return group;
}

function createInstanceCard(definition, instance, index, state) {
  const item = document.createElement('li');
  item.className = 'asset-detail__instance';
  item.dataset.instanceId = instance.id;

  const header = document.createElement('div');
  header.className = 'asset-detail__instance-header';
  const name = document.createElement('strong');
  name.textContent = instanceLabel(definition, index);
  header.appendChild(name);

  const status = document.createElement('span');
  status.className = 'asset-detail__instance-status';
  const statusText = describeInstance(definition, instance);
  if (instance.status === 'active') {
    const level = Number(instance.quality?.level) || 0;
    const levelInfo = getQualityLevel(definition, level);
    const label = levelInfo?.name ? ` • ${levelInfo.name}` : '';
    status.textContent = `${statusText}${label}`;
  } else {
    status.textContent = statusText;
  }
  header.appendChild(status);
  item.appendChild(header);

  const overview = buildInstanceOverview(definition, instance);
  if (overview) {
    item.appendChild(overview);
  }

  const stats = buildInstanceStats(definition, instance);
  if (stats) {
    item.appendChild(stats);
  }

  const actions = document.createElement('div');
  actions.className = 'asset-detail__actions';

  const actionColumns = document.createElement('div');
  actionColumns.className = 'asset-detail__action-columns';
  const quickActions = createInstanceQuickActions(definition, instance, state);
  if (quickActions) {
    actionColumns.appendChild(quickActions);
  }
  const nicheSelector = createInstanceNicheSelector(definition, instance);
  if (nicheSelector) {
    actionColumns.appendChild(nicheSelector);
  }
  const equipmentShortcuts = instance.status === 'active'
    ? createEquipmentShortcuts(definition, state)
    : null;
  if (equipmentShortcuts) {
    actionColumns.appendChild(equipmentShortcuts);
  }
  actions.appendChild(actionColumns);

  const sellButton = document.createElement('button');
  sellButton.type = 'button';
  sellButton.className = 'asset-detail__sell secondary';
  const price = calculateAssetSalePrice(instance);
  sellButton.textContent = price > 0 ? `Sell for $${formatMoney(price)}` : 'No buyer yet';
  sellButton.disabled = price <= 0;
  sellButton.addEventListener('click', event => {
    event.preventDefault();
    if (sellButton.disabled) return;
    sellAssetInstance(definition, instance.id);
  });
  actions.appendChild(sellButton);

  item.appendChild(actions);
  return item;
}

function buildInstanceOverview(definition, instance) {
  const sections = [];
  const niche = buildNicheInsight(definition, instance);
  if (niche) {
    sections.push(niche);
  }
  const quality = buildQualityInsight(definition, instance);
  if (quality) {
    sections.push(quality);
  }
  if (instance.status === 'active') {
    const milestone = buildNextQualityInsight(definition, instance);
    if (milestone) {
      sections.push(milestone);
    }
    const payout = buildPayoutInsight(definition, instance);
    if (payout) {
      sections.push(payout);
    }
  }
  if (!sections.length) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'asset-detail__instance-overview';
  sections.forEach(section => wrapper.appendChild(section));
  return wrapper;
}

function buildNicheInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--niche';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Audience niche';
  container.appendChild(title);

  const info = getInstanceNicheInfo(instance);
  if (!info) {
    const summary = document.createElement('p');
    summary.className = 'asset-detail__insight-body';
    summary.textContent = 'Unassigned — pick a niche below to sync with daily demand.';
    container.appendChild(summary);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = `${info.definition.name} • ${info.popularity.label} mood`;
  container.appendChild(summary);

  const note = document.createElement('p');
  note.className = 'asset-detail__insight-note';
  const multiplier = Number(info.popularity.multiplier);
  let percentLabel = '±0%';
  if (Number.isFinite(multiplier)) {
    const percent = Math.round((multiplier - 1) * 100);
    const sign = percent > 0 ? '+' : '';
    percentLabel = `${sign}${percent}%`;
  }
  note.textContent = `${info.popularity.summary || 'Demand shifts update daily.'} (payout impact ${percentLabel}).`;
  container.appendChild(note);

  return container;
}

function buildQualityInsight(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const levelInfo = getQualityLevel(definition, level);
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Current quality';
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  const tierName = levelInfo?.name ? ` — ${levelInfo.name}` : '';
  summary.textContent = `Quality ${level}${tierName}`;
  container.appendChild(summary);

  if (levelInfo?.description) {
    const detail = document.createElement('p');
    detail.className = 'asset-detail__insight-note';
    detail.textContent = levelInfo.description;
    container.appendChild(detail);
  }

  return container;
}

function buildNextQualityInsight(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const nextRequirements = getQualityNextRequirements(definition, level);
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--milestone';

  const hero = document.createElement('div');
  hero.className = 'asset-detail__milestone-hero';

  const label = document.createElement('span');
  label.className = 'asset-detail__milestone-label';
  label.textContent = 'Next milestone';
  hero.appendChild(label);

  if (!nextRequirements) {
    const complete = document.createElement('p');
    complete.className = 'asset-detail__milestone-message';
    complete.textContent = 'Top tier unlocked — keep collecting those dreamy payouts!';
    hero.appendChild(complete);
    container.appendChild(hero);
    return container;
  }

  const nextLevel = getNextQualityLevel(definition, level);
  if (nextLevel) {
    const heading = document.createElement('p');
    heading.className = 'asset-detail__milestone-target';
    const tierName = nextLevel.name ? ` — ${nextLevel.name}` : '';
    heading.textContent = `Quality ${nextLevel.level}${tierName}`;
    hero.appendChild(heading);
    if (nextLevel.description) {
      const description = document.createElement('p');
      description.className = 'asset-detail__milestone-message';
      description.textContent = nextLevel.description;
      hero.appendChild(description);
    }
  }

  container.appendChild(hero);

  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  const entries = Object.entries(nextRequirements)
    .map(([key, target]) => {
      const track = tracks[key];
      const labelText = track?.shortLabel || track?.label || key;
      const goal = Number(target) || 0;
      if (goal <= 0) return null;
      const current = Number(progress?.[key]) || 0;
      const remaining = Math.max(0, goal - current);
      if (remaining <= 0) return null;
      const percent = goal > 0 ? Math.max(0, Math.min(1, current / goal)) : 0;
      return { label: labelText, current, goal, remaining, percent };
    })
    .filter(Boolean);

  if (!entries.length) {
    const ready = document.createElement('p');
    ready.className = 'asset-detail__milestone-message';
    ready.textContent = 'All requirements met! Run a quality action to celebrate the rank up.';
    container.appendChild(ready);
    return container;
  }

  const list = document.createElement('ul');
  list.className = 'asset-detail__requirement-list asset-detail__requirement-list--milestone';
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'asset-detail__requirement-entry asset-detail__requirement-entry--milestone';

    const labelEl = document.createElement('span');
    labelEl.className = 'asset-detail__requirement-label';
    labelEl.textContent = entry.label;
    item.appendChild(labelEl);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'asset-detail__requirement-progress';

    const value = document.createElement('span');
    value.className = 'asset-detail__requirement-value asset-detail__requirement-value--milestone';
    value.textContent = `${entry.current} / ${entry.goal}`;
    progressWrap.appendChild(value);

    const meter = document.createElement('span');
    meter.className = 'asset-detail__requirement-meter';
    const fill = document.createElement('span');
    fill.className = 'asset-detail__requirement-meter-fill';
    fill.style.width = `${Math.round(entry.percent * 100)}%`;
    meter.appendChild(fill);
    progressWrap.appendChild(meter);

    const remaining = document.createElement('span');
    remaining.className = 'asset-detail__requirement-remaining';
    remaining.textContent = `${entry.remaining} to go`;
    progressWrap.appendChild(remaining);

    item.appendChild(progressWrap);
    list.appendChild(item);
  });
  container.appendChild(list);
  return container;
}

function buildPayoutInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Latest payout';
  container.appendChild(title);

  if (instance.status !== 'active') {
    const note = document.createElement('p');
    note.className = 'asset-detail__insight-body';
    note.textContent = 'Launch the build to start logging daily payouts.';
    container.appendChild(note);
    return container;
  }

  const breakdown = instance.lastIncomeBreakdown;
  const total = Number(breakdown?.total) || Number(instance.lastIncome) || 0;
  const entries = Array.isArray(breakdown?.entries) ? breakdown.entries : [];

  if (!entries.length || total <= 0) {
    const range = getInstanceQualityRange(definition, instance);
    const message = document.createElement('p');
    message.className = 'asset-detail__insight-body';
    const min = Math.max(0, Number(range?.min) || 0);
    const max = Math.max(min, Number(range?.max) || 0);
    message.textContent = `No payout logged yesterday. Fund upkeep to roll $${formatMoney(min)}–$${formatMoney(max)} per day.`;
    container.appendChild(message);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = `Earned $${formatMoney(Math.max(0, Math.round(total)))} yesterday.`;
  container.appendChild(summary);

  const list = document.createElement('ul');
  list.className = 'asset-detail__payout-breakdown';

  entries.forEach(entry => {
    if (!entry?.label) return;
    const amount = Math.round(Number(entry.amount) || 0);
    if (entry.type !== 'base' && amount === 0) {
      return;
    }
    const item = document.createElement('li');
    item.className = 'asset-detail__payout-entry';
    if (entry.type === 'base') {
      item.classList.add('is-base');
    } else if (amount >= 0) {
      item.classList.add('is-positive');
    } else {
      item.classList.add('is-negative');
    }
    const label = document.createElement('span');
    label.className = 'asset-detail__payout-label';
    label.textContent = entry.label;
    if (entry.percent !== null && entry.percent !== undefined) {
      const formattedPercent = formatPercent(entry.percent);
      if (formattedPercent) {
        const percent = document.createElement('span');
        percent.className = 'asset-detail__payout-percent';
        percent.textContent = ` (${formattedPercent})`;
        label.appendChild(percent);
      }
    }
    const value = document.createElement('span');
    value.className = 'asset-detail__payout-value';
    if (entry.type === 'base') {
      value.textContent = `$${formatMoney(Math.abs(amount))}`;
    } else {
      const sign = amount >= 0 ? '+' : '\u2212';
      value.textContent = `${sign}$${formatMoney(Math.abs(amount))}`;
    }
    item.append(label, value);
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  const percent = numeric * 100;
  if (Math.abs(percent) < 0.05) {
    return '0%';
  }
  const rounded = Math.round(percent);
  const difference = Math.abs(percent - rounded);
  const base = difference < 0.1 ? rounded : percent.toFixed(1);
  const prefix = percent > 0 && !String(base).startsWith('+') ? '+' : '';
  return `${prefix}${base}%`;
}

function buildInstanceStats(definition, instance) {
  const stats = document.createElement('div');
  stats.className = 'asset-detail__instance-stats';

  const lastPayout = instance.status === 'active' ? formatInstanceLastPayout(instance) : '';
  if (lastPayout) {
    stats.appendChild(createInstanceStat('Last payout', lastPayout));
  }

  if (instance.status === 'active') {
    const roiText = describeInstanceNetHourly(definition, instance);
    if (roiText) {
      let variant = '';
      if (roiText.startsWith('-')) {
        variant = 'negative';
      } else if (roiText.startsWith('$')) {
        variant = 'positive';
      }
      const stat = createInstanceStat('Net / hour', roiText, variant ? { variant } : {});
      if (stat) {
        stats.appendChild(stat);
      }
    }
  }

  const upkeep = formatInstanceUpkeep(definition);
  if (upkeep) {
    const label = instance.status === 'active' ? 'Upkeep' : 'Planned upkeep';
    stats.appendChild(createInstanceStat(label, upkeep));
  }

  if (instance.status !== 'active') {
    const launchEta = formatLaunchEta(instance);
    if (launchEta) {
      stats.appendChild(createInstanceStat('Launch ETA', launchEta));
    }
  }

  if (!stats.childElementCount) {
    return null;
  }
  return stats;
}

function createInstanceStat(label, value, { variant } = {}) {
  if (!value) return null;
  const stat = document.createElement('div');
  stat.className = 'asset-detail__instance-stat';
  if (variant) {
    stat.classList.add(`is-${variant}`);
  }
  const statLabel = document.createElement('span');
  statLabel.className = 'asset-detail__instance-stat-label';
  statLabel.textContent = label;
  const statValue = document.createElement('span');
  statValue.className = 'asset-detail__instance-stat-value';
  statValue.textContent = value;
  stat.append(statLabel, statValue);
  return stat;
}

function formatInstanceLastPayout(instance) {
  if (!instance || instance.status !== 'active') {
    return '';
  }
  const lastIncome = Math.max(0, Number(instance.lastIncome) || 0);
  if (lastIncome > 0) {
    return `$${formatMoney(lastIncome)} yesterday`;
  }
  return 'None yesterday';
}

function formatInstanceUpkeep(definition) {
  if (!definition) return '';
  const summary = formatMaintenanceSummary(definition);
  return summary.parts.join(' • ');
}

function formatLaunchEta(instance) {
  if (!instance) return '';
  const remaining = Number(instance.daysRemaining);
  if (!Number.isFinite(remaining)) {
    return 'Ready soon';
  }
  if (remaining <= 0) {
    return 'Ready tomorrow';
  }
  if (remaining === 1) {
    return '1 day';
  }
  return `${remaining} days`;
}

function getUpgradeTimeEstimate(upgrade) {
  if (!upgrade) return 0;
  const candidates = [
    upgrade.installTime,
    upgrade.timeCost,
    upgrade.duration,
    upgrade.metrics?.time?.hours,
    upgrade.action?.timeCost
  ];
  for (const candidate of candidates) {
    const hours = Number(candidate);
    if (Number.isFinite(hours) && hours > 0) {
      return hours;
    }
  }
  return 2;
}

function createEquipmentShortcuts(definition, state) {
  const pending = getPendingEquipmentUpgrades(definition, state);
  return createAssetUpgradeShortcuts(pending, {
    containerClass: 'asset-detail__upgrade-shortcuts',
    titleClass: 'asset-detail__upgrade-title',
    buttonRowClass: 'asset-detail__upgrade-buttons',
    buttonClass: 'asset-detail__upgrade-button',
    moreClass: 'asset-detail__upgrade-more',
    singularTitle: 'Equipment boost',
    pluralTitle: 'Equipment boosts',
    includeTimeEstimate: true,
    getTimeEstimate: getUpgradeTimeEstimate,
    formatTimeEstimate: formatHours,
    moreLabel: count => `+${count} more`
  });
}

function renderHustleCard(definition, container) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'hustle-card';
  card.dataset.hustle = definition.id;
  card.dataset.search = `${definition.name} ${definition.description}`.toLowerCase();

  const header = document.createElement('div');
  header.className = 'hustle-card__header';
  const title = document.createElement('h3');
  title.className = 'hustle-card__title';
  title.textContent = definition.name;
  header.appendChild(title);
  const badges = document.createElement('div');
  badges.className = 'badges';
  const time = Number(definition.time || definition.action?.timeCost) || 0;
  const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
  const roi = time > 0 ? payout / time : payout;
  card.dataset.time = String(time);
  card.dataset.payout = String(payout);
  card.dataset.roi = String(roi);
  badges.appendChild(createBadge(`${formatHours(time)} time`));
  if (payout > 0) {
    badges.appendChild(createBadge(`$${formatMoney(payout)} payout`));
  }
  if (definition.tag?.label) {
    badges.appendChild(createBadge(definition.tag.label));
  }
  header.appendChild(badges);
  card.appendChild(header);

  if (definition.description) {
    const summary = document.createElement('p');
    summary.textContent = definition.description;
    card.appendChild(summary);
  }

  const meta = document.createElement('div');
  meta.className = 'hustle-card__meta';
  const requirements = describeHustleRequirements(definition, state) || [];
  const requirementLabel = requirements.length
    ? requirements.map(req => `${req.label} ${req.met ? '✓' : '•'}`).join('  ')
    : 'No requirements';
  meta.textContent = requirementLabel;
  card.appendChild(meta);

  const limitDetail = document.createElement('p');
  limitDetail.className = 'hustle-card__limit';
  card.appendChild(limitDetail);

  const actions = document.createElement('div');
  actions.className = 'hustle-card__actions';
  let queueButton = null;
  if (definition.action?.onClick) {
    queueButton = document.createElement('button');
    queueButton.type = 'button';
    queueButton.className = 'primary';
    queueButton.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action.label || 'Queue';
    queueButton.addEventListener('click', () => {
      if (queueButton.disabled) return;
      definition.action.onClick();
    });
    actions.appendChild(queueButton);
  }

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'ghost';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', () => openHustleDetails(definition));
  actions.appendChild(detailsButton);

  card.appendChild(actions);
  container.appendChild(card);

  hustleUi.set(definition.id, { card, queueButton, limitDetail });
  updateHustleCard(definition);
}

function updateHustleCard(definition) {
  const ui = hustleUi.get(definition.id);
  if (!ui) return;
  const state = getState();
  const disabled = typeof definition.action?.disabled === 'function'
    ? definition.action.disabled(state)
    : Boolean(definition.action?.disabled);
  if (ui.queueButton) {
    ui.queueButton.disabled = disabled;
    ui.queueButton.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action?.label || 'Queue';
  }

  ui.card.dataset.available = disabled ? 'false' : 'true';
  if (ui.limitDetail) {
    const usage = getHustleDailyUsage(definition, state);
    if (usage) {
      ui.limitDetail.hidden = false;
      ui.limitDetail.textContent = usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Daily limit reached for today. Resets tomorrow.';
      ui.card.dataset.limitRemaining = String(usage.remaining);
    } else {
      ui.limitDetail.hidden = true;
      ui.limitDetail.textContent = '';
      delete ui.card.dataset.limitRemaining;
    }
  }

  const nextAvailability = disabled ? 'false' : 'true';
  const availabilityChanged = ui.card.dataset.available !== nextAvailability;
  ui.card.dataset.available = nextAvailability;
  if (availabilityChanged) {
    emitUIEvent('hustles:availability-updated');
  }
}

function openHustleDetails(definition) {
  const state = getState();
  const time = Number(definition.time || definition.action?.timeCost) || 0;
  const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
  const body = document.createElement('div');
  body.className = 'hustle-detail';

  const usage = getHustleDailyUsage(definition, state);

  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }

  const stats = [
    { label: 'Time', value: formatHours(time) },
    { label: 'Payout', value: payout > 0 ? `$${formatMoney(payout)}` : 'Varies' }
  ];
  if (usage) {
    stats.push({
      label: 'Daily limit',
      value: usage.remaining > 0
        ? `${usage.remaining}/${usage.limit} runs left today`
        : 'Maxed out today — resets tomorrow'
    });
  }

  body.appendChild(createDefinitionSummary('Stats', stats));

  const requirements = describeHustleRequirements(definition, state) || [];
  const reqRows = requirements.length
    ? requirements.map(req => ({
        label: req.type === 'limit' ? 'Daily limit' : req.label,
        value: req.type === 'limit'
          ? (req.met
              ? `${req.progress?.remaining ?? 0}/${req.progress?.limit ?? 0} runs left today`
              : 'Maxed out today — resets tomorrow')
          : req.met
            ? 'Ready'
            : `${req.progress?.have ?? 0}/${req.progress?.need ?? 1}`
      }))
    : [{ label: 'Requirements', value: 'None' }];
  body.appendChild(createDefinitionSummary('Requirements', reqRows));

  showSlideOver({ eyebrow: 'Hustle', title: definition.name, body });
}

function renderHustles(definitions) {
  const container = elements.hustleList;
  if (!container) return;
  container.innerHTML = '';
  hustleUi.clear();
  definitions.forEach(definition => renderHustleCard(definition, container));
}

function getAssetGroupId(definition) {
  const label = getAssetGroupLabel(definition);
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function getAssetGroupLabel(definition) {
  return definition?.tag?.label || 'Special';
}

function getAssetGroupNote(label) {
  return ASSET_GROUP_NOTES[label] || 'Bundle kindred builds together to compare potential at a glance.';
}

function describeAssetCardSummary(definition) {
  const copy = definition.cardSummary || definition.summary || definition.description;
  if (!copy) return '';
  const trimmed = copy.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}…`;
}

function describeInstanceNicheSummary(instance) {
  const info = getInstanceNicheInfo(instance);
  if (!info) {
    return {
      value: 'Unassigned',
      note: 'Set a niche from Details to lock in demand bonuses.'
    };
  }
  const label = info.definition?.name || 'Niche';
  const mood = info.popularity?.label ? ` — ${info.popularity.label}` : '';
  const multiplier = Number(info.popularity?.multiplier);
  let impact = '±0%';
  if (Number.isFinite(multiplier)) {
    const percent = Math.round((multiplier - 1) * 100);
    const sign = percent > 0 ? '+' : '';
    impact = `${sign}${percent}%`;
  }
  const summary = info.popularity?.summary || 'Demand shifts every day.';
  return {
    value: `${label}${mood}`,
    note: `${summary} • Payout impact ${impact}`
  };
}

function calculateInstanceProgress(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const nextRequirements = getQualityNextRequirements(definition, level);
  const levelInfo = getQualityLevel(definition, level);
  if (!nextRequirements) {
    return {
      level,
      levelInfo,
      nextLevel: null,
      percent: 1,
      summary: '',
      ready: true
    };
  }
  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  let totalGoal = 0;
  let totalCurrent = 0;
  const parts = [];
  Object.entries(nextRequirements).forEach(([key, targetValue]) => {
    const goal = Number(targetValue) || 0;
    if (goal <= 0) return;
    const current = Math.max(0, Number(progress?.[key]) || 0);
    totalGoal += goal;
    totalCurrent += Math.min(current, goal);
    const track = tracks[key];
    const label = track?.shortLabel || track?.label || key;
    parts.push(`${Math.min(current, goal)}/${goal} ${label}`);
  });
  const percent = totalGoal > 0 ? Math.max(0, Math.min(1, totalCurrent / totalGoal)) : 1;
  return {
    level,
    levelInfo,
    nextLevel: getNextQualityLevel(definition, level),
    percent,
    summary: parts.join(' • '),
    ready: percent >= 1
  };
}

function formatInstanceDailyAverage(instance, state = getState()) {
  if (!instance || instance.status !== 'active') {
    return 'Launch pending';
  }
  const totalIncome = Math.max(0, Number(instance.totalIncome) || 0);
  const createdOnDay = Math.max(1, Number(instance.createdOnDay) || 1);
  const currentDay = Math.max(1, Number(state?.day) || 1);
  const daysActive = Math.max(1, currentDay - createdOnDay + 1);
  if (totalIncome <= 0) {
    return 'No earnings yet';
  }
  return `$${formatMoney(totalIncome / daysActive)} avg`;
}

function buildSpecialActionButtons(definition, instance, state) {
  if (instance.status !== 'active') return [];
  const actions = getQualityActions(definition);
  if (!actions.length) return [];
  const prioritized = [...actions].sort((a, b) => {
    const aAvailable = canPerformQualityAction(definition, instance, a, state) ? 1 : 0;
    const bAvailable = canPerformQualityAction(definition, instance, b, state) ? 1 : 0;
    return bAvailable - aAvailable;
  });
  const limit = Math.min(prioritized.length, 3);
  const buttons = [];
  for (let index = 0; index < limit; index += 1) {
    const action = prioritized[index];
    if (!action) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.textContent = action.label || 'Upgrade';
    const availability = getQualityActionAvailability(definition, instance, action, state);
    const disabled = !canPerformQualityAction(definition, instance, action, state);
    button.disabled = disabled;
    const details = [];
    const timeCost = Math.max(0, Number(action.time) || 0);
    const moneyCost = Math.max(0, Number(action.cost) || 0);
    if (timeCost > 0) {
      details.push(`⏳ ${formatHours(timeCost)}`);
    }
    if (moneyCost > 0) {
      details.push(`💵 $${formatMoney(moneyCost)}`);
    }
    const usage = getQualityActionUsage(definition, instance, action);
    if (usage.dailyLimit > 0) {
      details.push(`🔁 ${usage.remainingUses}/${usage.dailyLimit} today`);
    }
    const timeLeft = Math.max(0, Number(state?.timeLeft) || 0);
    const moneyAvailable = Math.max(0, Number(state?.money) || 0);
    const tooltipParts = [...details];
    if (!availability.unlocked && availability.reason) {
      tooltipParts.push(availability.reason);
    }
    if (usage.exhausted) {
      tooltipParts.push('All uses spent today. Come back tomorrow for a fresh charge.');
    }
    if (disabled && availability.unlocked) {
      if (timeCost > 0 && timeLeft < timeCost) {
        tooltipParts.push(`Need ${formatHours(timeCost)} free (have ${formatHours(timeLeft)})`);
      }
      if (moneyCost > 0 && moneyAvailable < moneyCost) {
        tooltipParts.push(
          `Need $${formatMoney(moneyCost)} (have $${formatMoney(Math.max(0, Math.floor(moneyAvailable)))})`
        );
      }
    }
    if (tooltipParts.length) {
      button.title = tooltipParts.join(' • ');
    }
    button.classList.add('asset-overview-card__upgrade-action');
    button.classList.add(disabled ? 'asset-overview-card__action--locked' : 'asset-overview-card__action--available');
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    buttons.push(button);
  }
  return buttons;
}

function buildAssetGroups(definitions = [], state = getState()) {
  const groups = new Map();
  definitions.forEach(definition => {
    const groupId = getAssetGroupId(definition);
    const label = getAssetGroupLabel(definition);
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label,
        note: getAssetGroupNote(label),
        definitions: [],
        instances: []
      });
    }
    const entry = groups.get(groupId);
    entry.definitions.push(definition);
    const assetState = getAssetState(definition.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach((instance, index) => {
      entry.instances.push({ definition, instance, index });
    });
  });
  return Array.from(groups.values());
}

function describeAssetLaunchAvailability(definition, state = getState()) {
  if (!definition) {
    return { disabled: true, reasons: ['Definition missing.'], hours: 0, cost: 0 };
  }

  const reasons = [];
  const requirementsMet = assetRequirementsMetById(definition.id, state);
  if (!requirementsMet) {
    const descriptors = listAssetRequirementDescriptors(definition, state).filter(desc => !desc.met);
    if (descriptors.length) {
      const names = descriptors.map(desc => desc.label).join(', ');
      reasons.push(`Requires ${names}`);
    } else {
      const label = formatAssetRequirementLabel(definition.id, state);
      if (label) {
        reasons.push(label);
      }
    }
  }

  const baseHours = Number(definition.setup?.hoursPerDay) || 0;
  const effect = getAssetEffectMultiplier(definition, 'setup_time_mult', { actionType: 'setup' });
  const multiplier = Number.isFinite(effect?.multiplier) ? effect.multiplier : 1;
  const hours = baseHours > 0 ? baseHours * multiplier : 0;
  if (hours > 0 && state.timeLeft < hours) {
    reasons.push(`Need ${formatHours(hours)} free (have ${formatHours(state.timeLeft)})`);
  }

  const cost = Number(definition.setup?.cost) || 0;
  if (cost > 0 && state.money < cost) {
    reasons.push(`Need $${formatMoney(cost)} (have $${formatMoney(Math.max(0, Math.floor(state.money)))})`);
  }

  return { disabled: reasons.length > 0, reasons, hours, cost };
}

function buildLaunchFeedbackMessage(definition) {
  const singular = definition.singular || definition.name || 'Asset';
  return `New ${singular.toLowerCase()} is being set up.`;
}

function buildAssetLaunchTile(definition, state = getState()) {
  if (!definition?.action?.onClick) return null;

  const tile = document.createElement('article');
  tile.className = 'asset-launcher__tile';

  const heading = document.createElement('div');
  heading.className = 'asset-launcher__heading';
  const title = document.createElement('h4');
  title.className = 'asset-launcher__title';
  title.textContent = definition.name || definition.id || 'Asset';
  heading.appendChild(title);

  const tag = document.createElement('span');
  tag.className = 'asset-launcher__type';
  tag.textContent = definition.singular || 'Passive asset';
  heading.appendChild(tag);
  tile.appendChild(heading);

  const summaryCopy = describeAssetCardSummary(definition);
  if (summaryCopy) {
    const summary = document.createElement('p');
    summary.className = 'asset-launcher__summary';
    summary.textContent = summaryCopy;
    tile.appendChild(summary);
  }

  const stats = document.createElement('p');
  stats.className = 'asset-launcher__meta';
  const parts = [];
  const setupDays = Number(definition.setup?.days) || 0;
  const setupHours = Number(definition.setup?.hoursPerDay) || 0;
  if (setupDays > 0) {
    parts.push(`${setupDays} day${setupDays === 1 ? '' : 's'} of prep`);
  }
  if (setupHours > 0) {
    parts.push(`${formatHours(setupHours)}/day`);
  }
  const setupCost = Number(definition.setup?.cost) || 0;
  if (setupCost > 0) {
    parts.push(`$${formatMoney(setupCost)} upfront`);
  }
  const maintenanceText = formatInstanceUpkeep(definition);
  if (maintenanceText) {
    parts.push(`Upkeep ${maintenanceText}`);
  }
  stats.textContent = parts.join(' • ');
  tile.appendChild(stats);

  const availability = describeAssetLaunchAvailability(definition, state);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'asset-launcher__button';
  button.textContent = typeof definition.action.label === 'function'
    ? definition.action.label(state)
    : definition.action.label || `Launch ${definition.singular || definition.name}`;
  button.disabled = availability.disabled;
  if (availability.reasons.length) {
    button.title = availability.reasons.join(' • ');
  } else if (availability.hours > 0 || availability.cost > 0) {
    const detailParts = [];
    if (availability.hours > 0) detailParts.push(`Needs ${formatHours(availability.hours)} free today`);
    if (availability.cost > 0) detailParts.push(`Costs $${formatMoney(availability.cost)}`);
    button.title = detailParts.join(' • ');
  }
  if (button.disabled) {
    tile.classList.add('is-disabled');
  }

  const feedback = document.createElement('p');
  feedback.className = 'asset-launcher__feedback';
  feedback.hidden = true;
  tile.appendChild(feedback);

  button.addEventListener('click', event => {
    event.preventDefault();
    if (button.disabled) return;
    const beforeState = getAssetState(definition.id, getState());
    const beforeCount = Array.isArray(beforeState?.instances) ? beforeState.instances.length : 0;
    definition.action.onClick();
    setTimeout(() => {
      const afterState = getAssetState(definition.id, getState());
      const afterCount = Array.isArray(afterState?.instances) ? afterState.instances.length : 0;
      if (afterCount > beforeCount) {
        feedback.textContent = buildLaunchFeedbackMessage(definition);
        feedback.hidden = false;
        tile.classList.add('asset-launcher__tile--success');
        setTimeout(() => {
          feedback.hidden = true;
          tile.classList.remove('asset-launcher__tile--success');
        }, 2400);
        renderAssets(currentAssetDefinitions);
        applyCardFilters();
      }
    }, 40);
  });

  tile.appendChild(button);
  return tile;
}

function buildAssetLaunchPanel(definitions = [], state = getState()) {
  const tiles = definitions
    .map(definition => buildAssetLaunchTile(definition, state))
    .filter(Boolean);
  if (!tiles.length) {
    assetLaunchPanelExpanded = false;
    return null;
  }

  const container = document.createElement('section');
  container.className = 'asset-launcher';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'asset-launcher__trigger primary';
  trigger.textContent = assetLaunchPanelExpanded ? 'Hide launch options' : 'Launch a new asset';
  trigger.setAttribute('aria-expanded', assetLaunchPanelExpanded ? 'true' : 'false');
  const contentId = 'asset-launcher-options';
  trigger.setAttribute('aria-controls', contentId);
  if (assetLaunchPanelExpanded) {
    trigger.classList.add('is-open');
  }
  container.appendChild(trigger);

  const content = document.createElement('div');
  content.className = 'asset-launcher__content';
  content.id = contentId;
  content.hidden = !assetLaunchPanelExpanded;

  const header = document.createElement('div');
  header.className = 'asset-launcher__header';
  const title = document.createElement('h3');
  title.className = 'asset-launcher__heading-title';
  title.textContent = 'Launch a new asset';
  header.appendChild(title);
  const note = document.createElement('p');
  note.className = 'asset-launcher__note';
  note.textContent = 'Pick a build to spin up a fresh income stream.';
  header.appendChild(note);
  content.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'asset-launcher__grid';
  tiles.forEach(tile => grid.appendChild(tile));
  content.appendChild(grid);
  container.appendChild(content);

  trigger.addEventListener('click', event => {
    event.preventDefault();
    assetLaunchPanelExpanded = !assetLaunchPanelExpanded;
    content.hidden = !assetLaunchPanelExpanded;
    trigger.setAttribute('aria-expanded', assetLaunchPanelExpanded ? 'true' : 'false');
    trigger.textContent = assetLaunchPanelExpanded ? 'Hide launch options' : 'Launch a new asset';
    trigger.classList.toggle('is-open', assetLaunchPanelExpanded);
  });
  return container;
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
      group.instances.forEach(({ definition, instance }) => {
        acc.total += 1;
        if (instance.status === 'active') {
          acc.active += 1;
          acc.upkeepCost += Number(definition.maintenance?.cost) || 0;
          acc.upkeepHours += Number(definition.maintenance?.hours) || 0;
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
    empty.className = 'asset-hub__summary asset-hub__summary--empty';
    const message = document.createElement('p');
    message.className = 'asset-hub__empty';
    message.textContent = 'No launched assets yet. Kick off a build to start the passive flow!';
    empty.appendChild(message);
    return empty;
  }

  const summary = document.createElement('section');
  summary.className = 'asset-hub__summary';

  const stats = [
    { label: 'Total builds', value: totals.total },
    { label: 'Active & earning', value: totals.active },
    { label: 'In setup', value: totals.setup },
    { label: 'Daily upkeep', value: formatUpkeepTotals(totals.upkeepCost, totals.upkeepHours) }
  ];

  stats.forEach(entry => {
    const stat = document.createElement('div');
    stat.className = 'asset-hub__stat';
    const value = document.createElement('span');
    value.className = 'asset-hub__stat-value';
    value.textContent = entry.value;
    const label = document.createElement('span');
    label.className = 'asset-hub__stat-label';
    label.textContent = entry.label;
    stat.append(value, label);
    summary.appendChild(stat);
  });

  return summary;
}

function buildAssetHub(definitions, groups, state) {
  const summary = buildAssetSummary(groups);
  const launchPanel = buildAssetLaunchPanel(definitions, state);
  if (!summary && !launchPanel) return null;

  const container = document.createElement('div');
  container.className = 'asset-hub';
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
    const value = document.createElement('span');
    value.className = 'asset-overview-card__value';
    value.textContent = info.definition?.name || 'Assigned';
    field.appendChild(value);

    const impact = Number(info.popularity?.multiplier);
    const percent = Number.isFinite(impact) ? formatPercent(impact - 1) : null;
    const summary = info.popularity?.summary || 'Demand shifts update daily.';
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
      renderAssets(currentAssetDefinitions);
      applyCardFilters();
    }
  });

  field.appendChild(select);
  const hint = document.createElement('span');
  hint.className = 'asset-overview-card__note';
  hint.textContent = 'Lock in a niche to tap into daily popularity rolls.';
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
    summary.textContent = 'Launch the asset to start logging payouts.';
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
    status.textContent = needsMaintenance ? 'Active • Upkeep due' : 'Active';
  } else {
    const remaining = Number(instance.daysRemaining);
    if (Number.isFinite(remaining) && remaining > 0) {
      status.textContent = `Setup • ${remaining} day${remaining === 1 ? '' : 's'} left`;
    } else {
      status.textContent = 'Setup';
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

function renderAssets(definitions = []) {
  const gallery = elements.assetGallery;
  if (!gallery) return;
  const state = getState();
  currentAssetDefinitions = Array.isArray(definitions) ? definitions : [];
  gallery.innerHTML = '';

  const groups = buildAssetGroups(currentAssetDefinitions, state);
  const hub = buildAssetHub(currentAssetDefinitions, groups, state);
  if (hub) {
    gallery.appendChild(hub);
  }

  if (!groups.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-gallery__empty';
    empty.textContent = 'No passive assets discovered yet. Story beats will unlock them soon.';
    gallery.appendChild(empty);
    return;
  }

  const portfolio = document.createElement('div');
  portfolio.className = 'asset-portfolio';
  let totalInstances = 0;

  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'asset-portfolio__group';
    section.dataset.group = group.id;

    const header = document.createElement('header');
    header.className = 'asset-portfolio__header';

    const heading = document.createElement('div');
    heading.className = 'asset-portfolio__heading';
    const title = document.createElement('h3');
    title.className = 'asset-portfolio__title';
    title.textContent = `${group.label} assets`;
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
    count.textContent = group.instances.length
      ? `${group.instances.length} build${group.instances.length === 1 ? '' : 's'}`
      : 'No builds yet';
    toolbar.appendChild(count);

    header.appendChild(toolbar);
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'asset-portfolio__cards';
    grid.setAttribute('role', 'list');

    const sortedInstances = [...group.instances].sort((a, b) => {
      const aActive = a.instance.status === 'active';
      const bActive = b.instance.status === 'active';
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      const aDay = Number(a.instance.createdOnDay) || Number.MAX_SAFE_INTEGER;
      const bDay = Number(b.instance.createdOnDay) || Number.MAX_SAFE_INTEGER;
      return aDay - bDay;
    });

    sortedInstances.forEach(entry => {
      const card = createAssetInstanceCard(entry.definition, entry.instance, entry.index, state);
      if (card) {
        grid.appendChild(card);
        totalInstances += 1;
      }
    });

    if (!grid.childElementCount) {
      const emptyGroup = document.createElement('p');
      emptyGroup.className = 'asset-portfolio__empty';
      emptyGroup.textContent = 'No launched assets in this category yet.';
      grid.appendChild(emptyGroup);
    }

    section.appendChild(grid);
    portfolio.appendChild(section);
  });

  gallery.appendChild(portfolio);

  if (totalInstances === 0) {
    const empty = document.createElement('p');
    empty.className = 'asset-gallery__empty';
    empty.textContent = 'Launch an asset to see it here. Each build gets its own action card once active.';
    gallery.appendChild(empty);
  }

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

  group.definitions.forEach(definition => {
    if (!definition) return;

    const card = document.createElement('article');
    card.className = 'asset-category-detail__card';

    const header = document.createElement('header');
    header.className = 'asset-category-detail__header';

    const title = document.createElement('h3');
    title.className = 'asset-category-detail__title';
    title.textContent = definition.name || definition.id || 'Asset';
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
    eyebrow: 'Asset category',
    title: `${group.label} assets`,
    body: container
  });
}
