import elements from './elements.js';
import { getAssetState, getState } from '../core/state.js';
import { formatDays, formatHours, formatMoney } from '../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../game/hustles.js';
import { describeRequirement, getDefinitionRequirements, KNOWLEDGE_TRACKS, KNOWLEDGE_REWARDS, getKnowledgeProgress } from '../game/requirements.js';
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
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../game/assets/niches.js';
import {
  getPendingEquipmentUpgrades,
  getUpgradeButtonLabel,
  isUpgradeDisabled
} from './assetUpgrades.js';
import {
  canPerformQualityAction,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityNextRequirements,
  getQualityTracks,
  getNextQualityLevel,
  getInstanceQualityRange,
  performQualityAction
} from '../game/assets/quality.js';
import { getSkillDefinition, normalizeSkillList } from '../game/skills/data.js';

const hustleUi = new Map();
const assetUi = new Map();
const upgradeUi = new Map();
const upgradeSections = new Map();
const upgradeLaneItems = new Map();
const studyUi = new Map();
let currentUpgradeDefinitions = [];

const UPGRADE_CATEGORY_ORDER = ['tech', 'house', 'infra', 'support', 'misc'];

const UPGRADE_CATEGORY_COPY = {
  tech: {
    label: 'Tech',
    title: 'Tech gear & gadgets',
    note: 'Outfit your digital arsenal with rigs, cameras, and clever workflows.'
  },
  house: {
    label: 'House',
    title: 'House & studio',
    note: 'Shape the spaces that keep shoots smooth and edits comfy.'
  },
  infra: {
    label: 'Infra',
    title: 'Infrastructure',
    note: 'Scale the back-end brains that keep products humming worldwide.'
  },
  support: {
    label: 'Support',
    title: 'Support boosts',
    note: 'Quick pick-me-ups and helpers that keep momentum rolling.'
  },
  misc: {
    label: 'Special',
    title: 'Special upgrades',
    note: 'One-off perks that refuse to stay in neat boxes.'
  }
};

const UPGRADE_FAMILY_COPY = {
  general: {
    label: 'Highlights',
    note: 'Curated upgrades that don’t mind sharing space.'
  },
  phone: {
    label: 'Phone line',
    note: 'Capture crisp mobile footage and stay responsive on the go.'
  },
  pc: {
    label: 'PC rigs',
    note: 'Crunch renders, spreadsheets, and creative suites without sweat.'
  },
  monitor_hub: {
    label: 'Monitor hubs',
    note: 'Dock displays and fan out fresh screen real estate.'
  },
  monitor: {
    label: 'Monitors',
    note: 'Stack extra displays for editing bays and dashboards.'
  },
  storage: {
    label: 'Storage & scratch',
    note: 'Keep footage safe and project files lightning fast.'
  },
  camera: {
    label: 'Camera gear',
    note: 'Level up lenses and rigs so every frame looks cinematic.'
  },
  lighting: {
    label: 'Lighting rigs',
    note: 'Bathe shoots in flattering glow and zero fuss shadows.'
  },
  audio: {
    label: 'Audio gear',
    note: 'Capture buttery vocals and clean ambient sound.'
  },
  internet: {
    label: 'Internet plans',
    note: 'Feed uploads and live drops with consistent bandwidth.'
  },
  ergonomics: {
    label: 'Ergonomics',
    note: 'Keep posture happy while the hustle runs long hours.'
  },
  power_backup: {
    label: 'Power backup',
    note: 'Ride through outages without missing a milestone.'
  },
  studio: {
    label: 'Studio spaces',
    note: 'Build sets and stages tailored to your next shoot.'
  },
  workflow: {
    label: 'Workflow suites',
    note: 'Coordinate publishing calendars and creative rituals.'
  },
  automation: {
    label: 'Automation',
    note: 'Let bots and partners handle the repetitive hustle.'
  },
  cloud_compute: {
    label: 'Cloud compute',
    note: 'Provision serious horsepower for software launches.'
  },
  edge_network: {
    label: 'Edge network',
    note: 'Beam snappy responses worldwide with low-latency magic.'
  },
  commerce_network: {
    label: 'Commerce alliances',
    note: 'Bundle storefronts, partners, and licensing deals into one push.'
  },
  consumable: {
    label: 'Daily boosts',
    note: 'Single-day treats that top up focus right when you need it.'
  }
};

