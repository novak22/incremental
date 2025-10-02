import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';
import { createStat, formatRoi } from '../components/widgets.js';

function createHustleCard(definition, model) {
  const card = document.createElement('article');
  card.className = 'browser-card browser-card--hustle';
  card.dataset.hustle = model.id;
  card.dataset.search = model.filters?.search || '';
  card.dataset.time = String(model.metrics?.time?.value ?? 0);
  card.dataset.payout = String(model.metrics?.payout?.value ?? 0);
  card.dataset.roi = String(model.metrics?.roi ?? 0);
  card.dataset.available = model.filters?.available ? 'true' : 'false';
  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = model.name;
  header.appendChild(title);
  card.appendChild(header);

  if (model.description) {
    const summary = document.createElement('p');
    summary.className = 'browser-card__summary';
    summary.textContent = model.description;
    card.appendChild(summary);
  }

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats';
  const payoutValue = model.metrics?.payout?.value ?? 0;
  const payoutLabel = model.metrics?.payout?.label
    || (payoutValue > 0 ? `$${formatMoney(payoutValue)}` : 'Varies');
  stats.append(
    createStat('Time', model.metrics?.time?.label || formatHours(model.metrics?.time?.value ?? 0)),
    createStat('Payout', payoutLabel),
    createStat('ROI', formatRoi(model.metrics?.roi))
  );
  card.appendChild(stats);

  const meta = document.createElement('p');
  meta.className = 'browser-card__meta';
  meta.textContent = model.requirements?.summary || 'No requirements';
  card.appendChild(meta);

  if (model.limit?.summary) {
    const limit = document.createElement('p');
    limit.className = 'browser-card__note';
    limit.textContent = model.limit.summary;
    card.appendChild(limit);
  }

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';
  if (definition.action && model.action?.label) {
    const queueButton = document.createElement('button');
    queueButton.type = 'button';
    queueButton.className = 'browser-card__button browser-card__button--primary';
    queueButton.textContent = model.action.label;
    queueButton.disabled = Boolean(model.action.disabled);
    queueButton.addEventListener('click', () => {
      if (queueButton.disabled) return;
      definition.action.onClick?.();
    });
    actions.appendChild(queueButton);
  }
  card.appendChild(actions);

  return card;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="browser-hustle-list"]')) {
      const list = document.createElement('div');
      list.className = 'browser-card-grid';
      list.dataset.role = 'browser-hustle-list';
      body.appendChild(list);
    }
  });
  if (!refs) return null;

  const list = refs.body.querySelector('[data-role="browser-hustle-list"]');
  if (!list) return null;
  list.innerHTML = '';

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    if (model.filters?.available) {
      availableCount += 1;
    }

    const card = createHustleCard(definition, model);
    list.appendChild(card);
  });

  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue a hustle to see it spotlighted here.';
    list.appendChild(empty);
  }

  return {
    id: page.id,
    meta: availableCount > 0 ? `${availableCount} hustle${availableCount === 1 ? '' : 's'} ready` : 'No hustles ready yet'
  };
}
