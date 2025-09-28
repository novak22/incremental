import elements from './elements.js';
import {
  getAssetDefinition,
  getAssetState,
  getState,
  getUpgradeDefinition,
  getUpgradeState
} from '../core/state.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { attachQualityPanel, focusQualityInstance, updateQualityPanel } from './quality.js';
import { getDailyIncomeRange, instanceLabel } from '../game/assets/helpers.js';
import {
  canPerformQualityAction,
  getQualityActions,
  getQualityLevel,
  getQualityNextRequirements,
  getQualityTracks,
  performQualityAction
} from '../game/assets/quality.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../game/requirements.js';
import {
  calculateInstanceNetHourly,
  describeInstance,
  describeInstanceNetHourly,
  enableAssetInstanceList
} from './assetInstances.js';
import { configureCategoryView, updateCategoryView } from './assetCategoryView.js';

const ASSET_CATEGORY_KEYS = {
  foundation: 'foundation',
  creative: 'creative',
  commerce: 'commerce',
  advanced: 'advanced'
};

const UPGRADE_GROUPS = {
  assistant: 'automation',
  course: 'automation',
  camera: 'equipment',
  studio: 'equipment',
  coffee: 'consumables'
};

const assetModalState = {
  definitions: [],
  initialized: false,
  activeId: null,
  activeInstanceId: null,
  origin: null,
  mode: 'definition'
};

export function renderCardCollections({ hustles, education, assets, upgrades }) {
  renderCollection(hustles, elements.hustleGrid);
  renderCollection(education, elements.educationGrid);
  renderAssetCollections(assets);
  renderUpgradeCollections(upgrades);
}

export function updateCard(definition) {
  if (!definition.ui) return;
  const state = getState();
  for (const detail of definition.ui.details) {
    if (typeof detail.render === 'function') {
      detail.element.innerHTML = detail.render(state);
    }
  }
  if (definition.action && definition.ui.button) {
    const label = typeof definition.action.label === 'function' ? definition.action.label(state) : definition.action.label;
    definition.ui.button.textContent = label;
    const disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    definition.ui.button.disabled = disabled;
    definition.ui.card.classList.toggle('unavailable', disabled);
  }
  if (typeof definition.cardState === 'function') {
    definition.cardState(state, definition.ui.card);
  }
  if (definition.ui?.extra?.assetStats) {
    updateAssetSummary(definition, state);
  }
  if (typeof definition.update === 'function') {
    definition.update(state, definition.ui);
  }
  if (definition.quality && definition.ui?.extra?.quality) {
    updateQualityPanel(definition, definition.ui.extra.quality);
  }
}

export function updateAllCards({ hustles, education, assets, upgrades }) {
  for (const definition of hustles) {
    updateCard(definition);
  }
  for (const definition of education) {
    updateCard(definition);
  }
  for (const definition of assets) {
    updateCard(definition);
  }
  for (const definition of upgrades) {
    updateCard(definition);
  }
  updateCategoryView();
}

function renderAssetCollections(definitions) {
  if (!elements.assetCategoryGrids) return;
  for (const container of Object.values(elements.assetCategoryGrids)) {
    if (container) container.innerHTML = '';
  }

  const seen = new Set();
  const uniqueDefinitions = [];
  const definitionsByCategory = new Map();

  for (const definition of definitions) {
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    uniqueDefinitions.push(definition);
    const categoryKey = normalizeCategory(definition.tag?.label);
    if (!definitionsByCategory.has(categoryKey)) {
      definitionsByCategory.set(categoryKey, []);
    }
    definitionsByCategory.get(categoryKey).push(definition);
    const container = elements.assetCategoryGrids[categoryKey] || elements.assetGridRoot;
    if (!container) continue;
    enableAssetInstanceList(definition);
    createAssetCard(definition, container, { category: categoryKey });
  }

  assetModalState.definitions = uniqueDefinitions;
  initAssetInfoModal();
  updateAssetInfoTrigger();
  configureCategoryView({ definitionsByCategory, openInstanceDetails: openAssetInstanceInfo });
}

