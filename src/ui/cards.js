import elements from './elements.js';
import { getAssetState, getState, getUpgradeState } from '../core/state.js';
import { formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { describeHustleRequirements } from '../game/hustles.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../game/requirements.js';
import { getTimeCap } from '../game/time.js';
import {
  describeInstance,
  describeInstanceNetHourly
} from './assetInstances.js';
import {
  calculateAssetSalePrice,
  instanceLabel,
  sellAssetInstance
} from '../game/assets/helpers.js';
import {
  getPendingEquipmentUpgrades,
  getUpgradeButtonLabel,
  isUpgradeDisabled
} from './assetUpgrades.js';
import {
  canPerformQualityAction,
  getQualityActionCooldown,
  getQualityActions,
  getQualityLevel,
  getQualityNextRequirements,
  getQualityTracks,
  getNextQualityLevel,
  getInstanceQualityRange,
  performQualityAction
} from '../game/assets/quality.js';

const hustleUi = new Map();
const assetUi = new Map();
const upgradeUi = new Map();
const studyUi = new Map();
let studyElementsDocument = null;

let expandedAssetId = null;

function showSlideOver({ eyebrow, title, body }) {
  const { slideOver, slideOverContent, slideOverEyebrow, slideOverTitle } = elements;
  if (!slideOver || !slideOverContent) return;
  slideOverEyebrow.textContent = eyebrow || '';
  slideOverTitle.textContent = title || '';
  slideOverContent.innerHTML = '';
  if (Array.isArray(body)) {
    body.forEach(node => slideOverContent.appendChild(node));
  } else if (body instanceof Node) {
    slideOverContent.appendChild(body);
  } else if (typeof body === 'string') {
    const p = document.createElement('p');
    p.textContent = body;
    slideOverContent.appendChild(p);
  }
  slideOver.hidden = false;
  slideOver.focus();
}

function createBadge(label) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = label;
  return span;
}