const ASSET_GROUP_NOTES = {
  Foundation: 'Reliable launchpads that get your empire compounding.',
  Creative: 'Audience magnets that thrive on storytelling and flair.',
  Commerce: 'Automation loops that keep the checkout bell ringing.',
  Tech: 'Systems and platforms with bigger upkeep but massive reach.'
};
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
      if (row.value instanceof Node) {
        value.appendChild(row.value);
      } else {
        value.textContent = row.value;
      }
      value.className = 'definition-list__value';
      item.appendChild(value);
    }
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

function buildSkillRewards(trackId) {
  const reward = KNOWLEDGE_REWARDS[trackId];
  if (!reward) {
    return { xp: 0, skills: [] };
  }
  const xp = Number.isFinite(Number(reward.baseXp)) ? Number(reward.baseXp) : 0;
  const normalized = normalizeSkillList(reward.skills);
  const skills = normalized.map(entry => {
    const definition = getSkillDefinition(entry.id);
    return {
      id: entry.id,
      name: definition?.name || entry.id,
      weight: Number(entry.weight) || 0
    };
  });
  return { xp, skills };
}

function describeSkillWeight(weight = 0) {
  if (weight >= 0.75) return 'Signature focus';
  if (weight >= 0.5) return 'Core boost';
  if (weight >= 0.3) return 'Supporting practice';
  return 'Quick primer';
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

  // Requirements column
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

  // Roadmap / stats column
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

  // Quality column
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
  if (!definition || !instance) return null;
  const summaries = getAssignableNicheSummaries(definition);
  if (!summaries.length) return null;

  const container = document.createElement('div');
  container.className = 'asset-detail__niche-selector';

  const label = document.createElement('label');
  label.className = 'asset-detail__niche-label';
  const selectId = `asset-niche-${instance.id}`;
  label.setAttribute('for', selectId);
  label.textContent = 'Target niche';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'asset-detail__niche-dropdown';
  select.id = selectId;
  select.name = selectId;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Unassigned';
  select.appendChild(placeholder);

  summaries.forEach(entry => {
    if (!entry?.definition) return;
    const option = document.createElement('option');
    option.value = entry.definition.id;
    const labelParts = [entry.definition.name];
    if (entry.popularity?.label) {
      labelParts.push(entry.popularity.label);
    }
    option.textContent = labelParts.join(' • ');
    select.appendChild(option);
  });

  const currentValue = typeof instance.nicheId === 'string' ? instance.nicheId : '';
  select.value = currentValue && Array.from(select.options).some(opt => opt.value === currentValue)
    ? currentValue
    : '';

  const hint = document.createElement('p');
  hint.className = 'asset-detail__niche-note';

  function updateHint(selectedId) {
    const match = summaries.find(entry => entry?.definition?.id === selectedId) || null;
    if (!match || !match.popularity) {
      hint.textContent = 'Choose a niche to tap into daily popularity rerolls.';
      return;
    }
    const multiplier = Number(match.popularity.multiplier);
    let percentLabel = '±0%';
    if (Number.isFinite(multiplier)) {
      const percent = Math.round((multiplier - 1) * 100);
      const sign = percent > 0 ? '+' : '';
      percentLabel = `${sign}${percent}%`;
    }
    const summary = match.popularity.summary || 'Demand shifts update daily.';
    hint.textContent = `${summary} • Payout impact ${percentLabel}`;
  }

  updateHint(select.value || '');

  select.addEventListener('change', event => {
    const nextValue = event.target.value;
    assignInstanceToNiche(definition.id, instance.id, nextValue || null);
    updateHint(nextValue || '');
  });

  container.appendChild(select);
  container.appendChild(hint);

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
    const timeEstimate = getUpgradeTimeEstimate(upgrade);
    const baseLabel = getUpgradeButtonLabel(upgrade);
    button.textContent = timeEstimate > 0 ? `${baseLabel} (${formatHours(timeEstimate)})` : baseLabel;
    button.disabled = isUpgradeDisabled(upgrade);
    if (upgrade.description) {
      const timeLabel = timeEstimate > 0 ? ` • ≈${formatHours(timeEstimate)} install` : '';
      button.title = `${upgrade.description}${timeLabel}`;
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

function createAssetMetric(label) {
  const item = document.createElement('div');
  item.className = 'asset-card__metric';
  const metricLabel = document.createElement('span');
  metricLabel.className = 'asset-card__metric-label';
  metricLabel.textContent = label;
  const metricValue = document.createElement('span');
  metricValue.className = 'asset-card__metric-value';
  item.append(metricLabel, metricValue);
  return { item, value: metricValue };
}

function selectNextAssetUpgrade(definition, state = getState()) {
  const pending = getPendingEquipmentUpgrades(definition, state);
  if (!pending.length) return null;
  const scored = pending.map(upgrade => {
    const snapshot = getUpgradeSnapshot(upgrade, state);
    let score = 3;
    if (snapshot.ready) {
      score = 0;
    } else if (!snapshot.purchased && snapshot.affordable && !snapshot.disabled) {
      score = 1;
    } else if (!snapshot.purchased) {
      score = 2;
    }
    return { upgrade, snapshot, score };
  });
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.snapshot.cost !== b.snapshot.cost) return a.snapshot.cost - b.snapshot.cost;
    const aName = a.upgrade.name || a.upgrade.id;
    const bName = b.upgrade.name || b.upgrade.id;
    return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
  });
  return scored[0];
}

