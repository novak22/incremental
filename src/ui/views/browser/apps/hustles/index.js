import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { getPageByType } from '../pageLookup.js';
import { formatRoi } from '../../components/widgets.js';
import { createOfferList } from './offers.js';
import { createCommitmentList } from './commitments.js';

const CATEGORY_ORDER = ['writing', 'community', 'research', 'ops'];

const CATEGORY_CONFIG = {
  writing: { id: 'freelance', label: 'Freelance Grind', icon: '✍️' },
  community: { id: 'audience', label: 'Creator Lane', icon: '📣' },
  research: { id: 'survey', label: 'Quick Cash', icon: '🧪' },
  ops: { id: 'data-entry', label: 'Ops Desk', icon: '🗂️' }
};

const DEFAULT_CATEGORY_CONFIG = { id: 'hustle', label: 'Daily Hustles', icon: '💼' };

const QUICK_FILTERS = [
  { id: 'highPayout', label: '💰 High payout' },
  { id: 'shortTasks', label: '⚡ Short tasks' },
  { id: 'skillXp', label: '🧠 Skill XP' },
  { id: 'expiringSoon', label: '🕒 Expiring soon' }
];

const boardStateMap = new WeakMap();

function resolveCategoryKey(value = '') {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  return trimmed || '';
}

function resolveCategoryConfig(key = '') {
  const normalized = resolveCategoryKey(key);
  return CATEGORY_CONFIG[normalized] || DEFAULT_CATEGORY_CONFIG;
}

function getCategorySortIndex(key = '') {
  const normalized = resolveCategoryKey(key);
  const index = CATEGORY_ORDER.indexOf(normalized);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function getBoardState(board) {
  if (!boardStateMap.has(board)) {
    boardStateMap.set(board, {
      activeCategory: null,
      activeFilters: new Set(),
      summary: {
        focusHours: 0,
        acceptedCount: 0,
        potentialPayout: 0
      },
      elements: {},
      thresholds: {
        payoutHigh: 0,
        shortTask: 0,
        expiringSoon: Infinity
      },
      toastTimeout: null
    });
  }
  return boardStateMap.get(board);
}

function createSummaryStat(label, { valueRole, deltaRole }) {
  const stat = document.createElement('div');
  stat.className = 'downwork-summary__stat';

  const labelEl = document.createElement('span');
  labelEl.className = 'downwork-summary__label';
  labelEl.textContent = label;
  stat.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'downwork-summary__value';
  if (valueRole) {
    valueEl.dataset.role = valueRole;
  }
  valueEl.textContent = '—';
  stat.appendChild(valueEl);

  if (deltaRole) {
    const deltaEl = document.createElement('span');
    deltaEl.className = 'downwork-summary__delta';
    deltaEl.dataset.role = deltaRole;
    deltaEl.hidden = true;
    stat.appendChild(deltaEl);
  }

  return stat;
}

function ensureBoard(body) {
  if (!body) return null;
  let board = body.querySelector('[data-role="downwork-board"]');
  if (board) {
    return board;
  }

  board = document.createElement('div');
  board.className = 'downwork-board';
  board.dataset.role = 'downwork-board';

  const summary = document.createElement('header');
  summary.className = 'downwork-board__summary';
  summary.dataset.role = 'downwork-summary';
  summary.append(
    createSummaryStat('Focus hours left', {
      valueRole: 'downwork-focus-value',
      deltaRole: 'downwork-focus-delta'
    }),
    createSummaryStat('Accepted gigs', {
      valueRole: 'downwork-accepted-value',
      deltaRole: 'downwork-accepted-delta'
    }),
    createSummaryStat('Potential payout', {
      valueRole: 'downwork-payout-value',
      deltaRole: 'downwork-payout-delta'
    })
  );

  const tabs = document.createElement('div');
  tabs.className = 'downwork-board__tabs';
  tabs.dataset.role = 'downwork-tabs';

  const filters = document.createElement('div');
  filters.className = 'downwork-board__filters';
  filters.dataset.role = 'downwork-filters';

  const grid = document.createElement('div');
  grid.className = 'browser-card-grid downwork-board__grid';
  grid.dataset.role = 'browser-hustle-list';

  const toastHost = document.createElement('div');
  toastHost.className = 'downwork-board__toasts';
  toastHost.dataset.role = 'downwork-toast-host';

  board.append(summary, tabs, filters, grid, toastHost);
  body.appendChild(board);
  return board;
}

function formatHoursLabel(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return formatHours(Math.max(0, value));
}

function formatPayoutLabel(value) {
  if (!Number.isFinite(value)) {
    return '$0';
  }
  const safeValue = Math.max(0, value);
  return `$${formatMoney(safeValue)}`;
}

function updateDeltaElement(element, value, formatter = value => String(value)) {
  if (!element) return;
  if (!value) {
    element.hidden = true;
    element.textContent = '';
    element.classList.remove('is-positive', 'is-negative');
    return;
  }
  const isPositive = value > 0;
  const magnitude = Math.abs(value);
  const formatted = formatter(magnitude);
  const prefix = isPositive ? '+' : '−';
  element.textContent = `${prefix}${formatted}`;
  element.hidden = false;
  element.classList.toggle('is-positive', isPositive);
  element.classList.toggle('is-negative', !isPositive);
  element.classList.add('is-visible');
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      element.classList.remove('is-visible');
    });
  } else {
    element.classList.remove('is-visible');
  }
}