function createDefinitionSummary(title, rows = []) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);
  const list = document.createElement('ul');
  list.className = 'definition-list';
  rows.forEach(row => {
    const item = document.createElement('li');
    if (row.label) {
      const label = document.createElement('span');
      label.textContent = row.label;
      label.className = 'definition-list__label';
      item.appendChild(label);
    }
    if (row.value) {
      const value = document.createElement('span');
      value.textContent = row.value;
      value.className = 'definition-list__value';
      item.appendChild(value);
    }
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

function createAssetDetailHighlights(definition) {
  const detailBuilders = Array.isArray(definition.details) ? definition.details : [];
  const details = detailBuilders
    .map(builder => {
      if (typeof builder === 'function') {
        try {
          return builder();
        } catch (error) {
          console.error('Failed to render asset detail', error);
          return null;
        }
      }
      return builder;
    })
    .filter(detail => {
      if (!detail) return false;
      if (typeof detail === 'string') {
        return detail.trim().length > 0;
      }
      return detail instanceof Node;
    });

  if (!details.length) return null;

  const section = document.createElement('section');
  section.className = 'asset-detail__section';
  const heading = document.createElement('h3');
  heading.textContent = 'Launch blueprint';
  section.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'asset-detail__highlights';
  details.forEach(detail => {
    const item = document.createElement('li');
    item.className = 'asset-detail__highlight';
    if (typeof detail === 'string') {
      item.innerHTML = detail;
    } else if (detail instanceof Node) {
      item.appendChild(detail);
    }
    list.appendChild(item);
  });
  section.appendChild(list);
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
    const cooldown = getQualityActionCooldown(definition, instance, action, state);
    if (cooldown.onCooldown) {
      const days = cooldown.remainingDays;
      const label = days === 1 ? 'Ready tomorrow' : `Ready in ${days} days`;
      details.push(`🕒 ${label}`);
    }
    if (details.length) {
      button.title = details.join(' · ');
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

  if (instance.status === 'active') {
    const tracks = getQualityTracks(definition);
    const progressWrap = document.createElement('div');
    progressWrap.className = 'asset-detail__progress';
    const progress = instance.quality?.progress || {};
    const nextRequirements = getQualityNextRequirements(definition, Number(instance.quality?.level) || 0) || {};
    Object.entries(tracks).forEach(([key, track]) => {
      const label = track?.shortLabel || track?.label || key;
      const current = Number(progress?.[key]) || 0;
      const row = document.createElement('span');
      row.className = 'asset-detail__progress-entry';
      const target = Number(nextRequirements[key]) || 0;
      if (target > 0) {
        row.textContent = `${label}: ${current} / ${target}`;
        if (current < target) {
          row.classList.add('is-pending');
        } else {
          row.classList.add('is-complete');
        }
      } else {
        row.textContent = `${label}: ${current}`;
      }
      progressWrap.appendChild(row);
    });
    if (progressWrap.childElementCount) {
      item.appendChild(progressWrap);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'asset-detail__actions';

  const actionColumns = document.createElement('div');
  actionColumns.className = 'asset-detail__action-columns';
  actionColumns.appendChild(createInstanceQuickActions(definition, instance, state));
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

function buildQualityInsight(definition, instance) {
  const level = Number(instance.quality?.level) || 0;
  const levelInfo = getQualityLevel(definition, level);
  const container = document.createElement('div');
  container.className = 'asset-detail__insight';

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
  container.className = 'asset-detail__insight';

  const title = document.createElement('h4');
  title.className = 'asset-detail__insight-title';
  title.textContent = 'Next milestone';
  container.appendChild(title);

  if (!nextRequirements) {
    const complete = document.createElement('p');
    complete.className = 'asset-detail__insight-body';
    complete.textContent = 'Top tier unlocked — keep collecting those dreamy payouts!';
    container.appendChild(complete);
    return container;
  }

  const nextLevel = getNextQualityLevel(definition, level);
  if (nextLevel) {
    const heading = document.createElement('p');
    heading.className = 'asset-detail__insight-body';
    const tierName = nextLevel.name ? ` — ${nextLevel.name}` : '';
    heading.textContent = `Quality ${nextLevel.level}${tierName}`;
    container.appendChild(heading);
  }

  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  const entries = Object.entries(nextRequirements)
    .map(([key, target]) => {
      const label = tracks[key]?.shortLabel || tracks[key]?.label || key;
      const goal = Number(target) || 0;
      if (goal <= 0) return null;
      const current = Number(progress?.[key]) || 0;
      const remaining = Math.max(0, goal - current);
      if (remaining <= 0) return null;
      return { label, current, goal, remaining };
    })
    .filter(Boolean);

  if (!entries.length) {
    const ready = document.createElement('p');
    ready.className = 'asset-detail__insight-note';
    ready.textContent = 'All requirements met! Run a quality action to celebrate the rank up.';
    container.appendChild(ready);
    return container;
  }

  const list = document.createElement('ul');
  list.className = 'asset-detail__requirement-list';
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'asset-detail__requirement-entry';
    const label = document.createElement('span');
    label.className = 'asset-detail__requirement-label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'asset-detail__requirement-value';
    value.textContent = `${entry.current} / ${entry.goal} (${entry.remaining} to go)`;
    item.append(label, value);
    list.appendChild(item);
  });
  container.appendChild(list);
  return container;
}

function buildPayoutInsight(definition, instance) {
  const container = document.createElement('div');
  container.className = 'asset-detail__insight';

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
  const parts = [];
  const cost = Number(definition.maintenance?.cost) || 0;
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  const hours = Number(definition.maintenance?.hours) || 0;
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  return parts.join(' • ');
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

function createEquipmentShortcuts(definition, state) {
  const pending = getPendingEquipmentUpgrades(definition, state);
  if (!Array.isArray(pending) || pending.length === 0) {
    return null;
  }

  const limit = Math.min(2, pending.length);
  if (limit <= 0) return null;

  const container = document.createElement('div');
  container.className = 'asset-detail__upgrade-shortcuts';

  const title = document.createElement('span');
  title.className = 'asset-detail__upgrade-title';
  title.textContent = pending.length > 1 ? 'Equipment boosts' : 'Equipment boost';
  container.appendChild(title);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'asset-detail__upgrade-buttons';
  container.appendChild(buttonRow);

  for (let index = 0; index < limit; index += 1) {
    const upgrade = pending[index];
    if (!upgrade) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-detail__upgrade-button';
    button.dataset.upgradeId = upgrade.id;
    button.textContent = getUpgradeButtonLabel(upgrade);
    button.disabled = isUpgradeDisabled(upgrade);
    if (upgrade.description) {
      button.title = upgrade.description;
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      upgrade.action?.onClick?.();
    });
    buttonRow.appendChild(button);
  }

  if (pending.length > limit) {
    const more = document.createElement('span');
    more.className = 'asset-detail__upgrade-more';
    more.textContent = `+${pending.length - limit} more`;
    container.appendChild(more);
  }

  return container;
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

  hustleUi.set(definition.id, { card, queueButton });
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
}

function openHustleDetails(definition) {
  const state = getState();
  const time = Number(definition.time || definition.action?.timeCost) || 0;
  const payout = Number(definition.payout?.amount || definition.action?.payout) || 0;
  const body = document.createElement('div');
  body.className = 'hustle-detail';

  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }

  body.appendChild(
    createDefinitionSummary('Stats', [
      { label: 'Time', value: formatHours(time) },
      { label: 'Payout', value: payout > 0 ? `$${formatMoney(payout)}` : 'Varies' }
    ])
  );

  const requirements = describeHustleRequirements(definition, state) || [];
  const reqRows = requirements.length
    ? requirements.map(req => ({
        label: req.label,
        value: req.met
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

function renderAssetRow(definition, tbody) {
  const state = getState();
  const assetState = getAssetState(definition.id, state);
  const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
  const activeInstances = instances.filter(instance => instance.status === 'active');
  const pausedInstances = instances.filter(instance => instance.status !== 'active');
  const lastIncome = activeInstances.reduce((total, instance) => total + Number(instance.lastIncome || 0), 0);
  const upkeepCost = Number(definition.maintenance?.cost) || 0;
  const upkeepHours = Number(definition.maintenance?.hours) || 0;

  const row = document.createElement('tr');
  row.dataset.asset = definition.id;
  row.dataset.state = activeInstances.length > 0 ? 'active' : 'idle';
  row.dataset.needsMaintenance = activeInstances.some(instance => !instance.maintenanceFundedToday) ? 'true' : 'false';
  row.dataset.risk = definition.tag?.type === 'advanced' ? 'high' : 'medium';

  const nameCell = document.createElement('td');
  nameCell.textContent = definition.name;
  row.appendChild(nameCell);

  const stateCell = document.createElement('td');
  if (activeInstances.length) {
    stateCell.textContent = `${activeInstances.length} active`;
  } else if (pausedInstances.length) {
    stateCell.textContent = `${pausedInstances.length} paused`; 
  } else {
    stateCell.textContent = 'Not launched';
  }
  row.appendChild(stateCell);

  const yieldCell = document.createElement('td');
  yieldCell.textContent = activeInstances.length
    ? `$${formatMoney(Math.max(0, lastIncome))} yesterday`
    : '—';
  row.appendChild(yieldCell);

  const upkeepCell = document.createElement('td');
  const upkeepParts = [];
  if (upkeepCost > 0) upkeepParts.push(`$${formatMoney(upkeepCost)}`);
  if (upkeepHours > 0) upkeepParts.push(`${formatHours(upkeepHours)}`);
  upkeepCell.textContent = upkeepParts.join(' • ') || 'None';
  row.appendChild(upkeepCell);

  const riskCell = document.createElement('td');
  riskCell.textContent = row.dataset.risk === 'high' ? 'High' : 'Moderate';
  row.appendChild(riskCell);

  const modifierCell = document.createElement('td');
  modifierCell.textContent = definition.boosts || definition.unlocks || '—';
  row.appendChild(modifierCell);

  const actionsCell = document.createElement('td');
  actionsCell.className = 'actions-col';
  const actions = document.createElement('div');
  actions.className = 'asset-row-actions';
  const buildsButton = document.createElement('button');
  buildsButton.type = 'button';
  buildsButton.className = 'ghost';
  buildsButton.textContent = 'Builds';
  buildsButton.setAttribute('aria-expanded', 'false');
  buildsButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleAssetBuilds(definition);
  });
  actions.appendChild(buildsButton);
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'ghost';
  details.textContent = 'Details';
  details.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openAssetDetails(definition);
  });
  actions.appendChild(details);
  const entry = {
    row,
    buildsButton,
    buildsRow: null,
    buildsContainer: null,
    cells: { state: stateCell, yield: yieldCell, upkeep: upkeepCell }
  };
  if (definition.action?.onClick) {
    const primary = document.createElement('button');
    primary.type = 'button';
    primary.className = 'primary';
    primary.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action.label || 'Launch';
    primary.addEventListener('click', event => {
      event.stopPropagation();
      if (primary.disabled) return;
      definition.action.onClick();
    });
    actions.appendChild(primary);
    entry.primary = primary;
  }
  assetUi.set(definition.id, entry);
  actionsCell.appendChild(actions);
  row.appendChild(actionsCell);

  row.addEventListener('click', () => openAssetDetails(definition));

  tbody.appendChild(row);
}

function refreshAssetRow(definition) {
  const ui = assetUi.get(definition.id);
  if (!ui) return;
  const state = getState();
  const assetState = getAssetState(definition.id, state);
  const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
  const activeInstances = instances.filter(instance => instance.status === 'active');
  const pausedInstances = instances.filter(instance => instance.status !== 'active');
  const lastIncome = activeInstances.reduce((total, instance) => total + Number(instance.lastIncome || 0), 0);
  ui.row.dataset.state = activeInstances.length > 0 ? 'active' : 'idle';
  ui.row.dataset.needsMaintenance = activeInstances.some(instance => !instance.maintenanceFundedToday)
    ? 'true'
    : 'false';
  if (ui.cells?.state) {
    if (activeInstances.length) {
      ui.cells.state.textContent = `${activeInstances.length} active`;
    } else if (pausedInstances.length) {
      ui.cells.state.textContent = `${pausedInstances.length} paused`;
    } else {
      ui.cells.state.textContent = 'Not launched';
    }
  }
  if (ui.cells?.yield) {
    ui.cells.yield.textContent = activeInstances.length
      ? `$${formatMoney(Math.max(0, lastIncome))} yesterday`
      : '—';
  }
  if (ui.cells?.upkeep) {
    const upkeepCost = Number(definition.maintenance?.cost) || 0;
    const upkeepHours = Number(definition.maintenance?.hours) || 0;
    const upkeepParts = [];
    if (upkeepCost > 0) upkeepParts.push(`$${formatMoney(upkeepCost)}`);
    if (upkeepHours > 0) upkeepParts.push(`${formatHours(upkeepHours)}`);
    ui.cells.upkeep.textContent = upkeepParts.join(' • ') || 'None';
  }
  if (ui.primary) {
    ui.primary.textContent = typeof definition.action?.label === 'function'
      ? definition.action.label(state)
      : definition.action?.label || 'Launch';
    const disabled = typeof definition.action?.disabled === 'function'
      ? definition.action.disabled(state)
      : Boolean(definition.action?.disabled);
    ui.primary.disabled = disabled;
  }

  refreshExpandedAsset(definition);
}

function getAssetInstances(definition, state) {
  if (!definition) return [];
  const assetState = getAssetState(definition.id, state);
  return Array.isArray(assetState?.instances) ? assetState.instances : [];
}

function describeAssetBuildRoster(instances = []) {
  const activeCount = instances.filter(instance => instance?.status === 'active').length;
  const queuedCount = instances.length - activeCount;
  if (!instances.length) {
    return 'Launch a build to start earning and it will show up right here.';
  }
  if (activeCount > 0) {
    const activeLabel = `${activeCount} active build${activeCount === 1 ? '' : 's'} humming along`;
    return queuedCount > 0
      ? `${activeLabel} • ${queuedCount} queued.`
      : `${activeLabel}.`;
  }
  return `Queue warming up • ${queuedCount} build${queuedCount === 1 ? '' : 's'} getting ready to launch.`;
}

function renderAssetBuildsContent(definition, state, container, instances, { includeSummary = false } = {}) {
  if (!container) return;
  const rosterNote = describeAssetBuildRoster(instances);
  container.innerHTML = '';
  if (includeSummary) {
    const summary = document.createElement('p');
    summary.className = 'asset-builds__summary';
    summary.textContent = rosterNote;
    container.appendChild(summary);
  }

  const section = createInstanceListSection(definition, state, instances);
  if (section) {
    const heading = section.querySelector('h3');
    if (heading) {
      section.removeChild(heading);
    }
    while (section.firstChild) {
      container.appendChild(section.firstChild);
    }
  }

  if (!container.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'asset-builds__empty';
    empty.textContent = rosterNote;
    container.appendChild(empty);
  }
}

function refreshExpandedAsset(definition) {
  if (!definition || expandedAssetId !== definition.id) return;
  const ui = assetUi.get(definition.id);
  if (!ui?.buildsContainer) return;
  const state = getState();
  const instances = getAssetInstances(definition, state);
  renderAssetBuildsContent(definition, state, ui.buildsContainer, instances, { includeSummary: true });
  renderLaunchedBuilds(definition, state);
}

function toggleAssetBuilds(definition) {
  if (!definition) return;
  if (expandedAssetId === definition.id) {
    collapseAssetBuilds(definition.id);
    return;
  }
  if (expandedAssetId) {
    collapseAssetBuilds(expandedAssetId, { silent: true });
  }
  expandAssetBuilds(definition);
}

function expandAssetBuilds(definition) {
  const ui = assetUi.get(definition.id);
  if (!ui?.row) return;
  const state = getState();
  const instances = getAssetInstances(definition, state);
  const buildsRow = document.createElement('tr');
  buildsRow.className = 'asset-row-builds';
  buildsRow.dataset.assetBuilds = definition.id;
  const cell = document.createElement('td');
  cell.colSpan = ui.row.children.length || 1;
  const container = document.createElement('div');
  container.className = 'asset-builds';
  renderAssetBuildsContent(definition, state, container, instances, { includeSummary: true });
  cell.appendChild(container);
  buildsRow.appendChild(cell);
  ui.row.insertAdjacentElement('afterend', buildsRow);
  ui.buildsRow = buildsRow;
  ui.buildsContainer = container;
  if (ui.buildsButton) {
    ui.buildsButton.textContent = 'Hide builds';
    ui.buildsButton.setAttribute('aria-expanded', 'true');
  }
  ui.row.classList.add('is-expanded');
  expandedAssetId = definition.id;
  renderLaunchedBuilds(definition, state);
}

function collapseAssetBuilds(assetId, { silent = false } = {}) {
  if (!assetId) return;
  const ui = assetUi.get(assetId);
  if (!ui) return;
  if (ui.buildsRow?.parentElement) {
    ui.buildsRow.remove();
  }
  ui.buildsRow = null;
  ui.buildsContainer = null;
  if (ui.buildsButton) {
    ui.buildsButton.textContent = 'Builds';
    ui.buildsButton.setAttribute('aria-expanded', 'false');
  }
  ui.row?.classList.remove('is-expanded');
  if (expandedAssetId === assetId) {
    expandedAssetId = null;
    if (!silent) {
      renderLaunchedBuilds(null, getState());
    }
  }
}

function openAssetDetails(definition) {
  const state = getState();
  const body = document.createElement('div');
  body.className = 'asset-detail';

  if (definition.description) {
    const intro = document.createElement('p');
    intro.className = 'asset-detail__intro';
    intro.textContent = definition.description;
    body.appendChild(intro);
  }

  const highlights = createAssetDetailHighlights(definition);
  if (highlights) {
    body.appendChild(highlights);
  }

  const assetState = getAssetState(definition.id, state);
  const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
  const summaryRows = [
    { label: 'Active builds', value: String(instances.filter(i => i.status === 'active').length) },
    { label: 'Setup builds', value: String(instances.filter(i => i.status === 'setup').length) },
    { label: 'Maintenance hours', value: formatHours(Number(definition.maintenance?.hours) || 0) }
  ];
  body.appendChild(createDefinitionSummary('Roster snapshot', summaryRows));

  showSlideOver({ eyebrow: 'Asset', title: definition.name, body });
}

function renderLaunchedBuilds(definition, state) {
  const panel = elements.assetLaunched;
  if (!panel?.content) return;

  const { content, note, title } = panel;
  content.innerHTML = '';

  if (!definition) {
    if (title) title.textContent = 'Launched builds';
    if (note) note.textContent = 'Select an asset to explore active and queued builds.';
    const empty = document.createElement('p');
    empty.className = 'asset-launched__empty';
    empty.textContent = 'No asset selected yet. Tap a row to review its build roster.';
    content.appendChild(empty);
    return;
  }

  const instances = getAssetInstances(definition, state);

  if (title) {
    title.textContent = `${definition.name} builds`;
  }

  if (note) {
    note.textContent = describeAssetBuildRoster(instances);
  }

  renderAssetBuildsContent(definition, state, content, instances);
}

function renderAssets(definitions) {
  const tbody = elements.assetTableBody;
  if (!tbody) return;
  if (expandedAssetId) {
    collapseAssetBuilds(expandedAssetId);
  }
  tbody.innerHTML = '';
  assetUi.clear();
  expandedAssetId = null;
  definitions.forEach(def => renderAssetRow(def, tbody));
}

function renderUpgradeCard(definition, container) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'upgrade-card';
  card.dataset.upgrade = definition.id;
  card.dataset.search = `${definition.name} ${definition.description}`.toLowerCase();

  const header = document.createElement('div');
  header.className = 'upgrade-card__header';
  const title = document.createElement('h3');
  title.className = 'upgrade-card__title';
  title.textContent = definition.name;
  header.appendChild(title);
  const price = document.createElement('span');
  const cost = Number(definition.cost) || 0;
  price.textContent = cost > 0 ? `$${formatMoney(cost)}` : 'No cost';
  header.appendChild(price);
  card.appendChild(header);

  if (definition.description) {
    const copy = document.createElement('p');
    copy.textContent = definition.description;
    card.appendChild(copy);
  }

  const meta = document.createElement('div');
  meta.className = 'upgrade-card__meta';
  meta.textContent = definition.boosts || definition.unlocks || 'Passive boost';
  card.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'upgrade-card__actions';
  let buyButton = null;
  let favoriteButton = null;
  if (definition.action?.onClick) {
    buyButton = document.createElement('button');
    buyButton.type = 'button';
    buyButton.className = 'primary';
    buyButton.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action.label || 'Buy';
    buyButton.addEventListener('click', () => {
      if (buyButton.disabled) return;
      definition.action.onClick();
    });
    actions.appendChild(buyButton);
  }
  favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'ghost';
  favoriteButton.textContent = '★';
  favoriteButton.addEventListener('click', () => toggleUpgradeFavorite(definition));
  actions.appendChild(favoriteButton);
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'ghost';
  details.textContent = 'Details';
  details.addEventListener('click', () => openUpgradeDetails(definition));
  actions.appendChild(details);
  card.appendChild(actions);

  container.appendChild(card);
  upgradeUi.set(definition.id, { card, buyButton, favoriteButton });
  updateUpgradeCard(definition);
}

function updateUpgradeCard(definition) {
  const ui = upgradeUi.get(definition.id);
  if (!ui) return;
  const state = getState();
  const upgradeState = state?.upgrades?.[definition.id] || {};
  const cost = Number(definition.cost) || 0;
  const affordable = cost <= 0 || state.money >= cost;
  const purchased = Boolean(upgradeState.purchased);
  ui.card.dataset.affordable = affordable ? 'true' : 'false';
  ui.card.dataset.favorite = upgradeState.favorite ? 'true' : 'false';
  if (ui.buyButton) {
    const disabled = typeof definition.action?.disabled === 'function'
      ? definition.action.disabled(state)
      : Boolean(definition.action?.disabled);
    ui.buyButton.disabled = disabled || !affordable;
    ui.buyButton.textContent = typeof definition.action?.label === 'function'
      ? definition.action.label(state)
      : definition.action?.label || 'Buy';
  }
  if (ui.favoriteButton) {
    ui.favoriteButton.setAttribute('aria-pressed', upgradeState.favorite ? 'true' : 'false');
  }
}

function toggleUpgradeFavorite(definition) {
  const state = getState();
  if (!state) return;
  state.upgrades = state.upgrades || {};
  state.upgrades[definition.id] = state.upgrades[definition.id] || {};
  const current = Boolean(state.upgrades[definition.id].favorite);
  state.upgrades[definition.id].favorite = !current;
  updateUpgradeCard(definition);
  renderUpgradeDock();
}

function openUpgradeDetails(definition) {
  const state = getState();
  const body = document.createElement('div');
  body.className = 'upgrade-detail';

  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }

  const cost = Number(definition.cost) || 0;
  body.appendChild(
    createDefinitionSummary('Investment', [
      { label: 'Price', value: cost > 0 ? `$${formatMoney(cost)}` : 'No cost' },
      { label: 'Owned', value: getUpgradeState(definition.id, state)?.purchased ? 'Yes' : 'No' }
    ])
  );

  showSlideOver({ eyebrow: 'Upgrade', title: definition.name, body });
}

function renderUpgrades(definitions) {
  const list = elements.upgradeList;
  if (!list) return;
  list.innerHTML = '';
  upgradeUi.clear();
  definitions.forEach(def => renderUpgradeCard(def, list));
  renderUpgradeDock();
}

function renderUpgradeDock() {
  const dock = elements.upgradeDockList;
  if (!dock) return;
  dock.innerHTML = '';
  const suggestions = Array.from(upgradeUi.values())
    .map(ui => ui.card)
    .filter(card => card.dataset.affordable === 'true')
    .slice(0, 6);
  if (!suggestions.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No standout upgrades yet.';
    dock.appendChild(empty);
    return;
  }
  suggestions.forEach(card => {
    const item = document.createElement('li');
    item.className = 'dock-item';
    const label = document.createElement('strong');
    label.textContent = card.querySelector('.upgrade-card__title')?.textContent || '';
    const price = document.createElement('span');
    price.textContent = card.querySelector('.upgrade-card__header span')?.textContent || '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = card.querySelector('.upgrade-card__actions .primary')?.textContent || 'Buy';
    button.disabled = card.querySelector('.upgrade-card__actions .primary')?.disabled;
    button.addEventListener('click', () => card.querySelector('.upgrade-card__actions .primary')?.click());
    item.append(label, price, button);
    dock.appendChild(item);
  });
}

function resolveTrack(definition) {
  if (!definition) {
    return {
      id: '',
      name: '',
      summary: '',
      description: '',
      days: 1,
      hoursPerDay: 1,
      tuition: 0,
      action: null
    };
  }

  const canonicalId = definition.studyTrackId || definition.id;
  const canonical = KNOWLEDGE_TRACKS[canonicalId];

  const summary = definition.description || canonical?.description || '';
  const description = canonical?.description || definition.description || '';
  const days = Number(canonical?.days ?? definition.days ?? definition.action?.durationDays) || 1;
  const hoursPerDay = Number(
    canonical?.hoursPerDay ?? definition.hoursPerDay ?? definition.time ?? definition.action?.timeCost
  ) || 1;
  const tuition = Number(canonical?.tuition ?? definition.tuition ?? definition.action?.moneyCost) || 0;

  return {
    id: canonical?.id || canonicalId,
    name: canonical?.name || definition.name || canonicalId,
    summary,
    description,
    days,
    hoursPerDay,
    tuition,
    action: definition.action
  };
}

function formatStudyCountdown(trackInfo, progress) {
  if (progress.completed) {
    return 'Diploma earned';
  }

  if (!progress.enrolled) {
    return `${formatDays(trackInfo.days)}`;
  }

  const remainingDays = Math.max(0, trackInfo.days - progress.daysCompleted);
  if (remainingDays === 0) {
    return 'Graduation tomorrow';
  }
  if (remainingDays === 1) {
    return '1 day remaining';
  }
  return `${remainingDays} days remaining`;
}

function describeStudyMomentum(trackInfo, progress) {
  if (progress.completed) {
    return 'Knowledge unlocked for every requirement. Toast your success!';
  }
  if (!progress.enrolled) {
    const tuitionNote = trackInfo.tuition > 0 ? `Pay $${formatMoney(trackInfo.tuition)} upfront and` : 'Just';
    return `${tuitionNote} we’ll reserve ${formatHours(trackInfo.hoursPerDay)} each day once you enroll.`;
  }
  if (progress.studiedToday) {
    return '✅ Today’s session is logged. Keep the streak cozy until sundown.';
  }
  return `Reserve ${formatHours(trackInfo.hoursPerDay)} today to keep momentum humming.`;
}

function buildStudyBadges(progress) {
  const badges = [];
  if (progress.completed) {
    badges.push(createBadge('Graduated'));
  } else if (progress.enrolled) {
    badges.push(createBadge('Enrolled'));
    badges.push(createBadge(progress.studiedToday ? 'Logged today' : 'Study pending'));
  } else {
    badges.push(createBadge('Ready to enroll'));
  }
  return badges;
}

function applyStudyTrackState(track, trackInfo, progress) {
  track.dataset.active = progress.enrolled ? 'true' : 'false';
  track.dataset.complete = progress.completed ? 'true' : 'false';

  const countdown = track.querySelector('.study-track__countdown');
  if (countdown) {
    countdown.textContent = formatStudyCountdown(trackInfo, progress);
  }

  const status = track.querySelector('.study-track__status');
  if (status) {
    status.innerHTML = '';
    buildStudyBadges(progress).forEach(badge => status.appendChild(badge));
  }

  const note = track.querySelector('.study-track__note');
  if (note) {
    note.textContent = describeStudyMomentum(trackInfo, progress);
  }

  const remainingDays = Math.max(0, trackInfo.days - progress.daysCompleted);
  const percent = Math.min(100, Math.round((progress.daysCompleted / Math.max(1, trackInfo.days)) * 100));
  const fill = track.querySelector('.study-track__progress span');
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.setAttribute('aria-valuenow', String(percent));
  }

  const progressLabel = track.querySelector('.study-track__progress');
  if (progressLabel) {
    progressLabel.setAttribute('aria-label', `${trackInfo.name} progress: ${percent}%`);
  }

  const remaining = track.querySelector('.study-track__remaining');
  if (remaining) {
    const daysComplete = progress.completed ? trackInfo.days : progress.daysCompleted;
    remaining.textContent = `${daysComplete}/${trackInfo.days} days complete`;
  }

  const countdownValue = track.querySelector('.study-track__remaining-days');
  if (countdownValue) {
    countdownValue.textContent = progress.completed
      ? 'Course complete'
      : remainingDays === 1
        ? '1 day left'
        : `${remainingDays} days left`;
  }
}

