import elements from '../elements.js';
import { getState } from '../../core/state.js';
import { formatHours, formatMoney } from '../../core/helpers.js';
import {
  describeHustleRequirements,
  getHustleDailyUsage
} from '../../game/hustles.js';
import {
  createBadge,
  createDefinitionSummary,
  emitUIEvent,
  showSlideOver
} from './shared.js';

const hustleUi = new Map();

export function render(definitions = []) {
  const container = elements.hustleList;
  if (!container) return;
  container.innerHTML = '';
  hustleUi.clear();
  (definitions || []).forEach(definition => renderHustleCard(definition, container));
}

export function update(definition) {
  updateHustleCard(definition);
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