function renderUpgradeCollections(definitions) {
  if (!elements.upgradeGroupGrids) return;
  for (const container of Object.values(elements.upgradeGroupGrids)) {
    if (container) container.innerHTML = '';
  }

  for (const definition of definitions) {
    const groupKey = UPGRADE_GROUPS[definition.id] || 'misc';
    const container = elements.upgradeGroupGrids[groupKey] || elements.upgradeGrid;
    if (!container) continue;
    createCard(definition, container, { group: groupKey });
  }
}

function renderCollection(definitions, container) {
  if (!container) return;
  container.innerHTML = '';
  for (const def of definitions) {
    createCard(def, container);
  }
}

function createAssetCard(definition, container, metadata = {}) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'card asset-card';
  card.id = `${definition.id}-card`;
  if (Array.isArray(definition.initialClasses)) {
    for (const cls of definition.initialClasses) {
      card.classList.add(cls);
    }
  }
  if (metadata.category) {
    card.dataset.category = metadata.category;
  }

  const header = document.createElement('div');
  header.className = 'asset-card__header';

  const heading = document.createElement('div');
  heading.className = 'asset-card__heading';
  const title = document.createElement('h3');
  title.textContent = definition.name;
  heading.appendChild(title);
  if (definition.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = `tag ${definition.tag.type || ''}`.trim();
    tagEl.textContent = definition.tag.label;
    heading.appendChild(tagEl);
  }
  header.appendChild(heading);

  const briefingButton = document.createElement('button');
  briefingButton.type = 'button';
  briefingButton.className = 'asset-card__briefing ghost-button';
  briefingButton.textContent = 'Briefing';
  briefingButton.addEventListener('click', () => openAssetInfo(definition, briefingButton));
  header.appendChild(briefingButton);

  card.appendChild(header);

  if (definition.description) {
    const blurb = document.createElement('p');
    blurb.className = 'asset-card__tagline';
    blurb.textContent = definition.description;
    card.appendChild(blurb);
  }

  const stats = document.createElement('div');
  stats.className = 'asset-card__stats';
  const ownedStat = createAssetStat('Launches Online');
  const payoutStat = createAssetStat('Last Payout');
  const rangeStat = createAssetStat('Daily Potential');
  const upkeepStat = createAssetStat('Upkeep');
  stats.append(ownedStat.element, payoutStat.element, rangeStat.element, upkeepStat.element);
  card.appendChild(stats);

  const actions = document.createElement('div');
  actions.className = 'asset-card__actions';

  let button = null;
  if (definition.action) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = definition.action.className || 'primary';
    const label = typeof definition.action.label === 'function' ? definition.action.label(state) : definition.action.label;
    button.textContent = label;
    const disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    button.disabled = disabled;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      definition.action.onClick();
    });
    card.classList.toggle('unavailable', disabled);
    actions.appendChild(button);
  }

  let qualityButton = null;
  if (definition.quality) {
    qualityButton = document.createElement('button');
    qualityButton.type = 'button';
    qualityButton.className = 'secondary';
    qualityButton.textContent = 'Upgrade Quality';
    actions.appendChild(qualityButton);
  }

  if (actions.childElementCount) {
    card.appendChild(actions);
  }

  const instancesContainer = document.createElement('div');
  instancesContainer.className = 'asset-card__instances';
  const instancesHeader = document.createElement('div');
  instancesHeader.className = 'asset-card__instances-header';
  const instancesTitle = document.createElement('h4');
  instancesTitle.textContent = 'Live Builds';
  instancesHeader.appendChild(instancesTitle);
  const instancesCount = document.createElement('span');
  instancesCount.className = 'asset-card__instances-count';
  instancesHeader.appendChild(instancesCount);
  instancesContainer.appendChild(instancesHeader);
  const instancesBody = document.createElement('div');
  instancesBody.className = 'asset-card__instances-body';
  instancesContainer.appendChild(instancesBody);
  card.appendChild(instancesContainer);

  let extra = typeof definition.extraContent === 'function' ? definition.extraContent(card, state) || {} : {};
  if (extra.instanceList) {
    instancesBody.appendChild(extra.instanceList);
  }

  let qualityPanelState = null;
  let qualitySection = null;
  if (definition.quality) {
    qualityPanelState = attachQualityPanel(card, definition);
    if (qualityPanelState?.panel) {
      qualitySection = document.createElement('div');
      qualitySection.className = 'asset-card__quality';
      qualitySection.dataset.expanded = 'false';
      qualitySection.hidden = true;
      qualitySection.appendChild(qualityPanelState.panel);
      card.appendChild(qualitySection);
    }
  }

  let qualityExpanded = false;
  const toggleQuality = (force = null) => {
    if (!qualitySection) return;
    if (force === true) {
      qualityExpanded = true;
    } else if (force === false) {
      qualityExpanded = false;
    } else {
      qualityExpanded = !qualityExpanded;
    }
    qualitySection.dataset.expanded = qualityExpanded ? 'true' : 'false';
    qualitySection.hidden = !qualityExpanded;
    if (qualityButton) {
      qualityButton.textContent = qualityExpanded ? 'Hide Quality Actions' : 'Upgrade Quality';
    }
  };

  if (qualityButton) {
    qualityButton.addEventListener('click', () => toggleQuality());
  }

  const openQuality = instanceId => {
    toggleQuality(true);
    if (qualityPanelState) {
      focusQualityInstance(qualityPanelState, instanceId);
    }
  };

  const extras = {
    ...extra,
    assetStats: {
      ownedValue: ownedStat.value,
      ownedNote: ownedStat.note,
      payoutValue: payoutStat.value,
      payoutNote: payoutStat.note,
      rangeValue: rangeStat.value,
      rangeNote: rangeStat.note,
      upkeepValue: upkeepStat.value,
      upkeepNote: upkeepStat.note
    },
    assetDetails: getAssetDetailRenderers(definition),
    instancesCount
  };

  if (qualityPanelState) {
    extras.openQuality = openQuality;
    extras.toggleQuality = toggleQuality;
    extras.quality = qualityPanelState;
  }

  container.appendChild(card);
  definition.ui = {
    card,
    button,
    details: [],
    extra: extras
  };

  updateAssetSummary(definition, state);
  if (definition.quality && definition.ui.extra?.quality) {
    updateQualityPanel(definition, definition.ui.extra.quality);
  }
}