function renderStudyTrack(definition) {
  const state = getState();
  const trackInfo = resolveTrack(definition);
  const progress = getKnowledgeProgress(trackInfo.id, state);
  const track = document.createElement('article');
  track.className = 'study-track';
  track.dataset.track = trackInfo.id;
  track.setAttribute('aria-label', `${trackInfo.name} study track`);

  const header = document.createElement('header');
  header.className = 'study-track__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'study-track__title-group';

  const title = document.createElement('h3');
  title.textContent = trackInfo.name;
  titleGroup.appendChild(title);

  const status = document.createElement('div');
  status.className = 'study-track__status badges';
  titleGroup.appendChild(status);

  header.appendChild(titleGroup);

  const countdown = document.createElement('span');
  countdown.className = 'study-track__countdown';
  header.appendChild(countdown);
  track.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'study-track__summary';
  summary.textContent = trackInfo.summary || '';
  track.appendChild(summary);

  const meta = document.createElement('dl');
  meta.className = 'study-track__meta';
  const metaItems = [
    { label: 'Daily load', value: `${formatHours(trackInfo.hoursPerDay)} / day` },
    { label: 'Course length', value: formatDays(trackInfo.days) },
    { label: 'Tuition', value: trackInfo.tuition > 0 ? `$${formatMoney(trackInfo.tuition)}` : 'Free' }
  ];
  metaItems.forEach(item => {
    const dt = document.createElement('dt');
    dt.textContent = item.label;
    meta.appendChild(dt);
    const dd = document.createElement('dd');
    dd.textContent = item.value;
    meta.appendChild(dd);
  });
  track.appendChild(meta);

  const progressWrap = document.createElement('div');
  progressWrap.className = 'study-track__progress-wrap';

  const remaining = document.createElement('span');
  remaining.className = 'study-track__remaining';
  progressWrap.appendChild(remaining);

  const bar = document.createElement('div');
  bar.className = 'study-track__progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('span');
  bar.appendChild(fill);
  progressWrap.appendChild(bar);

  const remainingDays = document.createElement('span');
  remainingDays.className = 'study-track__remaining-days';
  progressWrap.appendChild(remainingDays);
  track.appendChild(progressWrap);

  const note = document.createElement('p');
  note.className = 'study-track__note';
  track.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'hustle-card__actions';
  if (trackInfo.action?.onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = typeof trackInfo.action.label === 'function'
      ? trackInfo.action.label(state)
      : trackInfo.action.label || 'Study';
    button.addEventListener('click', () => trackInfo.action.onClick());
    actions.appendChild(button);
  }
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'ghost';
  details.textContent = 'Details';
  details.addEventListener('click', () => openStudyDetails(trackInfo));
  actions.appendChild(details);
  track.appendChild(actions);

  applyStudyTrackState(track, trackInfo, progress);

  return { track };
}