function updateSummaryDisplay(boardState, summary, deltas = {}) {
  boardState.summary = {
    focusHours: summary.focusHours,
    acceptedCount: summary.acceptedCount,
    potentialPayout: summary.potentialPayout
  };

  const {
    focusValue,
    focusDelta,
    acceptedValue,
    acceptedDelta,
    payoutValue,
    payoutDelta
  } = boardState.elements;

  if (focusValue) {
    focusValue.textContent = formatHoursLabel(summary.focusHours);
  }
  if (acceptedValue) {
    acceptedValue.textContent = String(Math.max(0, summary.acceptedCount));
  }
  if (payoutValue) {
    payoutValue.textContent = formatPayoutLabel(summary.potentialPayout);
  }

  updateDeltaElement(focusDelta, deltas.focusHoursDelta, value => formatHours(Math.max(0, value)));
  updateDeltaElement(acceptedDelta, deltas.acceptedDelta, value => String(Math.max(0, value)));
  updateDeltaElement(payoutDelta, deltas.payoutDelta, value => formatMoney(Math.max(0, value)));
}

function showToast(boardState, message) {
  const host = boardState.elements.toastHost;
  if (!host) return;
  const toast = document.createElement('div');
  toast.className = 'downwork-toast';
  toast.textContent = message;
  host.appendChild(toast);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
  } else {
    toast.classList.add('is-visible');
  }

  if (boardState.toastTimeout) {
    clearTimeout(boardState.toastTimeout);
  }
  boardState.toastTimeout = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.addEventListener(
      'transitionend',
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, 3200);
}

