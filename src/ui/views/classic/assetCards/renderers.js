import { getState } from '../../../../core/state.js';
import { formatHours, formatMoney } from '../../../../core/helpers.js';
import {
  describeRequirement,
  getDefinitionRequirements
} from '../../../../game/requirements.js';
import {
  describeInstance,
  describeInstanceNetHourly
} from '../../../assetInstances.js';
import { calculateAssetSalePrice, sellAssetInstance } from '../../../../game/assets/actions.js';
import { instanceLabel } from '../../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../../game/assets/maintenance.js';
import { getPendingEquipmentUpgrades, isUpgradeDisabled } from '../../../assetUpgrades.js';
import {
  describeAssetCardSummary,
  describeAssetLaunchAvailability,
  formatInstanceUpkeep,
  getAssetGroupLabel,
  getAssetGroupNote
} from '../../../cards/model/index.js';
import { getQualityLevel, getQualityLevelSummary, getQualityTracks } from '../../../../game/assets/quality.js';
import { showSlideOver } from '../components/slideOver.js';
import { resolveDefinitionReference } from './cache.js';
import {
  createInstanceQuickActions,
  buildQualityBlock,
  buildQualityInsight,
  buildNextQualityInsight
} from './qualityActions.js';
import { createInstanceNicheSelector, buildNicheInsight } from './nicheAssignments.js';

const assetGroupUi = new Map();
let assetLaunchPanelExpanded = false;

export function clearAssetGroupUi() {
  assetGroupUi.clear();
}

export function getAssetGroupUi(id) {
  return assetGroupUi.get(id) ?? null;
}