function updateAssetUpgradeShortcut(definition, ui, state = getState()) {
  if (!ui?.upgradeButton) return;
  const selection = selectNextAssetUpgrade(definition, state);
  ui.nextUpgrade = selection;
  if (!selection?.upgrade) {
    ui.upgradeButton.disabled = true;
    ui.upgradeButton.dataset.state = 'empty';
    ui.upgradeButton.title = 'No upgrades queued for this asset yet.';
    ui.upgradeButton.setAttribute('aria-label', 'No upgrades available');
    return;
  }

  const { upgrade, snapshot } = selection;
  const status = describeUpgradeStatus(snapshot);
  ui.upgradeButton.disabled = !snapshot.ready;
  ui.upgradeButton.dataset.state = snapshot.ready ? 'ready' : 'locked';
  ui.upgradeButton.title = `${upgrade.name} • ${status}`;
  ui.upgradeButton.setAttribute(
    'aria-label',
    snapshot.ready ? `Install ${upgrade.name}` : `${upgrade.name} (${status})`
  );
}

function renderAssetCard(definition, container) {
  const state = getState();
  const assetState = getAssetState(definition.id, state);
  const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
  const activeInstances = instances.filter(instance => instance.status === 'active');
  const pausedInstances = instances.filter(instance => instance.status !== 'active');
  const lastIncome = activeInstances.reduce((total, instance) => total + Number(instance.lastIncome || 0), 0);
  const upkeepCost = Number(definition.maintenance?.cost) || 0;
  const upkeepHours = Number(definition.maintenance?.hours) || 0;

  const card = document.createElement('article');
  card.className = 'asset-card';
  card.dataset.asset = definition.id;
  card.dataset.group = getAssetGroupId(definition);
  card.dataset.state = activeInstances.length > 0 ? 'active' : 'idle';
  card.dataset.needsMaintenance = activeInstances.some(instance => !instance.maintenanceFundedToday)
    ? 'true'
    : 'false';
  card.dataset.risk = definition.tag?.type === 'advanced' ? 'high' : 'medium';
  card.dataset.selected = 'false';
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;

  const header = document.createElement('header');
  header.className = 'asset-card__header';
  const badge = document.createElement('span');
  badge.className = 'asset-card__badge';
  header.appendChild(badge);

  const heading = document.createElement('div');
  heading.className = 'asset-card__heading';
  const title = document.createElement('h3');
  title.className = 'asset-card__title';
  title.textContent = definition.name;
  heading.appendChild(title);
  const tagLabel = document.createElement('span');
  tagLabel.className = 'asset-card__tag';
  tagLabel.textContent = getAssetGroupLabel(definition);
  heading.appendChild(tagLabel);
  header.appendChild(heading);
  card.appendChild(header);

  const summaryCopy = describeAssetCardSummary(definition);
  if (summaryCopy) {
    const summary = document.createElement('p');
    summary.className = 'asset-card__summary';
    summary.textContent = summaryCopy;
    card.appendChild(summary);
  }

  const metrics = document.createElement('div');
  metrics.className = 'asset-card__metrics';
  const statusMetric = createAssetMetric('Status');
  const incomeMetric = createAssetMetric('Daily haul');
  const upkeepMetric = createAssetMetric('Upkeep');
  const riskMetric = createAssetMetric('Risk');
  metrics.append(statusMetric.item, incomeMetric.item, upkeepMetric.item, riskMetric.item);
  card.appendChild(metrics);

  const perkHighlight = document.createElement('div');
  perkHighlight.className = 'asset-card__perk';
  const perkText = definition.boosts || definition.unlocks || '';
  if (perkText) {
    perkHighlight.textContent = perkText;
    card.appendChild(perkHighlight);
  } else {
    perkHighlight.hidden = true;
    card.appendChild(perkHighlight);
  }

  const footer = document.createElement('footer');
  footer.className = 'asset-card__footer';
  const primaryActions = document.createElement('div');
  primaryActions.className = 'asset-card__primary-actions';
  const secondaryActions = document.createElement('div');
  secondaryActions.className = 'asset-card__secondary-actions';

  const upgradeButton = document.createElement('button');
  upgradeButton.type = 'button';
  upgradeButton.className = 'asset-card__upgrade';
  upgradeButton.innerHTML = '<span aria-hidden="true">⇧</span>';
  upgradeButton.title = 'Next upgrade';
  upgradeButton.setAttribute('aria-label', 'Next upgrade');
  upgradeButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const entry = assetUi.get(definition.id);
    const selection = entry?.nextUpgrade;
    if (!selection?.upgrade) return;
    if (selection.snapshot.ready && typeof selection.upgrade.action?.onClick === 'function') {
      selection.upgrade.action.onClick();
      return;
    }
    openAssetDetails(definition);
  });
  secondaryActions.appendChild(upgradeButton);

  const buildsButton = document.createElement('button');
  buildsButton.type = 'button';
  buildsButton.className = 'ghost asset-card__action';
  buildsButton.textContent = 'Builds';
  buildsButton.setAttribute('aria-expanded', 'false');
  buildsButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleAssetBuilds(definition);
  });
  secondaryActions.appendChild(buildsButton);

  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'ghost asset-card__action';
  detailsButton.textContent = 'Details';
  detailsButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openAssetDetails(definition);
  });
  secondaryActions.appendChild(detailsButton);

  let primaryButton = null;
  if (definition.action?.onClick) {
    primaryButton = document.createElement('button');
    primaryButton.type = 'button';
    primaryButton.className = 'primary';
    primaryButton.textContent = typeof definition.action.label === 'function'
      ? definition.action.label(state)
      : definition.action.label || 'Launch';
    primaryButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (primaryButton.disabled) return;
      definition.action.onClick();
    });
    primaryActions.appendChild(primaryButton);
  }

  if (primaryActions.childElementCount) {
    footer.appendChild(primaryActions);
  }
  footer.appendChild(secondaryActions);
  card.appendChild(footer);

  card.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    openAssetDetails(definition);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target === card) {
      event.preventDefault();
      openAssetDetails(definition);
    }
  });

  container.appendChild(card);

  const entry = {
    card,
    badge,
    metrics: {
      status: statusMetric.value,
      income: incomeMetric.value,
      upkeep: upkeepMetric.value,
      risk: riskMetric.value
    },
    perkHighlight,
    buildsButton,
    upgradeButton,
    detailsButton,
    primary: primaryButton,
    nextUpgrade: null
  };

  assetUi.set(definition.id, entry);
  refreshAssetRow(definition);
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
  ui.card.dataset.state = activeInstances.length > 0 ? 'active' : 'idle';
  ui.card.dataset.needsMaintenance = activeInstances.some(instance => !instance.maintenanceFundedToday)
    ? 'true'
    : 'false';
  const risk = ui.card.dataset.risk === 'high' ? 'High' : 'Moderate';

  if (ui.badge) {
    if (activeInstances.length) {
      ui.badge.textContent = `${activeInstances.length} active`;
    } else if (pausedInstances.length) {
      ui.badge.textContent = `${pausedInstances.length} paused`;
    } else {
      ui.badge.textContent = 'Not launched';
    }
  }

  if (ui.metrics?.status) {
    if (activeInstances.length) {
      const pausedNote = pausedInstances.length ? ` • ${pausedInstances.length} paused` : '';
      ui.metrics.status.textContent = `${activeInstances.length} active${pausedNote}`;
    } else if (pausedInstances.length) {
      ui.metrics.status.textContent = `${pausedInstances.length} paused`;
    } else {
      ui.metrics.status.textContent = 'Launch to start earning';
    }
  }

  if (ui.metrics?.income) {
    ui.metrics.income.textContent = activeInstances.length
      ? `$${formatMoney(Math.max(0, lastIncome))} yesterday`
      : 'No earnings yet';
  }

  if (ui.metrics?.upkeep) {
    const upkeepCost = Number(definition.maintenance?.cost) || 0;
    const upkeepHours = Number(definition.maintenance?.hours) || 0;
    const upkeepParts = [];
    if (upkeepCost > 0) upkeepParts.push(`$${formatMoney(upkeepCost)}`);
    if (upkeepHours > 0) upkeepParts.push(`${formatHours(upkeepHours)}`);
    ui.metrics.upkeep.textContent = upkeepParts.join(' • ') || 'None';
  }

  if (ui.metrics?.risk) {
    ui.metrics.risk.textContent = risk;
  }

  if (ui.perkHighlight) {
    const perkText = definition.boosts || definition.unlocks || '';
    if (perkText) {
      ui.perkHighlight.hidden = false;
      ui.perkHighlight.textContent = perkText;
    } else {
      ui.perkHighlight.hidden = true;
      ui.perkHighlight.textContent = '';
    }
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

  if (ui.buildsButton) {
    const expanded = expandedAssetId === definition.id;
    ui.buildsButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    ui.buildsButton.textContent = expanded ? 'Hide builds' : 'Builds';
  }

  updateAssetUpgradeShortcut(definition, ui, state);
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
  const state = getState();
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
  if (!ui?.card) return;
  const state = getState();
  expandedAssetId = definition.id;
  ui.card.dataset.selected = 'true';
  ui.card.classList.add('is-selected');
  if (ui.buildsButton) {
    ui.buildsButton.textContent = 'Hide builds';
    ui.buildsButton.setAttribute('aria-expanded', 'true');
  }
  renderLaunchedBuilds(definition, state);
}