function resolveFocusHoursLeft(context = {}, models = []) {
  const possibleSources = [
    context?.stats?.focusHoursRemaining,
    context?.stats?.focusHoursLeft,
    context?.summary?.focusHoursRemaining,
    context?.summary?.focusHoursLeft,
    context?.focus?.hoursRemaining,
    context?.focus?.hoursLeft
  ];

  const resolved = possibleSources.find(value => Number.isFinite(value));
  if (Number.isFinite(resolved)) {
    return Math.max(0, resolved);
  }

  const fallback = models.reduce((total, model) => {
    const commitments = Array.isArray(model.commitments) ? model.commitments : [];
    const hours = commitments.reduce((sum, entry) => {
      const remaining = Number(entry?.progress?.hoursRemaining ?? entry?.hoursRemaining ?? entry?.hoursRequired);
      return sum + (Number.isFinite(remaining) ? Math.max(0, remaining) : 0);
    }, 0);
    return total + hours;
  }, 0);

  return Math.max(0, fallback);
}

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
  descriptors: descriptorOverrides = {},
  categoryIcon = '💼',
  onOfferAccept
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
  card.className = 'browser-card browser-card--action browser-card--hustle downwork-card';
  card.dataset.action = model.id || definition.id || '';
  card.dataset.hustle = model.id || definition.id || '';
  card.dataset.search = model.filters?.search || '';
  const timeValue = Number(model.metrics?.time?.value ?? 0);
  const payoutMetricValue = Number(model.metrics?.payout?.value ?? 0);
  const roiValue = Number(model.metrics?.roi ?? 0);
  const payoutCandidates = visibleOffers
    .map(offer => Number(offer?.payout))
    .filter(value => Number.isFinite(value) && value > 0);
  const cardPayoutValue = payoutCandidates.length
    ? Math.max(...payoutCandidates)
    : payoutMetricValue;
  card.dataset.time = String(timeValue);
  card.dataset.payout = String(cardPayoutValue);
  card.dataset.roi = String(roiValue);
  card.dataset.available = visibleOffers.length > 0 ? 'true' : 'false';

  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  const categoryKey = resolveCategoryKey(model.actionCategory || model.filters?.category || '');
  card.dataset.category = categoryKey;
  card.dataset.actionCategory = categoryKey;

  const header = document.createElement('header');
  header.className = 'browser-card__header downwork-card__header';
  const icon = document.createElement('span');
  icon.className = 'downwork-card__icon';
  icon.textContent = descriptorBundle.icon || categoryIcon || '💼';
  header.appendChild(icon);
  const title = document.createElement('h2');
  title.className = 'browser-card__title';
  title.textContent = model.name || definition.name || 'Contract';
  header.appendChild(title);
  card.appendChild(header);

  const metricsRow = document.createElement('div');
  metricsRow.className = 'downwork-card__metrics';

  const timeChip = document.createElement('span');
  timeChip.className = 'downwork-card__metric';
  timeChip.textContent = `⏱️ ${model.metrics?.time?.label || formatHours(Math.max(0, timeValue))}`;
  metricsRow.appendChild(timeChip);

  const payoutLabel = model.metrics?.payout?.label
    || (cardPayoutValue > 0 ? `$${formatMoney(cardPayoutValue)}` : 'Varies');
  const payoutChip = document.createElement('span');
  payoutChip.className = 'downwork-card__metric';
  payoutChip.textContent = `💵 ${payoutLabel}`;
  metricsRow.appendChild(payoutChip);

  if (roiValue > 0) {
    const roiChip = document.createElement('span');
    roiChip.className = 'downwork-card__metric downwork-card__metric--roi';
    roiChip.textContent = `📈 ROI ${formatRoi(roiValue)}`;
    metricsRow.appendChild(roiChip);
    if (cardPayoutValue > 0 && timeValue > 0) {
      const tooltip = `ROI ${formatRoi(roiValue)} • $${formatMoney(cardPayoutValue)} ÷ ${formatHours(Math.max(0, timeValue))}`;
      metricsRow.title = tooltip;
      card.title = tooltip;
    }
  }

  card.appendChild(metricsRow);

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

  const hasSkillBadge = badges.some(badge => typeof badge === 'string' && /xp/i.test(badge));
  const hasSkillTag = typeof model.tag?.label === 'string' && /skill/i.test(model.tag.label);
  card.dataset.skillXp = hasSkillBadge || hasSkillTag ? 'true' : 'false';

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
    queueButton.textContent = model.action.label || 'Accept & Queue';
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
    const list = createOfferList(visibleOffers, { onAccept: onOfferAccept, model });
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

  if (visibleUpcoming.length) {
    const upcomingSection = createCardSection(copy.upcoming);
    const list = createOfferList(visibleUpcoming, { upcoming: true, onAccept: onOfferAccept, model });
    upcomingSection.appendChild(list);
    card.appendChild(upcomingSection);
  }

  const expiresCandidates = [...visibleOffers, ...visibleUpcoming]
    .map(offer => Number(offer?.expiresIn))
    .filter(value => Number.isFinite(value));
  if (expiresCandidates.length) {
    card.dataset.expiresIn = String(Math.min(...expiresCandidates));
  }

  return card;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    ensureBoard(body);
  });

  if (!refs) return null;

  const board = ensureBoard(refs.body);
  if (!board) return null;

  const list = board.querySelector('[data-role="browser-hustle-list"]');
  const tabsContainer = board.querySelector('[data-role="downwork-tabs"]');
  const filtersContainer = board.querySelector('[data-role="downwork-filters"]');

  if (!list || !tabsContainer || !filtersContainer) {
    return null;
  }

  const boardState = getBoardState(board);
  boardState.elements = {
    ...boardState.elements,
    focusValue: board.querySelector('[data-role="downwork-focus-value"]'),
    focusDelta: board.querySelector('[data-role="downwork-focus-delta"]'),
    acceptedValue: board.querySelector('[data-role="downwork-accepted-value"]'),
    acceptedDelta: board.querySelector('[data-role="downwork-accepted-delta"]'),
    payoutValue: board.querySelector('[data-role="downwork-payout-value"]'),
    payoutDelta: board.querySelector('[data-role="downwork-payout-delta"]'),
    toastHost: board.querySelector('[data-role="downwork-toast-host"]'),
    grid: list
  };

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;
  let commitmentCount = 0;
  let upcomingCount = 0;
  let potentialPayout = 0;

  const cardsByCategory = new Map();
  const categoryMetadata = new Map();
  const allCards = [];

  const handleOfferAccepted = ({ payout = 0, focusHours = 0 } = {}) => {
    const payoutValue = Number.isFinite(payout) ? payout : 0;
    const focusValue = Number.isFinite(focusHours) ? focusHours : 0;
    const payoutLabel = formatMoney(Math.max(0, payoutValue));
    const focusLabel = formatHours(Math.max(0, focusValue));
    showToast(boardState, `Added to your hustle queue 💼 (+$${payoutLabel} payout, −${focusLabel} focus)`);
    const nextSummary = {
      focusHours: Math.max(0, boardState.summary.focusHours - focusValue),
      acceptedCount: boardState.summary.acceptedCount + 1,
      potentialPayout: Math.max(0, boardState.summary.potentialPayout - payoutValue)
    };
    updateSummaryDisplay(boardState, nextSummary, {
      focusHoursDelta: -focusValue,
      acceptedDelta: 1,
      payoutDelta: -payoutValue
    });
  };

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    const readyOffers = Array.isArray(model.offers)
      ? model.offers.filter(offer => !offer?.locked)
      : [];
    const upcomingOffers = Array.isArray(model.upcoming)
      ? model.upcoming.filter(offer => !offer?.locked)
      : [];

    if (readyOffers.length > 0) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
    }

    if (upcomingOffers.length > 0) {
      upcomingCount += upcomingOffers.length;
    }

    const readyPayoutTotal = readyOffers.reduce((sum, offer) => {
      const payout = Number(offer?.payout);
      return sum + (Number.isFinite(payout) ? Math.max(0, payout) : 0);
    }, 0);
    if (readyPayoutTotal > 0) {
      potentialPayout += readyPayoutTotal;
    } else if (Number.isFinite(model.metrics?.payout?.value)) {
      potentialPayout += Math.max(0, Number(model.metrics.payout.value));
    }

    const categoryKey = resolveCategoryKey(model.actionCategory || model.filters?.category || '');
    const categoryConfig = resolveCategoryConfig(categoryKey);
    categoryMetadata.set(categoryKey, categoryConfig);

    const card = createHustleCard({
      definition,
      model,
      categoryIcon: categoryConfig.icon,
      onOfferAccept: handleOfferAccepted
    });

    if (!card) {
      return;
    }

    card.dataset.categoryLabel = categoryConfig.label;

    if (!cardsByCategory.has(categoryKey)) {
      cardsByCategory.set(categoryKey, []);
    }
    cardsByCategory.get(categoryKey).push(card);
    allCards.push(card);
  });

  tabsContainer.innerHTML = '';
  filtersContainer.innerHTML = '';
  list.innerHTML = '';

  const payoutValues = allCards
    .map(card => Number(card.dataset.payout))
    .filter(value => Number.isFinite(value) && value > 0);
  const timeValues = allCards
    .map(card => Number(card.dataset.time))
    .filter(value => Number.isFinite(value) && value > 0);
  const expiringValues = allCards
    .map(card => Number(card.dataset.expiresIn))
    .filter(value => Number.isFinite(value) && value >= 0);

  const avgPayout = payoutValues.length
    ? payoutValues.reduce((sum, value) => sum + value, 0) / payoutValues.length
    : 0;
  const avgTime = timeValues.length
    ? timeValues.reduce((sum, value) => sum + value, 0) / timeValues.length
    : 0;
  const minExpiry = expiringValues.length ? Math.min(...expiringValues) : Infinity;

  boardState.thresholds = {
    payoutHigh: avgPayout > 0 ? avgPayout : 0,
    shortTask: avgTime > 0 ? Math.min(2, Math.max(0.5, avgTime)) : 2,
    expiringSoon: Number.isFinite(minExpiry) ? Math.min(2, Math.max(0, minExpiry)) : 2
  };

  const focusHoursLeft = resolveFocusHoursLeft(context, models);
  updateSummaryDisplay(boardState, {
    focusHours: focusHoursLeft,
    acceptedCount: commitmentCount,
    potentialPayout
  });

  const sortedCategories = Array.from(cardsByCategory.keys()).sort((a, b) => {
    const orderDiff = getCategorySortIndex(a) - getCategorySortIndex(b);
    if (orderDiff !== 0) return orderDiff;
    const labelA = (categoryMetadata.get(a)?.label || '').toLowerCase();
    const labelB = (categoryMetadata.get(b)?.label || '').toLowerCase();
    return labelA.localeCompare(labelB);
  });

  const validFilters = new Set(QUICK_FILTERS.map(filter => filter.id));
  boardState.activeFilters = new Set(
    [...boardState.activeFilters].filter(id => validFilters.has(id))
  );

  if (!sortedCategories.length) {
    boardState.activeCategory = null;
    boardState.activeFilters.clear();
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue an action to see it spotlighted here.';
    list.appendChild(empty);
    const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });
    return {
      id: page.id,
      meta
    };
  }

  if (!boardState.activeCategory || !cardsByCategory.has(boardState.activeCategory)) {
    boardState.activeCategory = sortedCategories[0];
  }

  const tabButtons = new Map();
  sortedCategories.forEach(categoryKey => {
    const config = categoryMetadata.get(categoryKey) || DEFAULT_CATEGORY_CONFIG;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-tab';
    button.dataset.categoryKey = categoryKey;
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'downwork-tab__icon';
    icon.textContent = config.icon || '💼';

    const label = document.createElement('span');
    label.className = 'downwork-tab__label';
    label.textContent = config.label;

    button.append(icon, label);
    tabsContainer.appendChild(button);
    tabButtons.set(categoryKey, button);
  });

  const filterButtons = new Map();
  QUICK_FILTERS.forEach(filter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-filter';
    button.dataset.filterId = filter.id;
    button.textContent = filter.label;
    const isActive = boardState.activeFilters.has(filter.id);
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

    button.addEventListener('click', () => {
      if (boardState.activeFilters.has(filter.id)) {
        boardState.activeFilters.delete(filter.id);
      } else {
        boardState.activeFilters.add(filter.id);
      }
      updateFilterSelection();
      renderActiveCategory();
    });

    filtersContainer.appendChild(button);
    filterButtons.set(filter.id, button);
  });

  const filterPredicates = {
    highPayout: card => {
      const threshold = boardState.thresholds.payoutHigh;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return Number(card.dataset.payout) > 0;
      }
      const payout = Number(card.dataset.payout);
      return Number.isFinite(payout) ? payout >= threshold : false;
    },
    shortTasks: card => {
      const threshold = boardState.thresholds.shortTask;
      const time = Number(card.dataset.time);
      if (!Number.isFinite(time)) return false;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return time > 0;
      }
      return time <= threshold;
    },
    skillXp: card => card.dataset.skillXp === 'true',
    expiringSoon: card => {
      const threshold = boardState.thresholds.expiringSoon;
      const expires = Number(card.dataset.expiresIn);
      if (!Number.isFinite(expires)) return false;
      if (!Number.isFinite(threshold) || threshold <= 0) {
        return expires <= 2;
      }
      return expires <= threshold;
    }
  };

  function applyActiveFilters(cards = []) {
    if (!boardState.activeFilters.size) {
      return cards.slice();
    }
    const predicates = [...boardState.activeFilters]
      .map(id => filterPredicates[id])
      .filter(Boolean);
    if (!predicates.length) {
      return cards.slice();
    }
    return cards.filter(card => predicates.every(predicate => predicate(card)));
  }

  function updateTabSelection() {
    tabButtons.forEach((button, key) => {
      const isActive = key === boardState.activeCategory;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    board.dataset.activeCategory = boardState.activeCategory || '';
  }

  function updateFilterSelection() {
    filterButtons.forEach((button, id) => {
      const isActive = boardState.activeFilters.has(id);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    board.classList.toggle('is-filtered', boardState.activeFilters.size > 0);
  }

  function renderActiveCategory() {
    list.innerHTML = '';
    const activeKey = boardState.activeCategory;
    const cards = cardsByCategory.get(activeKey) || [];
    const filtered = applyActiveFilters(cards);
    list.classList.toggle('is-filtered', boardState.activeFilters.size > 0);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'browser-empty browser-empty--compact';
      empty.textContent = boardState.activeFilters.size
        ? 'No gigs match these filters yet. Clear a filter to see more leads.'
        : 'Queue an action to see it spotlighted here.';
      list.appendChild(empty);
      return;
    }

    filtered.forEach(card => {
      list.appendChild(card);
    });
  }

  tabButtons.forEach((button, key) => {
    button.addEventListener('click', () => {
      if (boardState.activeCategory === key) return;
      boardState.activeCategory = key;
      updateTabSelection();
      renderActiveCategory();
    });
  });

  updateTabSelection();
  updateFilterSelection();
  renderActiveCategory();

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