function createCard(definition, container, metadata = {}) {
  const state = getState();
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `${definition.id}-card`;
  if (Array.isArray(definition.initialClasses)) {
    for (const cls of definition.initialClasses) {
      card.classList.add(cls);
    }
  }
  if (metadata.category) {
    card.dataset.category = metadata.category;
  }
  if (metadata.group) {
    card.dataset.group = metadata.group;
  }

  const header = document.createElement('div');
  header.className = 'card-header';
  const title = document.createElement('h3');
  title.textContent = definition.name;
  header.appendChild(title);
  if (definition.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = `tag ${definition.tag.type || ''}`.trim();
    tagEl.textContent = definition.tag.label;
    header.appendChild(tagEl);
  }
  card.appendChild(header);

  if (definition.description) {
    const description = document.createElement('p');
    description.textContent = definition.description;
    card.appendChild(description);
  }

  const detailEntries = [];
  if (definition.details && definition.details.length) {
    const list = document.createElement('ul');
    list.className = 'details';
    for (const detail of definition.details) {
      const li = document.createElement('li');
      li.innerHTML = typeof detail === 'function' ? detail(state) : detail;
      list.appendChild(li);
      detailEntries.push({ render: detail, element: li });
    }
    card.appendChild(list);
  }

  let button = null;
  if (definition.action) {
    button = document.createElement('button');
    button.className = definition.action.className || 'primary';
    const label = typeof definition.action.label === 'function' ? definition.action.label(state) : definition.action.label;
    button.textContent = label;
    const disabled = typeof definition.action.disabled === 'function'
      ? definition.action.disabled(state)
      : !!definition.action.disabled;
    button.disabled = disabled;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      definition.action.onClick();
    });
    card.classList.toggle('unavailable', disabled);
    card.appendChild(button);
  }

  let extra = typeof definition.extraContent === 'function' ? definition.extraContent(card, state) || {} : {};
  if (definition.quality) {
    const qualityUI = attachQualityPanel(card, definition);
    extra = { ...extra, quality: qualityUI };
  }

  container.appendChild(card);
  definition.ui = {
    card,
    button,
    details: detailEntries,
    extra
  };
  if (definition.quality && definition.ui.extra?.quality) {
    updateQualityPanel(definition, definition.ui.extra.quality);
  }
}