function createAssetDetailHighlights(definition) {
  const entries = Array.isArray(definition.detailEntries)
    ? definition.detailEntries
    : Array.isArray(definition.details)
      ? definition.details.map((render, index) => ({ key: `detail-${index}`, render }))
      : [];

  const renderedDetails = entries
    .map((entry, index) => {
      const render = typeof entry.render === 'function' ? entry.render : entry;
      if (typeof render !== 'function') return null;
      try {
        const value = render();
        if (!value) return null;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) return null;
          return { key: entry.key || `detail-${index}`, value: trimmed };
        }
        if (value instanceof Node) {
          return { key: entry.key || `detail-${index}`, value };
        }
        return null;
      } catch (error) {
        console.error('Failed to render asset detail', error);
        return null;
      }
    })
    .filter(Boolean);

  const detailByKey = new Map();
  renderedDetails.forEach(detail => {
    if (!detailByKey.has(detail.key)) {
      detailByKey.set(detail.key, []);
    }
    detailByKey.get(detail.key).push(detail.value);
  });

  const requirements = getDefinitionRequirements(definition);
  const section = document.createElement('section');
  section.className = 'asset-detail__section asset-detail__section--blueprint';
  const heading = document.createElement('h3');
  heading.textContent = 'Launch blueprint';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'asset-detail__summary-grid';
  section.appendChild(grid);

  const requirementsCard = document.createElement('article');
  requirementsCard.className = 'asset-detail__summary-card asset-detail__summary-card--requirements';
  const requirementsTitle = document.createElement('h4');
  requirementsTitle.textContent = 'Requirements';
  requirementsCard.appendChild(requirementsTitle);
  const requirementsList = document.createElement('ul');
  requirementsList.className = 'asset-detail__summary-list';
  if (requirements?.hasAny) {
    requirements.all.forEach(req => {
      const descriptor = describeRequirement(req);
      const item = document.createElement('li');
      item.className = 'asset-detail__summary-item';
      item.innerHTML = descriptor?.detail || '❔ <strong>Requirement</strong>';
      requirementsList.appendChild(item);
    });
  } else {
    const fallbackItem = document.createElement('li');
    fallbackItem.className = 'asset-detail__summary-item';
    const fallbackDetail = detailByKey.get('requirements')?.[0] || '🔓 Requirements: <strong>None</strong>';
    if (typeof fallbackDetail === 'string') {
      fallbackItem.innerHTML = fallbackDetail;
    } else if (fallbackDetail instanceof Node) {
      fallbackItem.appendChild(fallbackDetail);
    }
    requirementsList.appendChild(fallbackItem);
  }
  requirementsCard.appendChild(requirementsList);
  grid.appendChild(requirementsCard);

  const roadmapCard = document.createElement('article');
  roadmapCard.className = 'asset-detail__summary-card asset-detail__summary-card--roadmap';
  const roadmapTitle = document.createElement('h4');
  roadmapTitle.textContent = 'Roadmap & stats';
  roadmapCard.appendChild(roadmapTitle);

  const roadmapList = document.createElement('ul');
  roadmapList.className = 'asset-detail__summary-list';
  const roadmapKeys = ['owned', 'setup', 'setupCost', 'maintenance', 'income', 'latestYield'];
  roadmapKeys.forEach(key => {
    const values = detailByKey.get(key) || [];
    values.forEach(value => {
      const item = document.createElement('li');
      item.className = 'asset-detail__summary-item';
      if (typeof value === 'string') {
        item.innerHTML = value;
      } else if (value instanceof Node) {
        item.appendChild(value);
      }
      roadmapList.appendChild(item);
    });
  });

  const consumedKeys = new Set(['requirements', 'qualitySummary', 'qualityProgress', ...roadmapKeys]);
  const extraDetails = renderedDetails.filter(detail => !consumedKeys.has(detail.key));
  extraDetails.forEach(detail => {
    const item = document.createElement('li');
    item.className = 'asset-detail__summary-item';
    if (typeof detail.value === 'string') {
      item.innerHTML = detail.value;
    } else if (detail.value instanceof Node) {
      item.appendChild(detail.value);
    }
    roadmapList.appendChild(item);
  });

  if (!roadmapList.children.length) {
    const empty = document.createElement('li');
    empty.className = 'asset-detail__summary-item';
    empty.textContent = 'No roadmap details available yet.';
    roadmapList.appendChild(empty);
  }

  roadmapCard.appendChild(roadmapList);
  grid.appendChild(roadmapCard);

  const qualityCard = document.createElement('article');
  qualityCard.className = 'asset-detail__summary-card asset-detail__summary-card--quality';
  const qualityTitle = document.createElement('h4');
  qualityTitle.textContent = 'Quality journey';
  qualityCard.appendChild(qualityTitle);

  const qualitySummary = detailByKey.get('qualitySummary')?.[0];
  const summaryCopy = document.createElement('p');
  summaryCopy.className = 'asset-detail__summary-copy';
  if (typeof qualitySummary === 'string') {
    summaryCopy.innerHTML = qualitySummary;
  } else if (qualitySummary instanceof Node) {
    summaryCopy.appendChild(qualitySummary);
  } else {
    summaryCopy.textContent = '✨ Quality boosts unlock as you invest in specialty tracks.';
  }
  qualityCard.appendChild(summaryCopy);

  const qualityList = document.createElement('ul');
  qualityList.className = 'asset-detail__summary-list asset-detail__summary-list--quality';
  const tracks = getQualityTracks(definition);
  const levels = getQualityLevelSummary(definition);
  levels.forEach(level => {
    const item = document.createElement('li');
    item.className = 'asset-detail__summary-item';
    const title = document.createElement('div');
    title.className = 'asset-detail__summary-line';
    title.innerHTML = `<strong>Quality ${level.level}:</strong> ${level.name}`;
    item.appendChild(title);
    const requirementEntries = Object.entries(level.requirements || {});
    if (requirementEntries.length) {
      const detail = document.createElement('div');
      detail.className = 'asset-detail__summary-subtext';
      const parts = requirementEntries.map(([key, value]) => {
        const label = tracks[key]?.shortLabel || tracks[key]?.label || key;
        return `${value} ${label}`;
      });
      detail.textContent = parts.join(' • ');
      item.appendChild(detail);
    } else {
      const detail = document.createElement('div');
      detail.className = 'asset-detail__summary-subtext';
      detail.textContent = 'Entry tier — no prep required.';
      item.appendChild(detail);
    }
    qualityList.appendChild(item);
  });
  qualityCard.appendChild(qualityList);
  grid.appendChild(qualityCard);

  return section;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${Math.round(number * 100)}%`;
}

function buildPayoutBreakdownList(entries) {
  const list = document.createElement('ul');
  list.className = 'asset-detail__breakdown';
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'asset-detail__breakdown-item';
    const label = document.createElement('span');
    label.className = 'asset-detail__breakdown-label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'asset-detail__breakdown-value';
    value.textContent = entry.value;
    item.append(label, value);
    list.appendChild(item);
  });
  return list;
}

function buildPayoutBlock(definition, instance) {
  const state = getState();
  const block = document.createElement('section');
  block.className = 'asset-detail__section asset-detail__section--payout';

  const header = document.createElement('header');
  header.className = 'asset-detail__section-header';
  const title = document.createElement('h3');
  title.textContent = 'Payout breakdown';
  header.appendChild(title);
  block.appendChild(header);

  const upkeep = formatMaintenanceSummary(definition, state);
  const entries = [
    { label: 'Base payout', value: `$${formatMoney(instance.baseHourly || 0)} / hr` },
    { label: 'Upkeep', value: upkeep }
  ];
  const modifiers = instance.modifiers || [];
  modifiers.forEach(modifier => {
    entries.push({
      label: modifier.label,
      value: `${formatPercent(modifier.percent)} (${modifier.summary || 'Effect'})`
    });
  });

  block.appendChild(buildPayoutBreakdownList(entries));
  return block;
}

function formatInstanceLastPayout(instance) {
  const last = Number(instance.lastPayout?.day) || 0;
  if (!last) return 'Never';
  const state = getState();
  const today = Number(state.day) || 1;
  const delta = Math.max(0, today - last);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  return `${delta} days ago`;
}

function formatLaunchEta(instance) {
  const eta = Number(instance.launchEta) || 0;
  if (!eta) return 'Ready now';
  return `${formatHours(eta)} remaining`;
}

function buildPayoutInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--payout';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Payout recap';
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = describeInstanceNetHourly(definition, instance);
  container.appendChild(summary);

  const details = document.createElement('p');
  details.className = 'asset-detail__insight-note';
  details.textContent = `Last payout: ${formatInstanceLastPayout(instance)} · Next in ${formatLaunchEta(instance)}`;
  container.appendChild(details);

  return container;
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

function createMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'asset-detail__metric';

  const metricLabel = document.createElement('span');
  metricLabel.className = 'asset-detail__metric-label';
  metricLabel.textContent = label;
  metric.appendChild(metricLabel);

  const metricValue = document.createElement('span');
  metricValue.className = 'asset-detail__metric-value';
  if (value instanceof Node) {
    metricValue.appendChild(value);
  } else {
    metricValue.textContent = value;
  }
  metric.appendChild(metricValue);

  return metric;
}

function buildMetricsRow(definition, instance, state, riskLabel) {
  const metrics = document.createElement('div');
  metrics.className = 'asset-detail__metrics';

  const base = createMetric('Base hourly', `$${formatMoney(instance.baseHourly || 0)}`);
  metrics.appendChild(base);

  const upkeep = createMetric('Upkeep', formatMaintenanceSummary(definition, state));
  metrics.appendChild(upkeep);

  if (riskLabel) {
    metrics.appendChild(createMetric('Risk profile', riskLabel));
  }

  return metrics;
}

function buildInstanceStats(definition, instance) {
  const state = getState();
  const stats = [];
  const availability = describeAssetLaunchAvailability(definition, state);
  if (availability?.blocked) {
    stats.push(createInstanceStat('Launch readiness', 'Blocked', { variant: 'warning' }));
  } else if (availability?.ready) {
    stats.push(createInstanceStat('Launch readiness', 'Ready to launch'));
  }

  if (instance.status === 'active') {
    const upkeep = formatInstanceUpkeep(definition, instance);
    if (upkeep) {
      stats.push(createInstanceStat('Upkeep', upkeep));
    }

    stats.push(createInstanceStat('Daily average', formatInstanceDailyAverage(instance, state)));
    stats.push(createInstanceStat('Next payout', formatLaunchEta(instance)));

    const upgrades = getPendingEquipmentUpgrades(definition, state);
    if (upgrades.length) {
      const disabled = upgrades.every(upgrade => isUpgradeDisabled(upgrade, state));
      stats.push(createInstanceStat('Equipment', disabled ? 'All upgrades installed' : 'Upgrades ready', {
        variant: disabled ? 'muted' : 'positive'
      }));
    }
  } else {
    stats.push(createInstanceStat('Launch time', formatLaunchEta(instance)));
  }

  if (!stats.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'asset-detail__stats';
  stats.forEach(stat => wrapper.appendChild(stat));
  return wrapper;
}

function createInstanceStat(label, value, { variant } = {}) {
  const stat = document.createElement('div');
  stat.className = 'asset-detail__stat';
  if (variant) {
    stat.dataset.variant = variant;
  }
  const heading = document.createElement('dt');
  heading.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value;
  stat.append(heading, detail);
  return stat;
}

function createInstanceActions(definition, instance, state) {
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

  const equipment = instance?.status === 'active' ? createEquipmentShortcuts(definition, state) : null;
  if (equipment) {
    actionColumns.appendChild(equipment);
  }

  actions.appendChild(actionColumns);

  const sellButton = document.createElement('button');
  sellButton.type = 'button';
  sellButton.className = 'asset-detail__sell secondary';
  const price = calculateAssetSalePrice(instance);
  const instanceId = instance?.id || '';
  sellButton.textContent = price > 0 ? `Sell for $${formatMoney(price)}` : 'No buyer yet';
  sellButton.disabled = price <= 0 || !instanceId;
  sellButton.addEventListener('click', event => {
    event.preventDefault();
    if (sellButton.disabled) return;
    sellAssetInstance(definition, instanceId);
  });
  actions.appendChild(sellButton);

  return actions;
}

function createEquipmentShortcuts(definition, state) {
  const upgrades = getPendingEquipmentUpgrades(definition, state);
  if (!upgrades.length) return null;

  const container = document.createElement('div');
  container.className = 'asset-detail__quick-actions';

  upgrades.slice(0, 3).forEach(upgrade => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-detail__action-button';
    button.textContent = upgrade.name;
    button.title = `${formatMaintenanceSummary(upgrade, state)} · ${getUpgradeTimeEstimate(upgrade)}`;
    button.disabled = isUpgradeDisabled(upgrade, state);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      upgrade.action?.();
    });
    container.appendChild(button);
  });

  if (upgrades.length > 3) {
    const more = document.createElement('span');
    more.className = 'asset-detail__action-note';
    more.textContent = `+${upgrades.length - 3} equipment upgrades available`;
    container.appendChild(more);
  }

  return container;
}

function getUpgradeTimeEstimate(upgrade) {
  const time = Number(upgrade?.time) || 0;
  const boost = Number(upgrade?.boost?.time) || 1;
  if (!time) return 'Instant';
  return `${formatHours(time * boost)} install`;
}

function createInstanceCard(definition, instance, index, state, group) {
  const resolvedDefinition = resolveDefinitionReference(definition, instance, group);
  const assetInstance = instance?.instance || instance;
  if (!assetInstance) {
    return null;
  }
  const filters = instance?.filters || {};
  const status = filters.status || instance?.status || assetInstance?.status || 'setup';
  const nicheId = filters.niche || instance?.nicheId || assetInstance?.nicheId;
  const risk = filters.risk || instance?.risk || (resolvedDefinition?.tag?.type === 'advanced' ? 'high' : 'medium');
  const needsMaintenance =
    filters.needsMaintenance ?? instance?.needsMaintenance ?? (
      assetInstance?.status === 'active' && assetInstance?.maintenanceFundedToday === false
    );

  const item = document.createElement('li');
  item.className = 'asset-detail__instance';
  const instanceId = assetInstance.id || instance?.id || resolvedDefinition?.id || `unknown-${index}`;
  item.dataset.instanceId = instanceId;
  item.dataset.asset = instanceId;
  item.dataset.state = status;
  item.dataset.needsMaintenance = needsMaintenance ? 'true' : 'false';
  item.dataset.risk = risk;
  if (nicheId) {
    item.dataset.niche = nicheId;
  }
  if (group?.id) {
    item.dataset.group = group.id;
  }

  const header = document.createElement('div');
  header.className = 'asset-detail__instance-header';
  const name = document.createElement('strong');
  name.textContent = resolvedDefinition
    ? instanceLabel(resolvedDefinition, index)
    : assetInstance?.name || `Asset ${index}`;
  header.appendChild(name);

  const statusNode = document.createElement('span');
  statusNode.className = 'asset-detail__instance-status';
  const statusText = resolvedDefinition
    ? describeInstance(resolvedDefinition, assetInstance)
    : assetInstance?.status || '';
  if (assetInstance?.status === 'active' && resolvedDefinition) {
    const level = Number(assetInstance.quality?.level) || 0;
    const levelInfo = getQualityLevel(resolvedDefinition, level);
    const label = levelInfo?.name ? ` • ${levelInfo.name}` : '';
    statusNode.textContent = `${statusText}${label}`;
  } else {
    statusNode.textContent = statusText;
  }
  header.appendChild(statusNode);
  item.appendChild(header);

  const overview = resolvedDefinition ? buildInstanceOverview(resolvedDefinition, assetInstance) : null;
  if (overview) {
    item.appendChild(overview);
  }

  const stats = resolvedDefinition ? buildInstanceStats(resolvedDefinition, assetInstance) : null;
  if (stats) {
    item.appendChild(stats);
  }

  const actions = resolvedDefinition ? createInstanceActions(resolvedDefinition, assetInstance, state) : null;
  if (actions) {
    item.appendChild(actions);
  }

  return item;
}

function buildInstanceOverview(definition, instance) {
  const sections = [];
  const niche = buildNicheInsight(definition, instance);
  if (niche) {
    sections.push(niche);
  }
  const hasQuality = Boolean(instance?.quality);
  if (hasQuality) {
    const quality = buildQualityInsight(definition, instance);
    if (quality) {
      sections.push(quality);
    }
  }
  if (instance.status === 'active') {
    if (hasQuality) {
      const milestone = buildNextQualityInsight(definition, instance);
      if (milestone) {
        sections.push(milestone);
      }
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

function buildAssetSummary(groups = []) {
  let totalInstances = 0;
  const summary = document.createElement('section');
  summary.className = 'venture-summary';

  const title = document.createElement('h2');
  title.className = 'venture-summary__heading';
  title.textContent = 'Venture portfolio';
  summary.appendChild(title);

  const stats = document.createElement('dl');
  stats.className = 'venture-summary__stats';

  groups.forEach(group => {
    totalInstances += group.instances?.length || 0;
  });

  const ventures = document.createElement('div');
  ventures.className = 'venture-summary__stat';
  const ventureLabel = document.createElement('dt');
  ventureLabel.textContent = 'Active ventures';
  const ventureValue = document.createElement('dd');
  ventureValue.textContent = totalInstances === 1 ? '1 venture' : `${totalInstances} ventures`;
  ventures.append(ventureLabel, ventureValue);
  stats.appendChild(ventures);

  summary.appendChild(stats);

  const emptyNotice = document.createElement('p');
  emptyNotice.className = 'venture-summary__empty';
  emptyNotice.textContent = 'No ventures yet — launch your first build to kickstart the portfolio!';
  summary.appendChild(emptyNotice);

  return { summary, totalInstances, emptyNotice };
}

function buildLaunchFeedbackMessage(definition) {
  const availability = describeAssetLaunchAvailability(definition, getState());
  if (availability?.ready) {
    return 'Ready to launch — queue the build when you are!';
  }
  if (availability?.disabled && availability?.reasons?.length) {
    return availability.reasons[0];
  }
  if (availability?.blocked) {
    return 'Missing requirements — review the blueprint above.';
  }
  return 'Gather resources and prep the blueprint to launch this venture.';
}

function buildAssetLaunchTile(launcher, state = getState()) {
  const tile = document.createElement('article');
  tile.className = 'venture-launcher__tile';

  const header = document.createElement('header');
  header.className = 'venture-launcher__tile-header';
  const title = document.createElement('h4');
  title.textContent = launcher.definition?.name || 'Venture';
  header.appendChild(title);
  tile.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'venture-launcher__tile-summary';
  summary.textContent = describeAssetCardSummary(launcher);
  tile.appendChild(summary);

  const availability = describeAssetLaunchAvailability(launcher.definition, state);
  const ready = availability ? availability.disabled === false : false;

  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = 'venture-launcher__tile-action';
  launchButton.textContent = launcher.action?.label || 'Launch';
  launchButton.disabled = Boolean(availability?.disabled || launcher.action?.disabled);
  launchButton.addEventListener('click', event => {
    event.preventDefault();
    if (launchButton.disabled) return;
    launcher.action?.onClick?.();
  });
  tile.appendChild(launchButton);

  const feedback = document.createElement('p');
  feedback.className = 'venture-launcher__tile-note';
  feedback.textContent = buildLaunchFeedbackMessage(launcher.definition);
  tile.appendChild(feedback);

  if (!ready && availability?.disabled && availability?.reasons?.length) {
    launchButton.title = availability.reasons[0];
  }

  return tile;
}

function buildAssetLaunchPanel(launchers = [], state = getState()) {
  if (!launchers.length) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'venture-launcher';

  const content = document.createElement('div');
  content.className = 'venture-launcher__content';

  const header = document.createElement('div');
  header.className = 'venture-launcher__header';
  const title = document.createElement('h3');
  title.className = 'venture-launcher__heading-title';
  title.textContent = 'Launch blueprint';
  header.appendChild(title);
  const note = document.createElement('p');
  note.className = 'venture-launcher__note';
  note.textContent = 'Line up your next flagship build with ready-to-launch blueprints.';
  header.appendChild(note);
  content.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'venture-launcher__grid';
  launchers.forEach(launcher => {
    const tile = buildAssetLaunchTile(launcher, state);
    if (tile) {
      grid.appendChild(tile);
    }
  });
  content.appendChild(grid);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'venture-launcher__trigger ghost';
  const applyToggleState = () => {
    toggle.textContent = assetLaunchPanelExpanded ? 'Hide launch options' : 'Show launch options';
    toggle.classList.toggle('is-open', assetLaunchPanelExpanded);
    content.hidden = !assetLaunchPanelExpanded;
  };
  toggle.addEventListener('click', () => {
    assetLaunchPanelExpanded = !assetLaunchPanelExpanded;
    applyToggleState();
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(content);
  applyToggleState();

  return wrapper;
}

function createAssetGroupSection(group, state = getState()) {
  const section = document.createElement('section');
  section.className = 'asset-portfolio__group';
  section.dataset.group = group.id;

  const header = document.createElement('header');
  header.className = 'asset-portfolio__header';

  const heading = document.createElement('div');
  heading.className = 'asset-portfolio__heading';

  const title = document.createElement('h3');
  title.className = 'asset-portfolio__title';
  title.textContent = group.label || getAssetGroupLabel(group.id);
  heading.appendChild(title);

  const note = group.note || getAssetGroupNote(group.id);
  if (note) {
    const noteNode = document.createElement('p');
    noteNode.className = 'asset-portfolio__note';
    noteNode.textContent = note;
    heading.appendChild(noteNode);
  }
  header.appendChild(heading);

  const toolbar = document.createElement('div');
  toolbar.className = 'asset-portfolio__toolbar';

  const count = document.createElement('span');
  count.className = 'asset-portfolio__count';
  const totalInstances = (group.instances || []).length;
  count.textContent = totalInstances === 1 ? '1 venture' : `${totalInstances} ventures`;
  toolbar.appendChild(count);

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'asset-portfolio__detail-button ghost';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', () => openAssetGroupDetails(group));
  toolbar.appendChild(detailsButton);

  header.appendChild(toolbar);
  section.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'asset-portfolio__cards';
  (group.instances || []).forEach((instance, index) => {
    const definition = resolveDefinitionReference(group.definition, instance, group);
    const item = createInstanceCard(definition, instance, index + 1, state, group);
    if (item) {
      list.appendChild(item);
    }
  });
  section.appendChild(list);

  assetGroupUi.set(group.id, { section, list, header });
  return section;
}

function buildAssetHub(groups, launchers, state = getState()) {
  const container = document.createElement('section');
  container.className = 'venture-hub';

  const { summary, totalInstances, emptyNotice } = buildAssetSummary(groups);
  container.appendChild(summary);

  const launchPanel = buildAssetLaunchPanel(launchers, state);
  if (launchPanel) {
    container.appendChild(launchPanel);
  }

  const portfolio = document.createElement('div');
  portfolio.className = 'asset-portfolio';
  groups.forEach(group => {
    const section = createAssetGroupSection(group, state);
    if (section) {
      portfolio.appendChild(section);
    }
  });
  container.appendChild(portfolio);

  return { container, totalInstances, emptyNotice };
}

function createAssetInstanceCard(definition, instance, index, state = getState()) {
  const resolvedDefinition = resolveDefinitionReference(definition, instance);
  const assetInstance = instance?.instance || instance;
  if (!assetInstance) {
    return null;
  }
  const filters = instance?.filters || {};
  const status = filters.status || instance?.status || assetInstance?.status || 'setup';
  const card = document.createElement('article');
  card.className = 'asset-detail';
  card.dataset.instance = assetInstance.id || instance?.id || '';

  const header = document.createElement('header');
  header.className = 'asset-detail__header';
  const title = document.createElement('h2');
  title.textContent = resolvedDefinition
    ? instanceLabel(resolvedDefinition, index)
    : assetInstance?.name || `Asset ${index}`;
  header.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__summary';
  summary.textContent = resolvedDefinition
    ? describeInstance(resolvedDefinition, assetInstance)
    : status || '';
  header.appendChild(summary);

  const feedback = document.createElement('p');
  feedback.className = 'asset-detail__feedback';
  feedback.textContent = resolvedDefinition ? buildLaunchFeedbackMessage(resolvedDefinition) : 'Asset blueprint pending.';
  header.appendChild(feedback);

  card.appendChild(header);

  const riskLabel = instance?.risk?.label || filters.risk;
  const metrics = resolvedDefinition ? buildMetricsRow(resolvedDefinition, assetInstance, state, riskLabel) : null;
  if (metrics) {
    card.appendChild(metrics);
  }

  const body = document.createElement('div');
  body.className = 'asset-detail__body';

  const overview = resolvedDefinition ? buildInstanceOverview(resolvedDefinition, assetInstance) : null;
  if (overview) {
    body.appendChild(overview);
  }

  const stats = resolvedDefinition ? buildInstanceStats(resolvedDefinition, assetInstance) : null;
  if (stats) {
    body.appendChild(stats);
  }

  const quality = resolvedDefinition && assetInstance.quality ? buildQualityBlock(resolvedDefinition, assetInstance, state) : null;
  if (quality) {
    body.appendChild(quality);
  }

  const detailHighlights = resolvedDefinition ? createAssetDetailHighlights(resolvedDefinition) : null;
  if (detailHighlights) {
    body.appendChild(detailHighlights);
  }

  const nicheSelector = resolvedDefinition ? createInstanceNicheSelector(resolvedDefinition, assetInstance) : null;
  if (nicheSelector) {
    body.appendChild(nicheSelector);
  }

  card.appendChild(body);

  return card;
}

function openInstanceDetails(definition, instance, index, state = getState()) {
  const body = document.createElement('div');
  body.className = 'asset-detail__drawer';
  const card = createAssetInstanceCard(definition, instance, index, state);
  if (card) {
    body.appendChild(card);
  }
  showSlideOver({ eyebrow: 'Asset', title: definition.name, body });
}

function openAssetGroupDetails(group) {
  if (!group?.definition) return;
  const state = getState();
  const body = document.createElement('div');
  body.className = 'asset-group-detail';

  const summary = document.createElement('p');
  summary.textContent = describeAssetCardSummary(group);
  body.appendChild(summary);

  const launch = document.createElement('p');
  launch.textContent = buildLaunchFeedbackMessage(group.definition);
  body.appendChild(launch);

  group.instances?.forEach((instance, index) => {
    const card = createAssetInstanceCard(group.definition, instance, index + 1, state);
    if (card) {
      body.appendChild(card);
    }
  });

  showSlideOver({ eyebrow: 'Asset group', title: group.definition.name, body });
}

export {
  buildAssetHub,
  buildAssetLaunchPanel,
  buildAssetLaunchTile,
  buildAssetSummary,
  createAssetGroupSection,
  createAssetInstanceCard,
  openInstanceDetails,
  openAssetGroupDetails,
  createAssetDetailHighlights,
  createInstanceCard,
  createInstanceActions,
  formatInstanceDailyAverage,
  buildLaunchFeedbackMessage,
  createEquipmentShortcuts
};

export default {
  buildAssetHub,
  createAssetGroupSection,
  createAssetInstanceCard,
  openInstanceDetails,
  openAssetGroupDetails,
  getAssetGroupUi,
  clearAssetGroupUi
};
