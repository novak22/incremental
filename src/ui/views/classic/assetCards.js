import registry, { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import {
  describeRequirement,
  getDefinitionRequirements
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
import { applyCardFilters } from '../../layout/index.js';
import {
  buildAssetModels,
  describeAssetCardSummary,
  describeAssetLaunchAvailability,
  formatInstanceUpkeep,
  getAssetGroupLabel,
  getAssetGroupNote
} from '../../cards/model.js';
import { showSlideOver } from './components/slideOver.js';

const assetGroupUi = new Map();
const assetModelGroupByDefinition = new Map();
const assetDefinitionLookup = new Map();
let currentAssetDefinitions = [];
let currentAssetModels = { groups: [], launchers: [] };

function resolveDefinitionReference(definition, instance, group) {
  if (definition) return definition;
  if (instance?.definition) return instance.definition;
  const definitionId = instance?.definitionId || instance?.definition?.id;
  if (definitionId && assetDefinitionLookup.has(definitionId)) {
    return assetDefinitionLookup.get(definitionId);
  }
  if (Array.isArray(group?.definitions)) {
    const match = group.definitions.find(entry => {
      const entryId = entry?.definition?.id || entry?.id;
      return entryId && (entryId === definitionId || entryId === instance?.id);
    });
    if (match?.definition) {
      return match.definition;
    }
  }
  if (instance?.id && assetDefinitionLookup.has(instance.id)) {
    return assetDefinitionLookup.get(instance.id);
  }
  return null;
}
let assetPortfolioNode = null;
let assetHubNode = null;
let assetEmptyNotice = null;
let assetLaunchPanelExpanded = false;

function resolveAssetGalleryContainer() {
  const gallery = getElement('assetGallery');
  if (gallery) {
    return gallery;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const fallback = document.getElementById('venture-gallery')
    || document.getElementById('asset-gallery');

  if (fallback && typeof registry?.cache?.set === 'function') {
    registry.cache.set('assetGallery', fallback);
  }

  return fallback;
}

function normalizeModelData(models = {}) {
  return {
    groups: Array.isArray(models?.groups) ? models.groups : [],
    launchers: Array.isArray(models?.launchers) ? models.launchers : []
  };
}

function cacheAssetModels(models = {}) {
  const normalized = normalizeModelData(models);
  currentAssetModels = normalized;
  assetModelGroupByDefinition.clear();
  normalized.groups.forEach(group => {
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
  currentAssetDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  assetDefinitionLookup.clear();
  currentAssetDefinitions.forEach(definition => {
    if (definition?.id) {
      assetDefinitionLookup.set(definition.id, definition);
    }
  });
}

export function isAssetDefinition(id) {
  return assetDefinitionLookup.has(id);
}

export function getCachedAssetModel(id) {
  const group = assetModelGroupByDefinition.get(id);
  if (!group) return null;
  return group.definitions?.find(entry => entry?.id === id || entry?.definition?.id === id) || null;
}

function resolveAssetModels(definitions = [], models = {}) {
  const normalized = normalizeModelData(models);
  if ((normalized.groups?.length ?? 0) > 0 || (normalized.launchers?.length ?? 0) > 0) {
    return normalized;
  }
  if (definitions.length) {
    const built = buildAssetModels(definitions);
    return normalizeModelData(built);
  }
  return normalized;
}

export function storeAssetCaches({ definitions = [], models = {} } = {}) {
  if (definitions.length) {
    cacheAssetDefinitions(definitions);
  }
  cacheAssetModels(models);
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

function createInstanceQuickActions(definition, instance, state) {
  const container = document.createElement('div');
  container.className = 'asset-detail__quick-actions';

  if (instance.status !== 'active') {
    const note = document.createElement('span');
    note.className = 'asset-detail__action-note';
    note.textContent = 'Upgrades unlock after launch.';
    container.appendChild(note);
    return container;
  }

  const actions = getQualityActions(definition);
  if (!actions.length) {
    const note = document.createElement('span');
    note.className = 'asset-detail__action-note';
    note.textContent = 'No quality actions configured yet.';
    container.appendChild(note);
    return container;
  }

  const prioritized = [...actions].sort((a, b) => {
    const aAvailable = canPerformQualityAction(definition, instance, a, state) ? 1 : 0;
    const bAvailable = canPerformQualityAction(definition, instance, b, state) ? 1 : 0;
    return bAvailable - aAvailable;
  });

  const limit = Math.min(prioritized.length, 3);
  for (let index = 0; index < limit; index += 1) {
    const action = prioritized[index];
    if (!action) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-detail__action-button';
    button.textContent = action.label || 'Upgrade';
    const disabled = !canPerformQualityAction(definition, instance, action, state);
    button.disabled = disabled;
    const details = [];
    if (action.time) {
      details.push(`⏳ ${formatHours(action.time)}`);
    }
    if (action.cost) {
      details.push(`💵 $${formatMoney(action.cost)}`);
    }
    const usage = getQualityActionUsage(definition, instance, action);
    if (usage.dailyLimit > 0) {
      details.push(`🔁 ${usage.remainingUses}/${usage.dailyLimit} today`);
    }
    let tooltip = details.join(' · ');
    if (usage.exhausted) {
      tooltip = `${tooltip ? `${tooltip} · ` : ''}All uses spent today. Come back tomorrow for a fresh charge.`;
    }
    if (tooltip) {
      button.title = tooltip;
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    container.appendChild(button);
  }

  if (prioritized.length > limit) {
    const more = document.createElement('span');
    more.className = 'asset-detail__action-note';
    more.textContent = `+${prioritized.length - limit} more upgrades available`;
    container.appendChild(more);
  }

  return container;
}

function createInstanceNicheSelector(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__niche-selector';

  const label = document.createElement('span');
  label.className = 'asset-detail__niche-label';
  label.textContent = 'Audience sync';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'asset-detail__niche-dropdown';
  const info = getInstanceNicheInfo(instance);
  const summariesSource = getAssignableNicheSummaries(definition);
  const summaries = Array.isArray(summariesSource) ? summariesSource : [];

  const options = summaries
    .map(entry => ({
      value: entry?.definition?.id || '',
      label: entry?.definition?.name || entry?.definition?.id || '',
      modifier: entry?.popularity?.label || ''
    }))
    .filter(option => option.value && option.label);

  options.unshift({ value: '', label: 'Unassigned' });
  options.forEach(option => {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.modifier ? `${option.label} (${option.modifier})` : option.label;
    select.appendChild(node);
  });
  select.value = info?.definition?.id || '';

  select.addEventListener('change', () => {
    const assetId = definition?.id || instance?.definitionId;
    assignInstanceToNiche(assetId, instance.id, select.value);
  });

  const hint = document.createElement('p');
  hint.className = 'asset-detail__niche-note';
  if (info?.popularity?.summary) {
    hint.textContent = info.popularity.summary;
  } else if (summaries[0]?.popularity?.summary) {
    hint.textContent = summaries[0].popularity.summary;
  } else if (info?.definition?.id) {
    hint.textContent = 'Boosting demand with a specialty audience.';
  } else {
    hint.textContent = 'Pick a niche to sync with daily demand.';
  }

  container.appendChild(select);
  container.appendChild(hint);

  return container;
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

  const actions = document.createElement('div');
  actions.className = 'asset-detail__actions';

  const actionColumns = document.createElement('div');
  actionColumns.className = 'asset-detail__action-columns';
  const quickActions = resolvedDefinition ? createInstanceQuickActions(resolvedDefinition, assetInstance, state) : null;
  if (quickActions) {
    actionColumns.appendChild(quickActions);
  }
  const nicheSelector = resolvedDefinition ? createInstanceNicheSelector(resolvedDefinition, assetInstance) : null;
  if (nicheSelector) {
    actionColumns.appendChild(nicheSelector);
  }
  const equipmentShortcuts = assetInstance?.status === 'active' && resolvedDefinition
    ? createEquipmentShortcuts(resolvedDefinition, state)
    : null;
  if (equipmentShortcuts) {
    actionColumns.appendChild(equipmentShortcuts);
  }
  actions.appendChild(actionColumns);

  const sellButton = document.createElement('button');
  sellButton.type = 'button';
  sellButton.className = 'asset-detail__sell secondary';
  const price = calculateAssetSalePrice(assetInstance);
  sellButton.textContent = price > 0 ? `Sell for $${formatMoney(price)}` : 'No buyer yet';
  sellButton.disabled = price <= 0;
  sellButton.addEventListener('click', event => {
    event.preventDefault();
    if (sellButton.disabled) return;
    sellAssetInstance(resolvedDefinition || definition, assetInstance?.id || instance?.id);
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
  summary.textContent = info.summary;
  container.appendChild(summary);

  if (info.modifier) {
    const modifier = document.createElement('p');
    modifier.className = 'asset-detail__insight-note';
    modifier.textContent = info.modifier;
    container.appendChild(modifier);
  }

  return container;
}

function buildQualityInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--quality';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Quality progress';
  container.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  const progress = calculateInstanceProgress(definition, instance);
  if (progress.ready) {
    summary.textContent = 'Ready for a quality milestone — queue it up below!';
  } else if (progress.percent > 0) {
    summary.textContent = progress.summary || 'Chipping away at the next milestone.';
  } else {
    summary.textContent = 'No quality progress yet — try the quick actions below.';
  }
  container.appendChild(summary);

  const range = getInstanceQualityRange(definition, instance);
  const levelDetail = document.createElement('p');
  levelDetail.className = 'asset-detail__insight-note';
  const current = Number(instance.quality?.level) || 0;
  const currentInfo = getQualityLevel(definition, current);
  const label = currentInfo?.name ? ` (${currentInfo.name})` : '';
  levelDetail.textContent = `Quality ${current}${label} · Range ${range.min}–${range.max}`;
  container.appendChild(levelDetail);

  if (progress.nextLevel) {
    const requirement = document.createElement('p');
    requirement.className = 'asset-detail__insight-note';
    requirement.textContent = `Next boost: ${progress.nextLevel.name}`;
    container.appendChild(requirement);
  }

  return container;
}

function buildNextQualityInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight asset-detail__insight--panel asset-detail__insight--milestone';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Next quality goal';
  container.appendChild(title);

  const progress = calculateInstanceProgress(definition, instance);
  if (!progress.nextLevel) {
    const summary = document.createElement('p');
    summary.className = 'asset-detail__insight-body';
    summary.textContent = 'Maxed out! Further boosts will arrive in a future update.';
    container.appendChild(summary);
    return container;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-detail__insight-body';
  summary.textContent = progress.ready
    ? 'Ready to cash in! Trigger the milestone below.'
    : progress.summary || 'Keep investing to unlock the next boost.';
  container.appendChild(summary);

  const progressBar = document.createElement('progress');
  progressBar.max = 1;
  progressBar.value = progress.percent;
  progressBar.className = 'asset-detail__progress';
  container.appendChild(progressBar);

  const milestone = document.createElement('p');
  milestone.className = 'asset-detail__insight-note';
  milestone.textContent = `${progress.nextLevel.name} · ${Math.round(progress.percent * 100)}% ready`;
  container.appendChild(milestone);

  return container;
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

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${Math.round(number * 100)}%`;
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

function getUpgradeTimeEstimate(upgrade) {
  const time = Number(upgrade?.time) || 0;
  const boost = Number(upgrade?.boost?.time) || 1;
  if (!time) return 'Instant';
  return `${formatHours(time * boost)} install`;
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
    button.title = `${formatMaintenanceSummary(upgrade, state)} • ${getUpgradeTimeEstimate(upgrade)}`;
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
    button.className = 'asset-detail__action-button';
    button.textContent = action.label || 'Upgrade';
    button.disabled = !canPerformQualityAction(definition, instance, action, state);
    const usage = getQualityActionUsage(definition, instance, action);
    if (usage.dailyLimit > 0) {
      button.title = `${usage.remainingUses}/${usage.dailyLimit} uses left today`;
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    buttons.push(button);
  }
  return buttons;
}

function buildLaunchFeedbackMessage(definition) {
  const requirements = describeAssetLaunchAvailability(definition, getState());
  if (!requirements?.blocked) {
    return 'Ready to launch when you are!';
  }
  return requirements.reasons?.[0]?.detail || 'Meet the blueprint requirements to launch this asset.';
}

function formatUpkeepTotals(cost, hours) {
  const total = cost * hours;
  if (!total) {
    return 'No upkeep';
  }
  return `$${formatMoney(total)} / day`;
}

function buildAssetSummary(groups = []) {
  const summary = document.createElement('div');
  const totalInstances = groups.reduce((sum, group) => sum + (group.instances ?? []).length, 0);
  if (!totalInstances) {
    summary.className = 'venture-summary venture-summary--empty';
    const empty = document.createElement('p');
    empty.className = 'venture-summary__empty';
    empty.textContent = 'Launch a fresh venture to light up this showcase.';
    summary.appendChild(empty);
    return { summary, totalInstances, emptyNotice: empty };
  }

  summary.className = 'venture-summary';

  const activeInstances = groups.reduce(
    (sum, group) => sum + (group.instances ?? []).filter(instance => instance.status === 'active').length,
    0
  );
  const upkeepTotal = groups.reduce((sum, group) => {
    const upkeep = Number(group.metrics?.upkeep?.total) || 0;
    return sum + upkeep;
  }, 0);

  const stats = [
    { label: 'Asset groups', value: String(groups.length) },
    { label: 'Active ventures', value: `${activeInstances}/${totalInstances}` },
    { label: 'Daily upkeep', value: `$${formatMoney(upkeepTotal)} / day` }
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

  return { summary, totalInstances, emptyNotice: null };
}

function buildAssetLaunchTile(launcher, state = getState()) {
  const tile = document.createElement('article');
  tile.className = 'venture-launcher__tile';
  const availability = describeAssetLaunchAvailability(launcher.definition, state);
  const ready = availability ? availability.disabled === false : false;
  if (ready) {
    tile.classList.add('venture-launcher__tile--success');
  }
  if (launcher.action?.disabled) {
    tile.classList.add('is-disabled');
  }

  const header = document.createElement('div');
  header.className = 'venture-launcher__heading';
  const title = document.createElement('h3');
  title.className = 'venture-launcher__title';
  title.textContent = launcher.name;
  header.appendChild(title);
  const type = document.createElement('span');
  type.className = 'venture-launcher__type';
  type.textContent = ready ? 'Ready to launch' : 'Requires prep';
  header.appendChild(type);
  tile.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'venture-launcher__summary';
  summary.textContent = launcher.summary;
  tile.appendChild(summary);

  const meta = document.createElement('p');
  meta.className = 'venture-launcher__meta';
  const parts = [];
  if (launcher.setup?.days) {
    parts.push(`${launcher.setup.days} day setup`);
  }
  if (launcher.setup?.hoursPerDay) {
    parts.push(`${formatHours(launcher.setup.hoursPerDay)} / day`);
  }
  if (launcher.setup?.cost) {
    parts.push(`$${formatMoney(launcher.setup.cost)} upfront`);
  }
  if (launcher.upkeep) {
    parts.push(`${launcher.upkeep} upkeep`);
  }
  meta.textContent = parts.join(' • ');
  tile.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'venture-launcher__actions';

  const launchButton = document.createElement('button');
  launchButton.type = 'button';
  launchButton.className = ['venture-launcher__button', launcher.action?.className || 'primary'].join(' ');
  launchButton.textContent = launcher.action?.label || 'Launch';
  launchButton.disabled = Boolean(availability?.disabled || launcher.action?.disabled);
  launchButton.addEventListener('click', event => {
    event.preventDefault();
    if (launchButton.disabled) return;
    launcher.action?.onClick?.();
  });
  actions.appendChild(launchButton);

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'venture-launcher__button ghost';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', () => {
    const body = document.createElement('div');
    body.appendChild(createAssetDetailHighlights(launcher.definition));
    showSlideOver({ eyebrow: 'Asset', title: launcher.definition.name, body });
  });
  actions.appendChild(detailsButton);

  tile.appendChild(actions);

  const feedback = document.createElement('p');
  feedback.className = 'venture-launcher__feedback';
  if (availability?.disabled && availability?.reasons?.length) {
    feedback.textContent = availability.reasons[0];
  } else {
    feedback.textContent = buildLaunchFeedbackMessage(launcher.definition);
  }
  tile.appendChild(feedback);

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

function buildNicheField(definition, instance, state) {
  const field = document.createElement('div');
  field.className = 'asset-detail__field';

  const label = document.createElement('span');
  label.className = 'asset-detail__field-label';
  label.textContent = 'Audience niche';
  const value = document.createElement('span');
  value.className = 'asset-detail__field-value';
  const info = getInstanceNicheInfo(instance);
  value.textContent = info?.summary || 'Unassigned';
  field.append(label, value);

  const select = createInstanceNicheSelector(definition, instance, state);
  if (select) {
    field.appendChild(select);
  }

  return field;
}

function buildQualityBlock(definition, instance) {
  const state = getState();
  const block = document.createElement('section');
  block.className = 'asset-detail__section asset-detail__section--quality';

  const header = document.createElement('header');
  header.className = 'asset-detail__section-header';
  const title = document.createElement('h3');
  title.textContent = 'Quality management';
  header.appendChild(title);
  block.appendChild(header);

  const availability = getQualityActionAvailability(definition, instance, state);
  const note = document.createElement('p');
  note.className = 'asset-detail__section-note';
  note.textContent = availability?.summary || 'Trigger quick actions to build quality momentum.';
  block.appendChild(note);

  const actions = buildSpecialActionButtons(definition, instance, state);
  const actionRow = document.createElement('div');
  actionRow.className = 'asset-detail__action-row';
  if (actions.length) {
    actions.forEach(button => actionRow.appendChild(button));
  } else {
    const hint = document.createElement('span');
    hint.className = 'asset-detail__action-note';
    hint.textContent = 'No quick actions configured yet. Check back soon!';
    actionRow.appendChild(hint);
  }
  block.appendChild(actionRow);

  return block;
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

  const quickActions = resolvedDefinition ? buildSpecialActionButtons(resolvedDefinition, assetInstance, state) : [];
  if (quickActions.length) {
    const actionRow = document.createElement('div');
    actionRow.className = 'asset-detail__action-row';
    quickActions.forEach(button => actionRow.appendChild(button));
    body.appendChild(actionRow);
  }

  if (resolvedDefinition) {
    body.appendChild(buildQualityBlock(resolvedDefinition, assetInstance));
    body.appendChild(buildPayoutBlock(resolvedDefinition, assetInstance));
  }

  card.appendChild(body);
  return card;
}

function createAssetGroupSection(group, state = getState()) {
  if (!group?.id) return null;
  const section = document.createElement('section');
  section.className = 'asset-portfolio__group';
  section.dataset.group = group.id;

  const header = document.createElement('header');
  header.className = 'asset-portfolio__header';

  const heading = document.createElement('div');
  heading.className = 'asset-portfolio__heading';
  const icon = document.createElement('span');
  icon.className = 'asset-portfolio__icon';
  icon.textContent = group.icon || '✨';
  heading.appendChild(icon);

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

function renderAssets(definitions = [], assetModels = currentAssetModels) {
  const normalizedModels = resolveAssetModels(definitions, assetModels);
  storeAssetCaches({ definitions, models: normalizedModels });

  const container = resolveAssetGalleryContainer();
  if (!container) return;

  const state = getState();
  const { container: hub, totalInstances, emptyNotice } = buildAssetHub(
    normalizedModels.groups,
    normalizedModels.launchers,
    state
  );

  container.innerHTML = '';
  container.appendChild(hub);

  assetHubNode = hub;
  assetPortfolioNode = container;
  assetEmptyNotice = emptyNotice || hub.querySelector('.venture-summary__empty') || null;

  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function updateAssetHub() {
  const container = resolveAssetGalleryContainer();
  if (!container || !assetHubNode) return;
  if (container.firstElementChild) {
    container.replaceChild(assetHubNode, container.firstElementChild);
  } else {
    container.appendChild(assetHubNode);
  }
}

function updateAssetEmptyNotice(totalInstances) {
  if (!assetEmptyNotice) return;
  assetEmptyNotice.hidden = totalInstances > 0;
}

function updateAssets(definitions = [], assetModels = currentAssetModels) {
  const normalizedModels = resolveAssetModels(definitions, assetModels);
  storeAssetCaches({ definitions, models: normalizedModels });

  const state = getState();
  const { container: hub, totalInstances, emptyNotice } = buildAssetHub(
    normalizedModels.groups,
    normalizedModels.launchers,
    state
  );
  assetHubNode = hub;

  const container = resolveAssetGalleryContainer();
  if (container) {
    assetPortfolioNode = container;
  }

  if (assetPortfolioNode) {
    assetPortfolioNode.innerHTML = '';
    assetPortfolioNode.appendChild(hub);
  }

  assetEmptyNotice = emptyNotice || hub.querySelector('.venture-summary__empty') || null;
  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function updateAssetGroup(definitionId) {
  const group = assetModelGroupByDefinition.get(definitionId);
  if (!group) return;
  const state = getState();
  const section = createAssetGroupSection(group, state);
  const ui = assetGroupUi.get(group.id);
  if (ui?.section && section) {
    ui.section.replaceWith(section);
    assetGroupUi.set(group.id, { ...ui, section });
  }
  const summaryData = buildAssetSummary(currentAssetModels.groups);
  if (assetHubNode && summaryData?.summary) {
    const existing = assetHubNode.querySelector('.venture-summary');
    if (existing) {
      existing.replaceWith(summaryData.summary);
    } else {
      assetHubNode.prepend(summaryData.summary);
    }
    assetEmptyNotice = summaryData.emptyNotice || summaryData.summary.querySelector('.venture-summary__empty') || null;
    updateAssetEmptyNotice(summaryData.totalInstances);
  } else {
    updateAssetEmptyNotice(summaryData?.totalInstances ?? 0);
  }
  applyCardFilters();
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

export const assetCards = {
  storeAssetCaches,
  renderAssets,
  updateAssets,
  updateAssetGroup,
  updateAssetHub,
  updateAssetEmptyNotice,
  openInstanceDetails,
  openAssetGroupDetails,
  isAssetDefinition,
  getCachedAssetModel
};

export default assetCards;