function collapseAssetBuilds(assetId, { silent = false } = {}) {
  if (!assetId) return;
  const ui = assetUi.get(assetId);
  if (ui?.card) {
    ui.card.dataset.selected = 'false';
    ui.card.classList.remove('is-selected');
  }
  if (ui?.buildsButton) {
    ui.buildsButton.textContent = 'Builds';
    ui.buildsButton.setAttribute('aria-expanded', 'false');
  }
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
    empty.textContent = 'No asset selected yet. Tap a card to review its build roster.';
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

function buildAssetGroups(definitions = []) {
  const groups = new Map();
  definitions.forEach(definition => {
    const id = getAssetGroupId(definition);
    const label = getAssetGroupLabel(definition);
    if (!groups.has(id)) {
      groups.set(id, { id, label, note: getAssetGroupNote(label), definitions: [] });
    }
    groups.get(id).definitions.push(definition);
  });
  return Array.from(groups.values());
}

function renderAssets(definitions) {
  const gallery = elements.assetGallery;
  if (!gallery) return;
  if (expandedAssetId) {
    collapseAssetBuilds(expandedAssetId);
  }
  gallery.innerHTML = '';
  assetUi.clear();
  expandedAssetId = null;

  const groups = buildAssetGroups(definitions);
  if (!groups.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-gallery__empty';
    empty.textContent = 'No passive assets discovered yet. Story beats will unlock them soon.';
    gallery.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'asset-group';
    section.dataset.group = group.id;

    const header = document.createElement('header');
    header.className = 'asset-group__header';
    const heading = document.createElement('div');
    heading.className = 'asset-group__heading';
    const title = document.createElement('h3');
    title.className = 'asset-group__title';
    title.textContent = `${group.label} assets`;
    heading.appendChild(title);
    if (group.note) {
      const note = document.createElement('p');
      note.className = 'asset-group__note';
      note.textContent = group.note;
      heading.appendChild(note);
    }
    header.appendChild(heading);
    const count = document.createElement('span');
    count.className = 'asset-group__count';
    count.textContent = `${group.definitions.length} asset${group.definitions.length === 1 ? '' : 's'}`;
    header.appendChild(count);

    const grid = document.createElement('div');
    grid.className = 'asset-group__grid';
    grid.setAttribute('role', 'list');
    group.definitions.forEach(def => renderAssetCard(def, grid));

    section.append(header, grid);
    fragment.appendChild(section);
  });

  gallery.appendChild(fragment);
}

