import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { getPageByType } from '../pageLookup.js';
import { createStat, formatRoi } from '../../components/widgets.js';
import { createOfferList } from './offers.js';
import { createCommitmentList } from './commitments.js';

const DEFAULT_COPY = {
  ready: {
    title: 'Ready to accept',
    description: 'Step 1 • Accept: Claim this contract and move it into your active worklist.'
  },
  upcoming: {
    title: 'Queued for later',
    description: "These leads unlock with tomorrow's refresh. Prep so you can accept quickly."
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

export function describeMetaSummary({ availableCount, upcomingCount, commitmentCount }) {
  const parts = [];

  if (availableCount > 0) {
    parts.push(`${availableCount} offer${availableCount === 1 ? '' : 's'} ready`);
  }

  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} queued`);
  }

  if (commitmentCount > 0) {
    parts.push(`${commitmentCount} commitment${commitmentCount === 1 ? '' : 's'} active`);
  }

  if (parts.length === 0) {
    return 'No actions ready yet — accept your next contract to kick things off.';
  }

  return `Keep the loop rolling — accept → work → complete. ${parts.join(' • ')}`;
}

export function createHustleCard({
  definition = {},
  model = {},
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
  card.className = 'browser-card browser-card--action browser-card--hustle';
  card.dataset.action = model.id || definition.id || '';
  card.dataset.hustle = model.id || definition.id || '';
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

  const badges = Array.isArray(model.badges) ? model.badges : [];
  if (badges.length > 0) {
    const list = document.createElement('ul');
    list.className = 'browser-card__badges';
    badges.forEach(entry => {
      if (!entry) return;
      const item = document.createElement('li');
      item.className = 'browser-card__badge';
      item.textContent = entry;
      list.appendChild(item);
    });
    card.appendChild(list);
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

  if (model.action?.label) {
    const actions = document.createElement('div');
    actions.className = 'browser-card__actions';

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

    if (model.action?.guidance) {
      const note = document.createElement('p');
      note.className = 'browser-card__note';
      note.textContent = model.action.guidance;
      actions.appendChild(note);
    }

    card.appendChild(actions);
  }

  if (hasCommitments) {
    const commitmentsSection = createCardSection(copy.commitments);
    const list = createCommitmentList(model.commitments);
    commitmentsSection.appendChild(list);
    card.appendChild(commitmentsSection);
  }

  if (visibleOffers.length) {
    const offersSection = createCardSection(copy.ready);
    const list = createOfferList(visibleOffers);
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

  if (visibleUpcoming.length) {
    const upcomingSection = createCardSection(copy.upcoming);
    const list = createOfferList(visibleUpcoming, { upcoming: true });
    upcomingSection.appendChild(list);
    card.appendChild(upcomingSection);
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
  let upcomingCount = 0;

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    const visibleOffersCount = Array.isArray(model.offers)
      ? model.offers.filter(offer => !offer?.locked).length
      : 0;
    if (visibleOffersCount > 0) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
    }

    const visibleUpcomingCount = Array.isArray(model.upcoming)
      ? model.upcoming.filter(offer => !offer?.locked).length
      : 0;
    if (visibleUpcomingCount > 0) {
      upcomingCount += visibleUpcomingCount;
    }

    const card = createHustleCard({ definition, model });
    if (card) {
      list.appendChild(card);
    }
  });

  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue an action to see it spotlighted here.';
    list.appendChild(empty);
  }

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
