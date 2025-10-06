import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { createStat, formatRoi } from './widgets.js';
import {
  createCommitmentTimeline,
  applyDeadlineTone,
  describeDeadlineLabel
} from './commitmentMeters.js';

const DEFAULT_COPY = {
  ready: {
    title: 'Ready to accept',
    description: 'Step 1 • Accept: Claim this contract and move it into your active worklist.'
  },
  upcoming: {
    title: 'Queued for later',
    description: 'These leads unlock with tomorrow\'s refresh. Prep so you can accept quickly.'
  },
  commitments: {
    title: 'In progress',
    description: 'Step 2 • Work: Log hours until everything is complete.'
  }
};

function mergeCopy(base = {}, overrides = {}) {
  return {
    ready: { ...DEFAULT_COPY.ready, ...base.ready, ...overrides.ready },
    upcoming: { ...DEFAULT_COPY.upcoming, ...base.upcoming, ...overrides.upcoming },
    commitments: { ...DEFAULT_COPY.commitments, ...base.commitments, ...overrides.commitments }
  };
}

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

function createCardSection(copy = {}) {
  const section = document.createElement('section');
  section.className = 'browser-card__section';
  if (copy.title) {
    const heading = document.createElement('h3');
    heading.className = 'browser-card__section-title';
    heading.textContent = copy.title;
    section.appendChild(heading);
  }
  if (copy.description) {
    const note = document.createElement('p');
    note.className = 'browser-card__section-note';
    note.textContent = copy.description;
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

function createOfferItem(offer, { upcoming = false } = {}) {
  const item = document.createElement('li');
  item.className = 'browser-card__list-item hustle-card__offer';
  if (!offer.ready || upcoming) {
    item.classList.add('is-upcoming');
  }
  decorateUrgency(item, offer.expiresIn);

  const header = document.createElement('div');
  header.className = 'hustle-card__row';
  const title = document.createElement('span');
  title.className = 'hustle-card__title';
  title.textContent = offer.label || 'Contract offer';
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
  const locked = Boolean(offer.locked);
  const ready = Boolean(offer.ready) && !locked && !upcoming;

  if (ready) {
    button.className = 'browser-card__button browser-card__button--primary';
    button.textContent = offer.acceptLabel || 'Accept offer';
    button.disabled = false;
    if (typeof offer.onAccept === 'function') {
      button.addEventListener('click', () => {
        offer.onAccept();
      });
    }
  } else {
    button.className = 'browser-card__button';
    if (locked) {
      button.textContent = offer.lockedLabel || 'Locked';
      button.disabled = true;
      if (offer.unlockHint) {
        button.title = offer.unlockHint;
      }
    } else {
      const availableIn = Number.isFinite(offer.availableIn) ? offer.availableIn : null;
      const days = availableIn === 1 ? '1 day' : `${availableIn} days`;
      button.textContent = availableIn && availableIn > 0 ? `Opens in ${days}` : 'Upcoming';
      button.disabled = true;
    }
  }
  actions.appendChild(button);

  if (locked && offer.unlockHint) {
    const note = document.createElement('p');
    note.className = 'browser-card__note';
    note.textContent = offer.unlockHint;
    actions.appendChild(note);
  }

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
  const daysRequired = commitment.progress?.daysRequired ?? commitment.daysRequired;
  if (Number.isFinite(daysRequired) && daysRequired > 0) {
    parts.push(`${daysRequired}-day commitment`);
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

export function createActionCard({
  definition = {},
  model = {},
  variant = 'action',
  copy: copyOverrides = {},
  descriptors: descriptorOverrides = {}
} = {}) {
  const descriptorBundle = {
    ...(typeof model.descriptors === 'object' && model.descriptors !== null ? model.descriptors : {}),
    ...(typeof descriptorOverrides === 'object' && descriptorOverrides !== null ? descriptorOverrides : {})
  };
  const copy = mergeCopy(descriptorBundle.copy, copyOverrides);

  const rawOffers = Array.isArray(model.offers) ? model.offers : [];
  const rawUpcoming = Array.isArray(model.upcoming) ? model.upcoming : [];
  const visibleOffers = rawOffers.filter(offer => !offer?.locked);
  const visibleUpcoming = rawUpcoming.filter(offer => !offer?.locked);
  const hasCommitments = Array.isArray(model.commitments) && model.commitments.length > 0;

  const hasAnySource = rawOffers.length > 0 || rawUpcoming.length > 0;
  const hasUnlockedContent = visibleOffers.length > 0 || visibleUpcoming.length > 0;

  if (!hasUnlockedContent && hasAnySource && !hasCommitments) {
    return null;
  }

  const card = document.createElement('article');
  card.className = `browser-card browser-card--action browser-card--${variant}`;
  card.dataset.action = model.id || definition.id || '';
  if (variant === 'hustle') {
    card.dataset.hustle = model.id || definition.id || '';
  }
  card.dataset.search = model.filters?.search || '';
  card.dataset.time = String(model.metrics?.time?.value ?? 0);
  card.dataset.payout = String(model.metrics?.payout?.value ?? 0);
  card.dataset.roi = String(model.metrics?.roi ?? 0);
  card.dataset.available = visibleOffers.length > 0 ? 'true' : 'false';

  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }
  if (model.filters?.category) {
    card.dataset.category = model.filters.category;
  }
  if (model.actionCategory) {
    card.dataset.actionCategory = model.actionCategory;
  }

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = model.name || definition.name || 'Contract';
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

  if (model.seat?.summary) {
    const seat = document.createElement('p');
    seat.className = 'browser-card__note';
    seat.textContent = model.seat.summary;
    card.appendChild(seat);
  }

  if (model.limit?.summary) {
    const limit = document.createElement('p');
    limit.className = 'browser-card__note';
    limit.textContent = model.limit.summary;
    card.appendChild(limit);
  }

  const actions = document.createElement('div');
  actions.className = 'browser-card__actions';
  const hasButton = model.action && model.action.label;
  if (hasButton) {
    const queueButton = document.createElement('button');
    queueButton.type = 'button';
    const variantName = model.action.className === 'secondary' ? 'secondary' : 'primary';
    queueButton.className = `browser-card__button browser-card__button--${variantName}`;
    queueButton.textContent = model.action.label;
    queueButton.disabled = Boolean(model.action.disabled);
    if (typeof model.action?.onClick === 'function') {
      queueButton.addEventListener('click', () => {
        if (queueButton.disabled) return;
        model.action.onClick();
      });
    }
    actions.appendChild(queueButton);
  }

  if (model.action?.guidance) {
    const note = document.createElement('p');
    note.className = 'browser-card__note';
    note.textContent = model.action.guidance;
    actions.appendChild(note);
  }

  if (actions.childElementCount > 0) {
    card.appendChild(actions);
  }

  if (hasCommitments) {
    const commitmentsSection = createCardSection(copy.commitments);
    const list = document.createElement('ul');
    list.className = 'browser-card__list';
    model.commitments.forEach(commitment => {
      const item = createCommitmentItem(commitment);
      list.appendChild(item);
    });
    commitmentsSection.appendChild(list);
    card.appendChild(commitmentsSection);
  }

  if (visibleOffers.length) {
    const offersSection = createCardSection(copy.ready);
    const list = document.createElement('ul');
    list.className = 'browser-card__list';
    visibleOffers.forEach(offer => {
      const item = createOfferItem(offer);
      list.appendChild(item);
    });
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

  if (visibleUpcoming.length) {
    const upcomingSection = createCardSection(copy.upcoming);
    const list = document.createElement('ul');
    list.className = 'browser-card__list';
    visibleUpcoming.forEach(offer => {
      const item = createOfferItem(offer, { upcoming: true });
      list.appendChild(item);
    });
    upcomingSection.appendChild(list);
    card.appendChild(upcomingSection);
  }

  return card;
}

export default {
  createActionCard
};