function createAssetStat(label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'asset-stat';
  const labelEl = document.createElement('span');
  labelEl.className = 'asset-stat__label';
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'asset-stat__value';
  const noteEl = document.createElement('span');
  noteEl.className = 'asset-stat__note';
  noteEl.hidden = true;
  wrapper.append(labelEl, valueEl, noteEl);
  return { element: wrapper, value: valueEl, note: noteEl };
}

function updateAssetSummary(definition, state = getState()) {
  const stats = definition.ui?.extra?.assetStats;
  if (!stats) return;

  const assetState = getAssetState(definition.id, state);
  const instances = assetState?.instances || [];
  const activeInstances = instances.filter(instance => instance.status === 'active');
  const setupInstances = instances.length - activeInstances.length;

  stats.ownedValue.textContent = instances.length ? `${instances.length} launched` : 'None yet';
  const ownedParts = [];
  if (activeInstances.length) ownedParts.push(`${activeInstances.length} active`);
  if (setupInstances > 0) ownedParts.push(`${setupInstances} in prep`);
  setStatNote(stats.ownedNote, ownedParts.join(' · '));

  if (definition.ui.extra?.instancesCount) {
    const countPieces = [`${activeInstances.length} active`];
    if (setupInstances > 0) {
      countPieces.push(`${setupInstances} prep`);
    }
    countPieces.push(`${instances.length} total`);
    definition.ui.extra.instancesCount.textContent = countPieces.join(' · ');
  }

  const totalPayout = activeInstances.reduce((sum, instance) => sum + Math.max(0, Number(instance.lastIncome) || 0), 0);
  if (totalPayout > 0) {
    stats.payoutValue.textContent = `$${formatMoney(totalPayout)}`;
    const average = activeInstances.length ? Math.round(totalPayout / activeInstances.length) : 0;
    setStatNote(stats.payoutNote, activeInstances.length ? `Avg $${formatMoney(Math.max(0, average))} per active build` : '');
  } else {
    stats.payoutValue.textContent = '$0';
    setStatNote(
      stats.payoutNote,
      activeInstances.length ? 'No payout yesterday' : 'Launch a build to start earnings'
    );
  }

  const incomeRange = getDailyIncomeRange(definition);
  const minDaily = Math.max(0, Math.round(incomeRange.min || 0));
  const maxDaily = Math.max(minDaily, Math.round(incomeRange.max || 0));
  stats.rangeValue.textContent = `$${formatMoney(minDaily)} - $${formatMoney(maxDaily)}`;
  setStatNote(stats.rangeNote, definition.quality ? 'Scales with quality actions' : 'Fixed yield');

  const upkeepParts = [];
  const upkeepHours = Number(definition.maintenance?.hours) || 0;
  const upkeepCost = Number(definition.maintenance?.cost) || 0;
  if (upkeepHours > 0) upkeepParts.push(`${formatHours(upkeepHours)}/day`);
  if (upkeepCost > 0) upkeepParts.push(`$${formatMoney(upkeepCost)}/day`);
  stats.upkeepValue.textContent = upkeepParts.length ? upkeepParts.join(' + ') : 'None';
  setStatNote(stats.upkeepNote, formatAssetSetup(definition));

  if (assetModalState.activeId === definition.id) {
    populateAssetInfoModal(definition);
  }
}

function formatAssetSetup(definition) {
  const days = Number(definition.setup?.days) || 0;
  const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
  const cost = Number(definition.setup?.cost) || 0;
  const parts = [];

  if (days > 1 && hoursPerDay > 0) {
    parts.push(`${days} days · ${formatHours(hoursPerDay)}/day`);
  } else if (days > 1) {
    parts.push(`${days} days to launch`);
  } else if (hoursPerDay > 0) {
    parts.push(`${formatHours(hoursPerDay)} to launch`);
  }

  if (cost > 0) {
    parts.push(`$${formatMoney(cost)} upfront`);
  }

  return parts.join(' · ');
}