function openStudyDetails(definition) {
  const body = document.createElement('div');
  body.className = 'study-detail';
  if (definition.description) {
    const intro = document.createElement('p');
    intro.textContent = definition.description;
    body.appendChild(intro);
  }
  body.appendChild(
    createDefinitionSummary('Per-level bonuses', (definition.levels || []).map(level => ({
      label: `Level ${level.level}`,
      value: level.name
    })))
  );
  showSlideOver({ eyebrow: 'Study track', title: definition.name, body });
}

function ensureStudyElements() {
  const doc = document;
  if (!doc) return;

  let refreshed = studyElementsDocument && studyElementsDocument !== doc;

  const syncElement = (key, id) => {
    const current = elements[key];
    if (current && current.ownerDocument === doc && doc.contains(current)) {
      return current;
    }
    const next = doc.getElementById(id);
    if (elements[key] !== next) {
      elements[key] = next;
      refreshed = true;
    }
    return next;
  };

  const trackList = syncElement('studyTrackList', 'study-track-list');
  syncElement('studyQueueList', 'study-queue-list');
  syncElement('studyQueueEta', 'study-queue-eta');
  syncElement('studyQueueCap', 'study-queue-cap');

  if (refreshed) {
    studyUi.clear();
  }

  studyElementsDocument = doc;
}