function formatLabelFromKey(id, fallback = 'Special') {
  if (!id) return fallback;
  return (
    id
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, match => match.toUpperCase())
      .trim() || fallback
  );
}

function getUpgradeCategory(definition) {
  return definition?.category || 'misc';
}

function getUpgradeFamily(definition) {
  return definition?.family || 'general';
}

function getCategoryCopy(id) {
  if (UPGRADE_CATEGORY_COPY[id]) {
    return UPGRADE_CATEGORY_COPY[id];
  }
  const label = formatLabelFromKey(id, 'Special');
  return {
    label,
    title: `${label} upgrades`,
    note: 'Specialized boosters that defy tidy labels.'
  };
}

function getFamilyCopy(id) {
  if (!id) {
    return UPGRADE_FAMILY_COPY.general;
  }
  if (UPGRADE_FAMILY_COPY[id]) {
    return UPGRADE_FAMILY_COPY[id];
  }
  return {
    label: formatLabelFromKey(id, 'Highlights'),
    note: 'Specialized enhancements for this progression lane.'
  };
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

function getUpgradeSnapshot(definition, state = getState()) {
  const upgradeState = state?.upgrades?.[definition.id] || {};
  const cost = Number(definition.cost) || 0;
  const money = Number(state?.money) || 0;
  const affordable = cost <= 0 || money >= cost;
  const disabled = isUpgradeDisabled(definition);
  const purchased = Boolean(upgradeState.purchased);
  const ready = !purchased && affordable && !disabled;
  return {
    cost,
    affordable,
    disabled,
    name: definition.name || definition.id,
    purchased,
    ready
  };
}

function describeUpgradeStatus({ purchased, ready, affordable, disabled }) {
  if (purchased) return 'Owned and active';
  if (ready) return 'Ready to launch';
  if (disabled) return 'Requires prerequisites';
  if (!affordable) return 'Save up to unlock';
  return 'Progress for this soon';
}

function sortUpgradesForCategory(definitions, state = getState()) {
  return definitions
    .slice()
    .sort((a, b) => {
      const aSnapshot = getUpgradeSnapshot(a, state);
      const bSnapshot = getUpgradeSnapshot(b, state);

      const score = snapshot => {
        if (snapshot.ready) return 0;
        if (!snapshot.purchased && snapshot.affordable) return 1;
        if (!snapshot.purchased) return 2;
        return 3;
      };

      const scoreDiff = score(aSnapshot) - score(bSnapshot);
      if (scoreDiff !== 0) return scoreDiff;

      if (aSnapshot.cost !== bSnapshot.cost) {
        return aSnapshot.cost - bSnapshot.cost;
      }

      return aSnapshot.name.localeCompare(bSnapshot.name);
    });
}

function buildUpgradeCategories(definitions) {
  const grouped = new Map();
  definitions.forEach(definition => {
    const categoryId = getUpgradeCategory(definition);
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, new Map());
    }
    const families = grouped.get(categoryId);
    const familyId = getUpgradeFamily(definition);
    if (!families.has(familyId)) {
      families.set(familyId, []);
    }
    families.get(familyId).push(definition);
  });

  const seen = new Set();
  const orderedKeys = [
    ...UPGRADE_CATEGORY_ORDER,
    ...Array.from(grouped.keys()).filter(key => !UPGRADE_CATEGORY_ORDER.includes(key))
  ];

  return orderedKeys
    .filter(key => {
      if (seen.has(key) || !grouped.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(id => {
      const families = Array.from(grouped.get(id)?.entries() || []).map(([familyId, defs]) => ({
        id: familyId,
        copy: getFamilyCopy(familyId),
        definitions: defs
      }));
      families.sort((a, b) => a.copy.label.localeCompare(b.copy.label, undefined, { sensitivity: 'base' }));
      const total = families.reduce((sum, family) => sum + family.definitions.length, 0);
      return {
        id,
        copy: getCategoryCopy(id),
        families,
        total
      };
    });
}

function scrollUpgradeLaneIntoView(categoryId) {
  if (!categoryId) return;

  if (categoryId === 'all') {
    const container = elements.upgradeList;
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

function renderUpgradeLaneMap(categories) {
  const list = elements.upgradeLaneList;
  if (!list) return;

  list.innerHTML = '';
  upgradeLaneItems.clear();

  const lanes = [
    {
      id: 'all',
      copy: {
        label: 'All lanes',
        note: 'Browse every upgrade in one sweep.'
      }
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
    upgradeLaneItems.set(lane.id, { item, count, ready, owned });
  });

  if (!list.childElementCount) {
    const empty = document.createElement('li');
    empty.className = 'upgrade-rail__empty';
    empty.textContent = 'Discover upgrades to populate this map.';
    list.appendChild(empty);
    return;
  }

  updateUpgradeLaneMap();
}

function updateUpgradeLaneMap() {
  if (!upgradeLaneItems.size) return;
  const state = getState();
  if (!state) return;

  upgradeLaneItems.forEach((entry, categoryId) => {
    if (!entry) return;
    const definitions = categoryId === 'all'
      ? currentUpgradeDefinitions
      : currentUpgradeDefinitions.filter(def => getUpgradeCategory(def) === categoryId);

    const total = definitions.length;
    let readyCount = 0;
    let ownedCount = 0;

    definitions.forEach(definition => {
      const snapshot = getUpgradeSnapshot(definition, state);
      if (snapshot.ready) readyCount += 1;
      if (snapshot.purchased) ownedCount += 1;
    });

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

function emitUIEvent(name) {
  if (typeof document?.createEvent === 'function') {
    const event = document.createEvent('Event');
    event.initEvent(name, true, true);
    document.dispatchEvent(event);
    return;
  }
  if (typeof Event === 'function') {
    document.dispatchEvent(new Event(name));
  }
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

function renderUpgradeOverview(definitions) {
  const overview = elements.upgradeOverview;
  if (!overview?.container) return;
  const state = getState();
  if (!state) return;

  const stats = definitions.reduce(
    (acc, definition) => {
      const snapshot = getUpgradeSnapshot(definition, state);
      if (snapshot.purchased) acc.purchased += 1;
      if (snapshot.ready) acc.ready += 1;
      acc.total += 1;
      return acc;
    },
    { purchased: 0, ready: 0, total: 0 }
  );

  overview.purchased.textContent = `${stats.purchased}/${stats.total}`;
  overview.ready.textContent = String(stats.ready);
  if (overview.note) {
    overview.note.textContent = describeOverviewNote(stats);
  }
}

export function refreshUpgradeSections() {
  const emptyNote = elements.upgradeEmpty;
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

  updateUpgradeLaneMap();
}

document.addEventListener('upgrades:filtered', () => {
  refreshUpgradeSections();
});

function renderUpgradeCard(definition, container, categoryId, familyId = 'general') {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'upgrade-card';
  card.dataset.upgrade = definition.id;
  card.dataset.category = categoryId;
  card.dataset.family = familyId;
  const searchPieces = [definition.name, definition.description, definition.tag?.label]
    .filter(Boolean)
    .join(' ');
  card.dataset.search = searchPieces.toLowerCase();
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
  upgradeUi.set(definition.id, {
    card,
    buyButton,
    status,
    price,
    updateDetails: details?.update,
    extra
  });
  updateUpgradeCard(definition);
}

function updateUpgradeCard(definition) {
  const ui = upgradeUi.get(definition.id);
  if (!ui) return;
  const state = getState();
  const snapshot = getUpgradeSnapshot(definition, state);

  ui.card.dataset.affordable = snapshot.affordable ? 'true' : 'false';
  ui.card.dataset.purchased = snapshot.purchased ? 'true' : 'false';
  ui.card.dataset.ready = snapshot.ready ? 'true' : 'false';

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

function renderUpgrades(definitions) {
  const list = elements.upgradeList;
  if (!list) return;
  list.tabIndex = -1;
  currentUpgradeDefinitions = Array.isArray(definitions) ? [...definitions] : [];
  list.innerHTML = '';
  upgradeUi.clear();
  upgradeSections.clear();

  const categories = buildUpgradeCategories(definitions);
  renderUpgradeLaneMap(categories);

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
    eyebrow.textContent = category.copy.label;
    const title = document.createElement('h3');
    title.textContent = category.copy.title;
    const note = document.createElement('p');
    note.textContent = category.copy.note;
    headingGroup.append(eyebrow, title, note);

    const count = document.createElement('span');
    count.className = 'upgrade-section__count';
    header.append(headingGroup, count);
    section.appendChild(header);

    const familiesContainer = document.createElement('div');
    familiesContainer.className = 'upgrade-section__families';
    const families = category.families.length ? category.families : [{ id: 'general', copy: getFamilyCopy('general'), definitions: [] }];
    families.forEach(family => {
      const familyArticle = document.createElement('article');
      familyArticle.className = 'upgrade-family';
      familyArticle.dataset.category = category.id;
      familyArticle.dataset.family = family.id;

      const familyHeader = document.createElement('header');
      familyHeader.className = 'upgrade-family__header';
      const familyTitle = document.createElement('h4');
      familyTitle.textContent = family.copy.label;
      const familyCount = document.createElement('span');
      familyCount.className = 'upgrade-family__count';
      familyHeader.append(familyTitle, familyCount);
      familyArticle.appendChild(familyHeader);

      if (family.copy.note) {
        const familyNote = document.createElement('p');
        familyNote.className = 'upgrade-family__note';
        familyNote.textContent = family.copy.note;
        familyArticle.appendChild(familyNote);
      }

      const familyList = document.createElement('div');
      familyList.className = 'upgrade-family__list';
      const sorted = sortUpgradesForCategory(family.definitions);
      sorted.forEach(def => renderUpgradeCard(def, familyList, category.id, family.id));
      familyArticle.appendChild(familyList);

      const familyEmpty = document.createElement('p');
      familyEmpty.className = 'upgrade-family__empty';
      familyEmpty.textContent = 'No upgrades discovered yet in this family.';
      familyEmpty.hidden = sorted.length > 0;
      familyArticle.appendChild(familyEmpty);

      familiesContainer.appendChild(familyArticle);
      upgradeSections.set(`${category.id}:${family.id}`, {
        section: familyArticle,
        list: familyList,
        count: familyCount,
        emptyMessage: familyEmpty
      });
    });
    section.appendChild(familiesContainer);

    const empty = document.createElement('p');
    empty.className = 'upgrade-section__empty';
    empty.textContent = 'Nothing matches this lane yet. Progress other goals or adjust filters.';
    empty.hidden = true;
    section.appendChild(empty);

    fragment.appendChild(section);
    upgradeSections.set(category.id, { section, list: familiesContainer, count, emptyMessage: empty });
  });

  list.appendChild(fragment);
  renderUpgradeOverview(currentUpgradeDefinitions);
  renderUpgradeDock();
  refreshUpgradeSections();
}

function renderUpgradeDock() {
  const dock = elements.upgradeDockList;
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
      action: null,
      skillXp: 0,
      skills: []
    };
  }

  const canonicalId = definition.studyTrackId || definition.id;
  const canonical = KNOWLEDGE_TRACKS[canonicalId];
  const skillRewards = buildSkillRewards(canonical?.id || canonicalId);

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
    action: definition.action,
    skillXp: skillRewards.xp,
    skills: skillRewards.skills
  };
}

function formatStudyCountdown(trackInfo, progress) {
  if (progress.completed) {
    return 'Diploma earned';
  }

  const totalDays = Math.max(0, Number(progress.totalDays ?? trackInfo.days ?? 0));
  if (!progress.enrolled) {
    return `${formatDays(totalDays || trackInfo.days)}`;
  }

  const completedDays = Math.max(0, Math.min(totalDays, Number(progress.daysCompleted) || 0));
  const remainingDays = Math.max(0, totalDays - completedDays);
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

  const totalDays = Math.max(0, Number(progress.totalDays ?? trackInfo.days ?? 0));
  const completedDays = progress.completed
    ? totalDays
    : Math.max(0, Math.min(totalDays, Number(progress.daysCompleted) || 0));
  const remainingDays = Math.max(0, totalDays - completedDays);
  const percent = Math.min(
    100,
    Math.max(0, Math.round((totalDays === 0 ? (progress.completed ? 1 : 0) : completedDays / totalDays) * 100))
  );
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
    const totalLabel = totalDays || trackInfo.days;
    remaining.textContent = `${completedDays}/${totalLabel} days complete`;
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

  if (trackInfo.skills.length) {
    const skills = document.createElement('section');
    skills.className = 'study-track__skills';

    const heading = document.createElement('h4');
    heading.className = 'study-track__skills-heading';
    heading.textContent = 'Skill rewards';
    skills.appendChild(heading);

    if (trackInfo.skillXp > 0) {
      const xpNote = document.createElement('p');
      xpNote.className = 'study-track__skills-note';
      xpNote.textContent = `Graduates collect +${trackInfo.skillXp} XP across these disciplines.`;
      skills.appendChild(xpNote);
    }

    const list = document.createElement('ul');
    list.className = 'study-track__skills-list';
    trackInfo.skills.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'study-track__skills-item';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      item.appendChild(name);
      const note = document.createElement('span');
      note.textContent = describeSkillWeight(entry.weight);
      item.appendChild(note);
      list.appendChild(item);
    });
    skills.appendChild(list);
    track.appendChild(skills);
  }

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
    if (!currentUpgradeDefinitions.length) {
      currentUpgradeDefinitions = [definition];
    }
    renderUpgradeOverview(currentUpgradeDefinitions);
    refreshUpgradeSections();
    emitUIEvent('upgrades:state-updated');
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
  if (!currentUpgradeDefinitions.length && Array.isArray(upgrades)) {
    currentUpgradeDefinitions = [...upgrades];
  }
  renderUpgradeOverview(currentUpgradeDefinitions.length ? currentUpgradeDefinitions : upgrades);
  renderUpgradeDock();
  refreshUpgradeSections();
  emitUIEvent('upgrades:state-updated');
}

function updateStudyTrack(definition) {
  const info = resolveTrack(definition);
  const ui = studyUi.get(info.id);
  if (!ui) return;
  const state = getState();
  const progress = getKnowledgeProgress(info.id, state);
  applyStudyTrackState(ui.track, info, progress);
}