function setStatNote(element, text) {
  if (!element) return;
  if (text) {
    element.textContent = text;
    element.hidden = false;
  } else {
    element.textContent = '';
    element.hidden = true;
  }
}

function getAssetDetailRenderers(definition) {
  if (!Array.isArray(definition.details)) return [];
  return definition.details.filter(Boolean);
}

function initAssetInfoModal() {
  if (assetModalState.initialized) return;
  const modal = elements.assetInfoModal;
  if (!modal) return;
  assetModalState.initialized = true;

  if (elements.assetInfoClose) {
    elements.assetInfoClose.addEventListener('click', closeAssetInfo);
  }

  modal.addEventListener('click', event => {
    const target = event.target;
    if (target === modal || target?.dataset?.modalClose !== undefined) {
      closeAssetInfo();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && elements.assetInfoModal?.classList.contains('is-visible')) {
      closeAssetInfo();
    }
  });
}

function updateAssetInfoTrigger() {
  const trigger = elements.assetInfoTrigger;
  if (!trigger) return;
  const available = assetModalState.definitions.length > 0;
  trigger.disabled = !available;
  trigger.hidden = !available;
  if (!available) return;

  if (!trigger.__assetInfoBound) {
    trigger.addEventListener('click', () => {
      const targetDefinition = getPrimaryAssetForTrigger();
      if (targetDefinition) {
        openAssetInfo(targetDefinition, trigger);
      }
    });
    trigger.__assetInfoBound = true;
  }

  const primary = getPrimaryAssetForTrigger();
  if (primary) {
    trigger.setAttribute('aria-label', `Open briefing for ${primary.name}`);
  }
}

function getPrimaryAssetForTrigger() {
  const state = getState();
  for (const definition of assetModalState.definitions) {
    const assetState = getAssetState(definition.id, state);
    if (!assetState?.instances?.length) {
      return definition;
    }
  }
  return assetModalState.definitions[0] || null;
}

function openAssetInfo(definition, originButton = null) {
  if (!definition) return;
  initAssetInfoModal();
  const modal = elements.assetInfoModal;
  if (!modal) return;

  assetModalState.activeId = definition.id;
  assetModalState.activeInstanceId = null;
  assetModalState.origin = originButton || null;
  assetModalState.mode = 'definition';

  populateAssetInfoModal(definition);

  modal.classList.add('is-visible');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  elements.assetInfoClose?.focus();
}

function openAssetInstanceInfo(definition, instance, originButton = null) {
  if (!definition || !instance) return;
  initAssetInfoModal();
  const modal = elements.assetInfoModal;
  if (!modal) return;

  assetModalState.activeId = definition.id;
  assetModalState.activeInstanceId = instance.id;
  assetModalState.origin = originButton || null;
  assetModalState.mode = 'instance';

  populateAssetInfoModal(definition);

  modal.classList.add('is-visible');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  elements.assetInfoClose?.focus();
}

function closeAssetInfo() {
  const modal = elements.assetInfoModal;
  if (!modal || !modal.classList.contains('is-visible')) return;
  modal.classList.remove('is-visible');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  const origin = assetModalState.origin;
  assetModalState.origin = null;
  assetModalState.activeId = null;
  assetModalState.activeInstanceId = null;
  assetModalState.mode = 'definition';
  if (origin && typeof origin.focus === 'function') {
    origin.focus();
  }
}

function populateAssetInfoModal(definition) {
  if (!definition) return;
  const mode = assetModalState.mode === 'instance' ? 'instance' : 'definition';
  if (mode === 'instance') {
    populateInstanceDetails(definition);
  } else {
    populateDefinitionDetails(definition);
  }
}

