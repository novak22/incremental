import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';
import { createStat, formatRoi } from '../components/widgets.js';
import {
  createCommitmentTimeline,
  applyDeadlineTone,
  describeDeadlineLabel
} from '../components/commitmentMeters.js';

function createBadgeList(badges = []) {
  if (!Array.isArray(badges) || !badges.length) {
    return null;
  }
  const list = document.createElement('ul');
  list.className = 'browser-card__badges';
  badges.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    item.className = 'browser-card__badge';
    item.textContent = entry;
    list.appendChild(item);
  });
  return list;
}

function createCardSection(title, description) {
  const section = document.createElement('section');
  section.className = 'browser-card__section';
  if (title) {
    const heading = document.createElement('h3');
    heading.className = 'browser-card__section-title';
    heading.textContent = title;
    section.appendChild(heading);
  }
  if (description) {
    const note = document.createElement('p');
    note.className = 'browser-card__section-note';
    note.textContent = description;
    section.appendChild(note);
  }
  return section;
}

function decorateUrgency(node, remainingDays) {
  if (!node) return;
  const numeric = Number(remainingDays);
  node.classList.toggle('is-critical', Number.isFinite(numeric) && numeric <= 1);
  node.classList.toggle('is-warning', Number.isFinite(numeric) && numeric > 1 && numeric <= 3);
}

function createOfferItem(offer) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__offer';
  if (!offer.ready) {
    item.classList.add('is-upcoming');
  }
  decorateUrgency(item, offer.expiresIn);

  const header = document.createElement('div');
  header.className = 'hustle-card__row';
  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = offer.label || 'Hustle offer';
  header.appendChild(title);

  if (offer.payout) {
    const payout = document.createElement('span');
    payout.className = 'hustle-card__value';
    payout.textContent = `$${formatMoney(offer.payout)}`;
    header.appendChild(payout);
  }
  item.appendChild(header);

  if (offer.description) {
    const summary = document.createElement('p');
    summary.className = 'hustle-card__description';
    summary.textContent = offer.description;
    item.appendChild(summary);
  }

  if (offer.meta) {
    const meta = document.createElement('p');
    meta.className = 'hustle-card__meta';
    meta.textContent = offer.meta;
    item.appendChild(meta);
  }

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = offer.ready
    ? 'browser-card__button browser-card__button--primary'
    : 'browser-card__button';
  button.textContent = offer.ready ? 'Accept offer' : 'Upcoming';
  button.disabled = !offer.ready;
  if (offer.ready && typeof offer.onAccept === 'function') {
    button.addEventListener('click', () => {
      offer.onAccept();
    });
  }
  actions.appendChild(button);
  item.appendChild(actions);

  return item;
}

function describeCommitmentMeta(commitment) {
  const parts = [];
  if (commitment.meta) {
    parts.push(commitment.meta);
  }
  if (commitment.payoutText) {
    parts.push(commitment.payoutText);
  }
  if (commitment.remainingDays != null) {
    parts.push(describeDeadlineLabel(commitment.progress || commitment));
  }
  return parts.filter(Boolean).join(' • ');
}

function createCommitmentItem(commitment) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__commitment';
  applyDeadlineTone(item, commitment.progress || commitment);

  const header = document.createElement('div');
  header.className = 'hustle-card__row';
  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = commitment.label || 'Commitment';
  header.appendChild(title);

  if (commitment.payoutText) {
    const payout = document.createElement('span');
    payout.className = 'hustle-card__value';
    payout.textContent = commitment.payoutText;
    header.appendChild(payout);
  }
  item.appendChild(header);

  if (commitment.description) {
    const summary = document.createElement('p');
    summary.className = 'hustle-card__description';
    summary.textContent = commitment.description;
    item.appendChild(summary);
  }

  const metaText = describeCommitmentMeta(commitment);
  if (metaText) {
    const meta = document.createElement('p');
    meta.className = 'hustle-card__meta';
    meta.textContent = metaText;
    item.appendChild(meta);
  }

  const timeline = createCommitmentTimeline(commitment.progress || commitment);
  if (timeline) {
    item.appendChild(timeline);
  }

  return item;
}

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

  const badges = createBadgeList(model.badges);
  if (badges) {
    card.appendChild(badges);
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

  if (Array.isArray(model.commitments) && model.commitments.length) {
    const commitmentsSection = createCardSection(
      'Active commitments',
      'Track multi-day gigs and keep their payouts on schedule.'
    );
    const list = document.createElement('ul');
    list.className = 'browser-card__list';
    model.commitments.forEach(commitment => {
      const item = createCommitmentItem(commitment);
      list.appendChild(item);
    });
    commitmentsSection.appendChild(list);
    card.appendChild(commitmentsSection);
  }

  if (Array.isArray(model.offers) && model.offers.length) {
    const offersSection = createCardSection(
      'Market offers',
      'Pick the variant that fits your vibe. Upcoming offers unlock soon.'
    );
    const list = document.createElement('ul');
    list.className = 'browser-card__list';
    model.offers.forEach(offer => {
      const item = createOfferItem(offer);
      list.appendChild(item);
    });
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

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
  let commitmentCount = 0;

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    if (model.filters?.available) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
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

  const metaParts = [];
  if (availableCount > 0) {
    metaParts.push(`${availableCount} offer${availableCount === 1 ? '' : 's'} ready`);
  }
  if (commitmentCount > 0) {
    metaParts.push(`${commitmentCount} commitment${commitmentCount === 1 ? '' : 's'} active`);
  }

  return {
    id: page.id,
    meta: metaParts.length ? metaParts.join(' • ') : 'No hustles ready yet'
  };
}