function renderEducation(definitions) {
  ensureStudyElements();
  const list = elements.studyTrackList;
  if (!list) return;
  list.innerHTML = '';
  studyUi.clear();
  definitions.forEach(def => {
    const { track } = renderStudyTrack(def);
    list.appendChild(track);
    studyUi.set(resolveTrack(def).id, { track });
  });
  renderStudyQueue(definitions);
}

function renderStudyQueue(definitions) {
  ensureStudyElements();
  const queue = elements.studyQueueList;
  if (!queue) return;
  queue.innerHTML = '';
  let totalHours = 0;
  definitions.forEach(def => {
    const info = resolveTrack(def);
    if (!info) return;
    const progress = getKnowledgeProgress(info.id);
    if (!progress.enrolled || progress.completed) return;
    totalHours += info.hoursPerDay;
    const item = document.createElement('li');
    item.textContent = `${info.name} • ${formatHours(info.hoursPerDay)} per day`;
    queue.appendChild(item);
  });
  if (!queue.childElementCount) {
    const empty = document.createElement('li');
    empty.textContent = 'No study queued today.';
    queue.appendChild(empty);
  }
  if (elements.studyQueueEta) {
    elements.studyQueueEta.textContent = `Total ETA: ${formatHours(totalHours)}`;
  }

  if (elements.studyQueueCap) {
    const state = getState();
    const cap = state ? getTimeCap() : 0;
    elements.studyQueueCap.textContent = `Daily cap: ${formatHours(cap)}`;
  }
}