function populateDefinitionDetails(definition) {
  const title = elements.assetInfoTitle;
  const description = elements.assetInfoDescription;
  const definitionSection = elements.assetInfoDefinition;
  const instanceSection = elements.assetInfoInstance;
  const eyebrow = elements.assetInfoEyebrow;

  if (eyebrow) {
    eyebrow.textContent = 'New Asset Briefing';
  }

  if (definitionSection) {
    definitionSection.hidden = false;
  }
  if (instanceSection) {
    instanceSection.hidden = true;
  }

  if (title) {
    title.textContent = definition.name || 'Asset';
  }

  if (description) {
    const text = definition.description || '';
    description.textContent = text;
    description.hidden = text.length === 0;
  }

  renderDefinitionDetails(definition);
}

function populateInstanceDetails(definition) {
  const assetState = getAssetState(definition.id);
  const instances = assetState?.instances || [];
  const instanceId = assetModalState.activeInstanceId;
  const instance = instances.find(item => item.id === instanceId);
  const definitionSection = elements.assetInfoDefinition;
  const instanceSection = elements.assetInfoInstance;
  const title = elements.assetInfoTitle;
  const description = elements.assetInfoDescription;
  const eyebrow = elements.assetInfoEyebrow;

  if (!instance) {
    assetModalState.mode = 'definition';
    assetModalState.activeInstanceId = null;
    populateDefinitionDetails(definition);
    return;
  }

  if (definitionSection) {
    definitionSection.hidden = false;
  }
  if (instanceSection) {
    instanceSection.hidden = false;
  }
  if (eyebrow) {
    eyebrow.textContent = 'Asset Instance Overview';
  }

  const index = instances.findIndex(item => item.id === instanceId);
  if (title) {
    title.textContent = instanceLabel(definition, Math.max(0, index));
  }

  if (description) {
    const text = definition.description || '';
    description.textContent = text;
    description.hidden = text.length === 0;
  }

  if (elements.assetInfoInstanceStatus) {
    elements.assetInfoInstanceStatus.textContent = describeInstance(definition, instance);
  }
  if (elements.assetInfoInstanceQuality) {
    elements.assetInfoInstanceQuality.textContent = describeInstanceQuality(definition, instance);
  }
  if (elements.assetInfoInstanceUpkeep) {
    elements.assetInfoInstanceUpkeep.textContent = formatInstanceUpkeep(definition);
  }
  if (elements.assetInfoInstancePayout) {
    elements.assetInfoInstancePayout.textContent = formatInstancePayout(instance);
  }
  if (elements.assetInfoInstanceRoi) {
    const roiElement = elements.assetInfoInstanceRoi;
    const netHourly = calculateInstanceNetHourly(definition, instance);
    roiElement.textContent = describeInstanceNetHourly(definition, instance);
    roiElement.classList.toggle('is-positive', typeof netHourly === 'number' && netHourly > 0);
    roiElement.classList.toggle('is-negative', typeof netHourly === 'number' && netHourly < 0);
  }

  populateUpgradeLists(definition, instance);
}

function renderDefinitionDetails(definition) {
  const detailsList = elements.assetInfoDetails;
  if (!detailsList) return;
  detailsList.innerHTML = '';
  const renderers = getAssetDetailRenderers(definition);
  const currentState = getState();
  let populated = false;
  for (const detail of renderers) {
    const markup = typeof detail === 'function' ? detail(currentState) : detail;
    if (!markup) continue;
    const li = document.createElement('li');
    li.innerHTML = markup;
    detailsList.appendChild(li);
    populated = true;
  }
  if (!populated) {
    const li = document.createElement('li');
    li.className = 'modal__details-empty';
    li.textContent = 'No additional details yet. Launch one to generate stats!';
    detailsList.appendChild(li);
  }
}

function describeInstanceQuality(definition, instance) {
  if (instance.status !== 'active') {
    return 'Launch pending';
  }
  const level = Number(instance.quality?.level) || 0;
  const levelDef = getQualityLevel(definition, level);
  const title = levelDef?.name ? ` · ${levelDef.name}` : '';
  return `Level ${level}${title}`;
}

