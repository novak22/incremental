import { getHustleControls } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';
import { describeHustleRequirements, getHustleDailyUsage } from '../../../game/hustles/helpers.js';
import { createBadge } from './components/badge.js';
import { createDefinitionSummary } from './components/definitionSummary.js';
import { showSlideOver } from './components/slideOver.js';
import { emitUIEvent } from './utils/events.js';

const hustleUi = new Map();
const hustleModelCache = new Map();

function indexModelsById(list = []) {
  const map = new Map();
  (list ?? []).forEach(model => {
    if (model?.id) {
      map.set(model.id, model);
    }
  });
  return map;
}

export function cacheHustleModels(models, options = {}) {
  const { skipCacheReset = false } = options;
  if (!skipCacheReset) {
    hustleModelCache.clear();
  }

  const list = Array.isArray(models) ? models : [];
  list.forEach(model => {
    if (model?.id) {
      hustleModelCache.set(model.id, model);
    }
  });
}

function renderHustleCard(definition, model, container) {
  if (!definition || !model || !container) return;

  const card = document.createElement('article');
  card.className = 'hustle-card';
  card.dataset.hustle = model.id;
  card.dataset.search = model.filters.search || '';
  card.dataset.time = String(model.metrics.time.value);
  card.dataset.payout = String(model.metrics.payout.value);
  card.dataset.roi = String(model.metrics.roi);
  card.dataset.available = model.available ? 'true' : 'false';
  if (model.filters.limitRemaining !== null && model.filters.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  const header = document.createElement('div');
  header.className = 'hustle-card__header';
  const title = document.createElement('h3');
  title.className = 'hustle-card__title';
  title.textContent = model.name;
  header.appendChild(title);
  const badges = document.createElement('div');
  badges.className = 'badges';
  model.badges.forEach(text => {
    if (!text) return;
    badges.appendChild(createBadge(text));
  });
  header.appendChild(badges);
  card.appendChild(header);

  if (model.description) {
    const summary = document.createElement('p');
    summary.textContent = model.description;
    card.appendChild(summary);
  }

  const meta = document.createElement('div');
  meta.className = 'hustle-card__meta';
  meta.textContent = model.requirements.summary;
  card.appendChild(meta);

  const limitDetail = document.createElement('p');
  limitDetail.className = 'hustle-card__limit';
  if (model.limit?.summary) {
    limitDetail.hidden = false;
    limitDetail.textContent = model.limit.summary;
  } else {
    limitDetail.hidden = true;
  }
  card.appendChild(limitDetail);

  const actions = document.createElement('div');
  actions.className = 'hustle-card__actions';
  let queueButton = null;
  if (definition.action?.onClick && model.action) {
    queueButton = document.createElement('button');
    queueButton.type = 'button';
    queueButton.className = model.action.className || 'primary';
    queueButton.textContent = model.action.label;
    queueButton.disabled = model.action.disabled;
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
}

function updateHustleCard(definition, model) {
  const ui = hustleUi.get(definition.id);
  if (!ui || !model) return;

  const previousAvailability = ui.card.dataset.available;

  ui.card.dataset.time = String(model.metrics.time.value);
  ui.card.dataset.payout = String(model.metrics.payout.value);
  ui.card.dataset.roi = String(model.metrics.roi);
  ui.card.dataset.available = model.available ? 'true' : 'false';

  if (model.filters.limitRemaining !== null && model.filters.limitRemaining !== undefined) {
    ui.card.dataset.limitRemaining = String(model.filters.limitRemaining);
  } else {
    delete ui.card.dataset.limitRemaining;
  }

  if (ui.queueButton && model.action) {
    ui.queueButton.className = model.action.className || 'primary';
    ui.queueButton.disabled = model.action.disabled;
    ui.queueButton.textContent = model.action.label;
  }

  if (ui.limitDetail) {
    if (model.limit?.summary) {
      ui.limitDetail.hidden = false;
      ui.limitDetail.textContent = model.limit.summary;
    } else {
      ui.limitDetail.hidden = true;
      ui.limitDetail.textContent = '';
    }
  }

  const availabilityChanged = previousAvailability !== ui.card.dataset.available;
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

export function renderHustles(definitions = [], hustleModels = []) {
  const { hustleList } = getHustleControls() || {};
  const container = hustleList;
  if (!container) return;

  container.innerHTML = '';
  hustleUi.clear();
  cacheHustleModels(hustleModels, { skipCacheReset: true });

  const modelMap = indexModelsById(hustleModels);
  definitions.forEach(definition => {
    const model = modelMap.get(definition.id) || hustleModelCache.get(definition.id);
    if (!model) return;
    hustleModelCache.set(definition.id, model);
    renderHustleCard(definition, model, container);
  });
}

export function updateHustles(definitions = [], hustleModels = []) {
  const modelMap = indexModelsById(hustleModels);
  definitions.forEach(definition => {
    const model = modelMap.get(definition.id) || hustleModelCache.get(definition.id);
    if (!model) return;
    hustleModelCache.set(definition.id, model);
    updateHustleCard(definition, model);
  });
}

export function tryUpdateHustleCard(definition) {
  if (!definition?.id || !hustleUi.has(definition.id)) {
    return false;
  }

  const model = hustleModelCache.get(definition.id);
  if (!model) {
    return false;
  }

  updateHustleCard(definition, model);
  return true;
}