export function renderCardCollections({ hustles, education, assets, upgrades }) {
  renderHustles(hustles);
  renderAssets(assets);
  renderUpgrades(upgrades);
  renderEducation(education);
}

export function updateCard(definition) {
  if (hustleUi.has(definition.id)) {
    updateHustleCard(definition);
    return;
  }
  if (assetUi.has(definition.id)) {
    refreshAssetRow(definition);
    return;
  }
  if (upgradeUi.has(definition.id)) {
    updateUpgradeCard(definition);
    renderUpgradeDock();
    return;
  }
  if (definition.tag?.type === 'study' || KNOWLEDGE_TRACKS[definition.id]) {
    const trackInfo = resolveTrack(definition);
    if (studyUi.has(trackInfo.id)) {
      updateStudyTrack(definition);
    }
  }
}

export function updateAllCards({ hustles, education, assets, upgrades }) {
  hustles.forEach(updateHustleCard);
  assets.forEach(def => updateCard(def));
  upgrades.forEach(updateUpgradeCard);
  education.forEach(def => {
    if (def.tag?.type === 'study' || KNOWLEDGE_TRACKS[def.id]) {
      updateStudyTrack(def);
    }
  });
  renderUpgradeDock();
}

function updateStudyTrack(definition) {
  const info = resolveTrack(definition);
  const ui = studyUi.get(info.id);
  if (!ui) return;
  const state = getState();
  const progress = getKnowledgeProgress(info.id, state);
  applyStudyTrackState(ui.track, info, progress);
}