function formatInstanceUpkeep(definition) {
  const hours = Number(definition.maintenance?.hours) || 0;
  const cost = Number(definition.maintenance?.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return parts.length ? parts.join(' + ') : 'None';
}

function formatInstancePayout(instance) {
  if (instance.status !== 'active') {
    return 'Waiting for launch';
  }
  const lastIncome = Math.max(0, Number(instance.lastIncome) || 0);
  if (lastIncome > 0) {
    return `$${formatMoney(lastIncome)} yesterday`;
  }
  return 'No payout yesterday';
}

function populateUpgradeLists(definition, instance) {
  renderQualityProgress(definition, instance);
  renderQualityActions(definition, instance);
  renderSupportingUpgrades(definition);
}

function renderQualityProgress(definition, instance) {
  const list = elements.assetInfoQualityProgress;
  if (!list) return;
  list.innerHTML = '';

  if (!instance) {
    appendModalEmpty(list, 'Select an asset build to review progress.');
    return;
  }

  if (instance.status !== 'active') {
    appendModalEmpty(list, 'Setup in progress — quality work unlocks after launch.');
    return;
  }

  const qualityLevel = Number(instance.quality?.level) || 0;
  const levelDef = getQualityLevel(definition, qualityLevel);
  const levelItem = document.createElement('li');
  const levelTitle = levelDef?.name ? ` — ${levelDef.name}` : '';
  levelItem.innerHTML = `⭐ <strong>Quality ${qualityLevel}</strong>${levelTitle}`;
  list.appendChild(levelItem);

  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};
  const nextRequirements = getQualityNextRequirements(definition, qualityLevel);
  const hasTracks = Object.keys(tracks || {}).length > 0;
  let populated = false;

  if (hasTracks) {
    Object.entries(tracks).forEach(([key, track]) => {
      const current = Number(progress[key]) || 0;
      const target = Number(nextRequirements?.[key]) || 0;
      const li = document.createElement('li');
      if (target > 0) {
        const complete = current >= target;
        const icon = complete ? '✅' : '📈';
        li.innerHTML = `${icon} <strong>${track.label || key}</strong> — ${current} / ${target}`;
      } else {
        li.innerHTML = `📈 <strong>${track.label || key}</strong> — ${current}`;
      }
      list.appendChild(li);
      populated = true;
    });
  }

  if (!populated) {
    appendModalEmpty(list, 'No quality tracks configured for this asset.');
  } else if (!nextRequirements || Object.keys(nextRequirements).length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '🎉 <strong>Max quality reached!</strong>';
    list.appendChild(li);
  }
}

function renderQualityActions(definition, instance) {
  const container = elements.assetInfoQualityActions;
  if (!container) return;
  container.innerHTML = '';

  if (!instance || instance.status !== 'active') {
    const note = document.createElement('p');
    note.className = 'quality-action__none';
    note.textContent = 'Quality actions will appear after this build launches.';
    container.appendChild(note);
    return;
  }

  const actions = getQualityActions(definition);
  const state = getState();
  if (!actions.length) {
    const note = document.createElement('p');
    note.className = 'quality-action__none';
    note.textContent = 'No quality actions configured for this asset.';
    container.appendChild(note);
    return;
  }

  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quality-action';
    const details = [];
    if (action.time) {
      details.push(`⏳ ${formatHours(action.time)}`);
    }
    if (action.cost) {
      details.push(`💵 $${formatMoney(action.cost)}`);
    }
    const suffix = details.length ? ` (${details.join(' · ')})` : '';
    button.textContent = `${action.label}${suffix}`;
    button.disabled = !canPerformQualityAction(definition, instance, action, state);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      performQualityAction(definition.id, instance.id, action.id);
    });
    container.appendChild(button);
  });
}

function renderSupportingUpgrades(definition) {
  const list = elements.assetInfoSupportUpgrades;
  if (!list) return;
  list.innerHTML = '';

  const requirements = Array.isArray(definition.requirements) ? definition.requirements : [];
  if (!requirements.length) {
    appendModalEmpty(list, 'No supporting upgrades required.');
    return;
  }

  let populated = false;
  requirements.forEach(requirement => {
    const entry = createRequirementEntry(definition, requirement);
    if (!entry) return;
    list.appendChild(entry);
    populated = true;
  });

  if (!populated) {
    appendModalEmpty(list, 'No supporting upgrades required.');
  }
}

function createRequirementEntry(definition, requirement) {
  switch (requirement?.type) {
    case 'equipment':
      return createEquipmentEntry(requirement.id);
    case 'knowledge':
      return createKnowledgeEntry(requirement.id);
    case 'experience':
      return createExperienceEntry(requirement);
    default:
      return null;
  }
}

function createEquipmentEntry(upgradeId) {
  const upgrade = getUpgradeDefinition(upgradeId);
  const state = getState();
  const upgradeState = getUpgradeState(upgradeId, state);
  const owned = isUpgradeOwned(upgradeState);
  const li = document.createElement('li');
  const label = upgrade?.name || upgradeId;
  const badge = owned ? '✅' : '🔒';
  const note = owned ? describeOwnedUpgrade(upgradeState) : 'Not purchased yet';
  const text = document.createElement('span');
  text.innerHTML = `${badge} <strong>${label}</strong>${note ? ` — ${note}` : ''}`;
  li.appendChild(text);

  if (!owned && upgrade?.action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quality-action';
    const labelText = typeof upgrade.action.label === 'function'
      ? upgrade.action.label(state)
      : upgrade.action.label;
    button.textContent = labelText || 'Purchase';
    const disabled = typeof upgrade.action.disabled === 'function'
      ? upgrade.action.disabled(state)
      : Boolean(upgrade.action.disabled);
    button.disabled = disabled;
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      upgrade.action.onClick();
    });
    li.appendChild(button);
  }

  return li;
}

function createKnowledgeEntry(knowledgeId) {
  const track = KNOWLEDGE_TRACKS[knowledgeId];
  const progress = getKnowledgeProgress(knowledgeId);
  const li = document.createElement('li');
  const icon = progress.completed ? '✅' : progress.studiedToday ? '📗' : '📘';
  const label = track?.name || knowledgeId;
  const detail = track
    ? `${progress.daysCompleted}/${track.days} days · ${formatHours(track.hoursPerDay)}/day`
    : `${progress.daysCompleted} days completed`;
  li.innerHTML = `${icon} <strong>${label}</strong> — ${detail}`;
  return li;
}

function createExperienceEntry(requirement) {
  const targetId = requirement?.assetId;
  if (!targetId) return null;
  const targetDefinition = getAssetDefinition(targetId);
  const assetState = getAssetState(targetId);
  const activeCount = (assetState?.instances || []).filter(instance => instance.status === 'active').length;
  const targetCount = Number(requirement.count) || 0;
  const icon = activeCount >= targetCount ? '✅' : '🏆';
  const label = targetDefinition?.singular || targetDefinition?.name || targetId;
  const li = document.createElement('li');
  li.innerHTML = `${icon} <strong>${targetCount} ${label}${targetCount === 1 ? '' : 's'}</strong> — Have ${activeCount}`;
  return li;
}

function appendModalEmpty(listElement, text) {
  if (!listElement) return;
  const li = document.createElement('li');
  li.className = 'modal__details-empty';
  li.textContent = text;
  listElement.appendChild(li);
}

function isUpgradeOwned(upgradeState = {}) {
  if (typeof upgradeState.purchased === 'boolean') {
    return upgradeState.purchased;
  }
  if (typeof upgradeState.count === 'number') {
    return upgradeState.count > 0;
  }
  if (typeof upgradeState.level === 'number') {
    return upgradeState.level > 0;
  }
  return false;
}

function describeOwnedUpgrade(upgradeState = {}) {
  if (typeof upgradeState.count === 'number' && upgradeState.count > 0) {
    return `${upgradeState.count} on staff`;
  }
  if (typeof upgradeState.level === 'number' && upgradeState.level > 0) {
    return `Level ${upgradeState.level}`;
  }
  if (typeof upgradeState.purchased === 'boolean' && upgradeState.purchased) {
    return 'Purchased';
  }
  return '';
}

function normalizeCategory(label = '') {
  const key = label.toLowerCase();
  if (ASSET_CATEGORY_KEYS[key]) {
    return ASSET_CATEGORY_KEYS[key];
  }
  if (key === 'knowledge') {
    return 'creative';
  }
  return 'foundation';
}
