import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { getPageByType } from '../pageLookup.js';
import { createStat, formatRoi } from '../../components/widgets.js';
import { createOfferList } from './offers.js';
import { createCommitmentList } from './commitments.js';

const DEFAULT_COPY = {
  ready: {
    title: 'Live offers',
    description: 'Accept to pull this hustle into your active worklist.'
  },
  upcoming: {
    title: 'Next wave',
    description: "Locked until the next refresh. Line up your hours now."
  },
  commitments: {
    title: 'Active delivery',
    description: 'Currently assigned. Track progress and close it out.'
  }
};

const CATEGORY_THEMES = {
  writing: 'blue',
  promo: 'green',
  survey: 'amber',
  assistant: 'purple',
  ops: 'slate',
  data: 'slate'
};

const downworkState = new WeakMap();
const rowDetails = new WeakMap();

function applyAcceptanceState(detail, { inlineButton, drawerButton } = {}) {
  if (!detail) return;

  detail.accepted = true;
  detail.acceptDisabled = true;

  if (detail.rowElement) {
    detail.rowElement.classList.add('is-accepted');
    detail.rowElement.dataset.accepted = 'true';
  }

  const buttons = new Set();
  if (detail.inlineAcceptButton) {
    buttons.add(detail.inlineAcceptButton);
  }
  if (inlineButton) {
    buttons.add(inlineButton);
  }
  if (drawerButton) {
    buttons.add(drawerButton);
  }

  buttons.forEach(button => {
    if (button) {
      button.disabled = true;
    }
  });
}

function mergeCopy(base = {}, overrides = {}) {
  return {
    ready: { ...DEFAULT_COPY.ready, ...base.ready, ...overrides.ready },
    upcoming: { ...DEFAULT_COPY.upcoming, ...base.upcoming, ...overrides.upcoming },
    commitments: { ...DEFAULT_COPY.commitments, ...base.commitments, ...overrides.commitments }
  };
}

function getThemeKey(category = '') {
  const normalized = String(category || '').toLowerCase();
  return CATEGORY_THEMES[normalized] ? normalized : 'default';
}

function getDownworkState(container) {
  if (!downworkState.has(container)) {
    downworkState.set(container, {
      tab: 'market',
      category: 'all',
      search: '',
      sort: 'roi'
    });
  }
  return downworkState.get(container);
}

function describeCounts({ availableCount, upcomingCount, commitmentCount }) {
  const parts = [];
  parts.push(`${availableCount} ready`);
  parts.push(`${upcomingCount} queued`);
  parts.push(`${commitmentCount} active`);
  return `Market pulse — ${parts.join(' • ')}`;
}

export function describeMetaSummary({ availableCount, upcomingCount, commitmentCount }) {
  if (!availableCount && !upcomingCount && !commitmentCount) {
    return 'DownWork is quiet right now — refresh soon for fresh leads.';
  }
  return describeCounts({ availableCount, upcomingCount, commitmentCount });
}

function summarizeSlots(limit = null) {
  if (!limit) return '—';
  if (!Number.isFinite(limit.remaining) || !Number.isFinite(limit.limit)) {
    return limit.summary || '—';
  }
  return `${limit.remaining}/${limit.limit}`;
}

function resolveExpiresLabel(offers = [], upcoming = []) {
  const active = offers
    .map(offer => Number.isFinite(offer?.expiresIn) ? offer.expiresIn : null)
    .filter(value => value !== null && value >= 0);
  const queued = upcoming
    .map(offer => Number.isFinite(offer?.availableIn) ? offer.availableIn : null)
    .filter(value => value !== null && value >= 0);

  if (active.length > 0) {
    const soonest = Math.min(...active);
    return {
      value: soonest,
      label: soonest === 0 ? 'Today' : `${soonest}d`
    };
  }

  if (queued.length > 0) {
    const soonestQueue = Math.min(...queued);
    return {
      value: soonestQueue + 0.5,
      label: soonestQueue === 0 ? 'Queued' : `Opens ${soonestQueue}d`
    };
  }

  return { value: Number.POSITIVE_INFINITY, label: '—' };
}

function buildDrawer(container) {
  let drawer = container.querySelector('[data-role="downwork-drawer"]');
  if (drawer) return drawer;

  drawer = document.createElement('aside');
  drawer.className = 'downwork-drawer';
  drawer.dataset.role = 'downwork-drawer';
  drawer.hidden = true;

  const inner = document.createElement('div');
  inner.className = 'downwork-drawer__inner';

  const header = document.createElement('header');
  header.className = 'downwork-drawer__header';

  const heading = document.createElement('div');
  heading.className = 'downwork-drawer__heading';

  const title = document.createElement('h2');
  title.className = 'downwork-drawer__title';
  title.dataset.role = 'downwork-drawer-title';
  heading.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'downwork-drawer__subtitle';
  subtitle.dataset.role = 'downwork-drawer-subtitle';
  heading.appendChild(subtitle);

  header.appendChild(heading);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'downwork-drawer__close';
  close.dataset.role = 'downwork-drawer-close';
  close.textContent = 'Close';
  header.appendChild(close);

  inner.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'downwork-drawer__summary';
  summary.dataset.role = 'downwork-drawer-summary';
  inner.appendChild(summary);

  const meta = document.createElement('div');
  meta.className = 'downwork-drawer__meta';
  meta.dataset.role = 'downwork-drawer-meta';
  inner.appendChild(meta);

  const badgeList = document.createElement('ul');
  badgeList.className = 'downwork-drawer__badges';
  badgeList.dataset.role = 'downwork-drawer-badges';
  inner.appendChild(badgeList);

  const requirements = document.createElement('p');
  requirements.className = 'downwork-drawer__requirements';
  requirements.dataset.role = 'downwork-drawer-requirements';
  inner.appendChild(requirements);

  const seat = document.createElement('p');
  seat.className = 'downwork-drawer__seat';
  seat.dataset.role = 'downwork-drawer-seat';
  inner.appendChild(seat);

  const limit = document.createElement('p');
  limit.className = 'downwork-drawer__limit';
  limit.dataset.role = 'downwork-drawer-limit';
  inner.appendChild(limit);

  const actions = document.createElement('div');
  actions.className = 'downwork-drawer__actions';

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'downwork-drawer__button downwork-drawer__button--primary';
  accept.dataset.role = 'downwork-drawer-accept';
  accept.textContent = 'Accept Gig';
  actions.appendChild(accept);

  const queue = document.createElement('button');
  queue.type = 'button';
  queue.className = 'downwork-drawer__button';
  queue.dataset.role = 'downwork-drawer-queue';
  queue.textContent = 'Queue for Later';
  queue.disabled = true;
  queue.title = 'Queueing opens in a later update.';
  actions.appendChild(queue);

  inner.appendChild(actions);

  const guidance = document.createElement('p');
  guidance.className = 'downwork-drawer__guidance';
  guidance.dataset.role = 'downwork-drawer-guidance';
  inner.appendChild(guidance);

  const offers = document.createElement('div');
  offers.className = 'downwork-drawer__offers';
  offers.dataset.role = 'downwork-drawer-offers';
  inner.appendChild(offers);

  drawer.appendChild(inner);
  container.appendChild(drawer);

  return drawer;
}

function closeDrawer(drawer) {
  if (!drawer) return;
  drawer.hidden = true;
  drawer.classList.remove('is-open');
  drawer.dataset.currentGig = '';
  const accept = drawer.querySelector('[data-role="downwork-drawer-accept"]');
  if (accept) {
    accept.disabled = false;
    accept.replaceWith(accept.cloneNode(true));
  }
}

function openDrawer(container, detail) {
  if (!detail) return;
  const drawer = buildDrawer(container);
  const title = drawer.querySelector('[data-role="downwork-drawer-title"]');
  const subtitle = drawer.querySelector('[data-role="downwork-drawer-subtitle"]');
  const summary = drawer.querySelector('[data-role="downwork-drawer-summary"]');
  const metaHost = drawer.querySelector('[data-role="downwork-drawer-meta"]');
  const badges = drawer.querySelector('[data-role="downwork-drawer-badges"]');
  const requirements = drawer.querySelector('[data-role="downwork-drawer-requirements"]');
  const seat = drawer.querySelector('[data-role="downwork-drawer-seat"]');
  const limit = drawer.querySelector('[data-role="downwork-drawer-limit"]');
  const offersHost = drawer.querySelector('[data-role="downwork-drawer-offers"]');
  const guidance = drawer.querySelector('[data-role="downwork-drawer-guidance"]');
  const acceptButton = drawer.querySelector('[data-role="downwork-drawer-accept"]');

  drawer.dataset.currentGig = detail.id || '';

  if (title) {
    title.textContent = detail.title || 'Gig detail';
  }

  if (subtitle) {
    subtitle.textContent = detail.categoryLabel ? `${detail.categoryLabel} • ${detail.roiLabel}` : detail.roiLabel;
  }

  if (summary) {
    summary.textContent = detail.description || '';
    summary.hidden = !detail.description;
  }

  if (metaHost) {
    metaHost.innerHTML = '';
    const stats = [
      createStat('Time', detail.timeLabel || '—'),
      createStat('Payout', detail.payoutLabel || '—'),
      createStat('ROI (/h)', detail.roiLabel || '—')
    ];
    stats.forEach(stat => {
      stat.classList.add('downwork-drawer__stat');
      metaHost.appendChild(stat);
    });
  }

  if (badges) {
    badges.innerHTML = '';
    (detail.badges || []).forEach(entry => {
      const item = document.createElement('li');
      item.className = 'downwork-drawer__badge';
      item.textContent = entry;
      badges.appendChild(item);
    });
    badges.hidden = !badges.children.length;
  }

  if (requirements) {
    requirements.textContent = detail.requirements || 'No requirements';
  }

  if (seat) {
    seat.textContent = detail.seatSummary || '';
    seat.hidden = !detail.seatSummary;
  }

  if (limit) {
    limit.textContent = detail.limitSummary || '';
    limit.hidden = !detail.limitSummary;
  }

  if (guidance) {
    guidance.textContent = detail.actionGuidance || '';
    guidance.hidden = !detail.actionGuidance;
  }

  if (offersHost) {
    offersHost.innerHTML = '';
    if (detail.commitments?.length) {
      const commitmentsSection = document.createElement('section');
      commitmentsSection.className = 'downwork-drawer__section';
      const heading = document.createElement('h3');
      heading.textContent = 'Active delivery';
      commitmentsSection.appendChild(heading);
      commitmentsSection.appendChild(createCommitmentList(detail.commitments));
      offersHost.appendChild(commitmentsSection);
    }

    if (detail.offers?.length) {
      const readySection = document.createElement('section');
      readySection.className = 'downwork-drawer__section';
      const heading = document.createElement('h3');
      heading.textContent = 'Live offers';
      readySection.appendChild(heading);
      readySection.appendChild(createOfferList(detail.offers));
      offersHost.appendChild(readySection);
    }

    if (detail.upcoming?.length) {
      const upcomingSection = document.createElement('section');
      upcomingSection.className = 'downwork-drawer__section';
      const heading = document.createElement('h3');
      heading.textContent = 'Upcoming drops';
      upcomingSection.appendChild(heading);
      upcomingSection.appendChild(createOfferList(detail.upcoming, { upcoming: true }));
      offersHost.appendChild(upcomingSection);
    }
  }

  if (acceptButton) {
    const clone = acceptButton.cloneNode(true);
    clone.textContent = detail.acceptLabel || 'Accept Gig';
    const hasHandler = typeof detail.onAccept === 'function';
    const disabled = Boolean(detail.acceptDisabled) || !hasHandler;
    clone.disabled = disabled;
    if (detail.actionGuidance) {
      clone.title = detail.actionGuidance;
    } else if (!hasHandler) {
      clone.title = 'No live offer to accept right now.';
    } else {
      clone.removeAttribute('title');
    }
    if (!disabled && hasHandler) {
      clone.addEventListener('click', () => {
        detail.onAccept({ drawerButton: clone });
        clone.disabled = true;
      });
    }
    acceptButton.replaceWith(clone);
  }

  drawer.hidden = false;
  drawer.classList.add('is-open');
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

  const row = document.createElement('tr');
  row.className = 'downwork-market__row';
  row.dataset.role = 'downwork-row';
  row.dataset.action = model.id || definition.id || '';
  row.dataset.hustle = model.id || definition.id || '';
  row.dataset.search = model.filters?.search || '';
  row.dataset.time = String(model.metrics?.time?.value ?? 0);
  row.dataset.payout = String(model.metrics?.payout?.value ?? 0);
  row.dataset.roi = String(model.metrics?.roi ?? 0);
  row.dataset.available = visibleOffers.length > 0 ? 'true' : 'false';
  row.dataset.availableOffers = String(visibleOffers.length);
  row.dataset.upcomingOffers = String(visibleUpcoming.length);
  row.dataset.hasCommitments = hasCommitments ? 'true' : 'false';
  row.dataset.hasHistory = Array.isArray(model.history) && model.history.length > 0 ? 'true' : 'false';

  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    row.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  if (model.filters?.category) {
    row.dataset.category = model.filters.category;
  }

  if (model.filters?.marketCategory) {
    row.dataset.marketCategory = model.filters.marketCategory;
  }

  const themeKey = getThemeKey(model.filters?.marketCategory || model.category);
  row.dataset.theme = CATEGORY_THEMES[themeKey] || 'neutral';

  const expires = resolveExpiresLabel(visibleOffers, visibleUpcoming);
  row.dataset.expires = String(expires.value);

  const limit = model.limit || null;
  const slotsLabel = summarizeSlots(limit);

  const timeLabel = model.metrics?.time?.label || formatHours(model.metrics?.time?.value ?? 0);
  const payoutValue = model.metrics?.payout?.value ?? 0;
  const payoutLabel = model.metrics?.payout?.label || (payoutValue > 0 ? `$${formatMoney(payoutValue)}` : 'Varies');
  const roiLabel = formatRoi(model.metrics?.roi);

  const primaryOffer = visibleOffers[0] || null;
  const actionConfig = typeof model.action === 'object' && model.action !== null ? model.action : {};
  const acceptLabel = primaryOffer?.acceptLabel || actionConfig.label || 'Accept';
  const acceptHandler = primaryOffer?.onAccept || (typeof actionConfig.onClick === 'function' ? actionConfig.onClick : null);
  const hasAcceptHandler = typeof acceptHandler === 'function';
  const acceptDisabled = primaryOffer ? false : Boolean(actionConfig.disabled);

  const detail = {
    id: row.dataset.hustle,
    title: model.name || definition.name || 'Contract',
    description: model.description,
    badges: Array.isArray(model.badges) ? model.badges : [],
    requirements: model.requirements?.summary || 'No requirements',
    seatSummary: model.seat?.summary || '',
    limitSummary: model.limit?.summary || '',
    offers: visibleOffers,
    upcoming: visibleUpcoming,
    commitments: model.commitments,
    categoryLabel: model.labels?.category || model.categoryLabel || model.filters?.categoryLabel || '',
    roiLabel,
    timeLabel,
    payoutLabel,
    acceptLabel,
    acceptDisabled,
    onAccept: null,
    actionGuidance: actionConfig.guidance || ''
  };

  detail.rowElement = row;
  detail.inlineAcceptButton = null;
  detail.accepted = false;

  if (hasAcceptHandler) {
    detail.onAccept = ({ inlineButton, drawerButton } = {}) => {
      if (detail.accepted || detail.acceptDisabled) {
        return false;
      }
      acceptHandler();
      applyAcceptanceState(detail, { inlineButton, drawerButton });
      return true;
    };
  }

  row.dataset.accepted = 'false';

  rowDetails.set(row, detail);

  const titleCell = document.createElement('td');
  titleCell.className = 'downwork-market__cell downwork-market__cell--title';

  const titleButton = document.createElement('button');
  titleButton.type = 'button';
  titleButton.className = 'downwork-market__title';
  titleButton.dataset.role = 'downwork-title';
  titleButton.textContent = detail.title;
  titleCell.appendChild(titleButton);

  if (model.description) {
    const blurb = document.createElement('span');
    blurb.className = 'downwork-market__description';
    blurb.textContent = model.description;
    titleCell.appendChild(blurb);
  }

  row.appendChild(titleCell);

  const categoryCell = document.createElement('td');
  categoryCell.className = 'downwork-market__cell downwork-market__cell--category';
  if (detail.categoryLabel) {
    const chip = document.createElement('span');
    chip.className = 'downwork-market__chip';
    chip.textContent = detail.categoryLabel;
    categoryCell.appendChild(chip);
  } else {
    categoryCell.textContent = '—';
  }
  row.appendChild(categoryCell);

  const timeCell = document.createElement('td');
  timeCell.className = 'downwork-market__cell downwork-market__cell--time';
  timeCell.textContent = timeLabel;
  row.appendChild(timeCell);

  const payoutCell = document.createElement('td');
  payoutCell.className = 'downwork-market__cell downwork-market__cell--payout';
  payoutCell.textContent = payoutLabel;
  row.appendChild(payoutCell);

  const roiCell = document.createElement('td');
  roiCell.className = 'downwork-market__cell downwork-market__cell--roi';
  roiCell.textContent = roiLabel;
  if ((model.metrics?.roi ?? 0) >= 9) {
    roiCell.classList.add('is-premium');
  }
  row.appendChild(roiCell);

  const slotsCell = document.createElement('td');
  slotsCell.className = 'downwork-market__cell downwork-market__cell--slots';
  slotsCell.textContent = slotsLabel;
  row.appendChild(slotsCell);

  const expiresCell = document.createElement('td');
  expiresCell.className = 'downwork-market__cell downwork-market__cell--expires';
  expiresCell.textContent = expires.label;
  row.appendChild(expiresCell);

  const actionCell = document.createElement('td');
  actionCell.className = 'downwork-market__cell downwork-market__cell--action';

  if (hasCommitments) {
    const badge = document.createElement('span');
    badge.className = 'downwork-market__status downwork-market__status--progress';
    badge.textContent = 'In Progress';
    actionCell.appendChild(badge);
  } else if (primaryOffer) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-market__accept';
    button.textContent = acceptLabel;
    detail.inlineAcceptButton = button;
    if (detail.acceptDisabled) {
      button.disabled = true;
    }
    button.addEventListener('click', () => {
      if (!detail.onAccept) return;
      detail.onAccept({ inlineButton: button });
    });
    actionCell.appendChild(button);
  } else if (visibleUpcoming.length) {
    const badge = document.createElement('span');
    badge.className = 'downwork-market__status downwork-market__status--queued';
    badge.textContent = 'Queued';
    actionCell.appendChild(badge);
  } else if (actionConfig.label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-market__accept is-secondary';
    button.textContent = acceptLabel;
    button.disabled = acceptDisabled;
    if (actionConfig.guidance) {
      button.title = actionConfig.guidance;
    }
    detail.inlineAcceptButton = button;
    if (!acceptDisabled && detail.onAccept) {
      button.addEventListener('click', () => {
        detail.onAccept({ inlineButton: button });
      });
    }
    actionCell.appendChild(button);
  } else {
    const badge = document.createElement('span');
    badge.className = 'downwork-market__status';
    badge.textContent = 'Locked';
    actionCell.appendChild(badge);
  }

  row.appendChild(actionCell);

  return row;
}

function buildShell(body) {
  let container = body.querySelector('.downwork');
  if (container) {
    return container;
  }

  container = document.createElement('div');
  container.className = 'downwork';
  container.dataset.role = 'downwork-app';

  const header = document.createElement('header');
  header.className = 'downwork-header';

  const brand = document.createElement('div');
  brand.className = 'downwork-header__brand';

  const logo = document.createElement('span');
  logo.className = 'downwork-header__logo';
  logo.textContent = 'DW';
  brand.appendChild(logo);

  const identity = document.createElement('div');
  identity.className = 'downwork-header__identity';

  const title = document.createElement('h1');
  title.className = 'downwork-header__title';
  title.textContent = 'DownWork';
  identity.appendChild(title);

  const tagline = document.createElement('p');
  tagline.className = 'downwork-header__tagline';
  tagline.textContent = 'Find gigs. Fill hours. Fund the dream.';
  identity.appendChild(tagline);

  brand.appendChild(identity);
  header.appendChild(brand);

  const controls = document.createElement('div');
  controls.className = 'downwork-header__controls';

  const tabList = document.createElement('div');
  tabList.className = 'downwork-tabs';
  tabList.dataset.role = 'downwork-tabs';

  const tabs = [
    { key: 'active', label: 'Active Hustles' },
    { key: 'market', label: 'Market' },
    { key: 'history', label: 'History' }
  ];

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-tab';
    button.dataset.tab = tab.key;
    button.textContent = tab.label;
    if (tab.key === 'market') {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }
    tabList.appendChild(button);
  });

  controls.appendChild(tabList);

  const status = document.createElement('p');
  status.className = 'downwork-header__status';
  status.dataset.role = 'downwork-status';
  controls.appendChild(status);

  header.appendChild(controls);
  container.appendChild(header);

  const bodyRegion = document.createElement('div');
  bodyRegion.className = 'downwork-body';

  const toolbar = document.createElement('div');
  toolbar.className = 'downwork-market__toolbar';

  const filters = document.createElement('div');
  filters.className = 'downwork-filter-group';

  const filterLabel = document.createElement('p');
  filterLabel.className = 'downwork-filter-group__label';
  filterLabel.textContent = 'Tracks';
  filters.appendChild(filterLabel);

  const pills = document.createElement('div');
  pills.className = 'downwork-filter-pills';
  pills.dataset.role = 'downwork-filter-pills';
  filters.appendChild(pills);

  toolbar.appendChild(filters);

  const sortGroup = document.createElement('label');
  sortGroup.className = 'downwork-sort';
  sortGroup.textContent = 'Sort';

  const sortSelect = document.createElement('select');
  sortSelect.className = 'downwork-sort__select';
  sortSelect.dataset.role = 'downwork-sort';
  [
    { value: 'roi', label: 'Highest ROI' },
    { value: 'time', label: 'Shortest Time' },
    { value: 'expires', label: 'Expiring Soon' },
    { value: 'newest', label: 'Newest' }
  ].forEach(option => {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    sortSelect.appendChild(node);
  });
  sortGroup.appendChild(sortSelect);
  toolbar.appendChild(sortGroup);

  const searchForm = document.createElement('form');
  searchForm.className = 'downwork-search';
  searchForm.setAttribute('role', 'search');
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
  });

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'downwork-search__input';
  searchInput.placeholder = 'Search gigs or keywords...';
  searchInput.dataset.role = 'downwork-search-input';
  searchForm.appendChild(searchInput);
  toolbar.appendChild(searchForm);

  bodyRegion.appendChild(toolbar);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'downwork-table-wrapper';

  const table = document.createElement('table');
  table.className = 'downwork-table';
  table.dataset.role = 'downwork-table';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Gig Title', 'Category', 'Time', 'Payout', 'ROI (/h)', 'Slots', 'Expires', 'Action'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const bodyTable = document.createElement('tbody');
  bodyTable.dataset.role = 'browser-hustle-list';
  table.appendChild(bodyTable);

  tableWrapper.appendChild(table);
  bodyRegion.appendChild(tableWrapper);

  const empty = document.createElement('div');
  empty.className = 'downwork-empty';
  empty.dataset.role = 'downwork-empty';

  const emptyTitle = document.createElement('h2');
  emptyTitle.textContent = 'No gigs right now — the market’s quiet.';
  empty.appendChild(emptyTitle);

  const emptyCopy = document.createElement('p');
  emptyCopy.textContent = 'Check back after the refresh or free up an active slot to see new leads.';
  empty.appendChild(emptyCopy);

  bodyRegion.appendChild(empty);

  container.appendChild(bodyRegion);
  body.appendChild(container);

  buildDrawer(container);

  return container;
}

function syncTabState(container, state) {
  const buttons = container.querySelectorAll('[data-role="downwork-tabs"] .downwork-tab');
  buttons.forEach(button => {
    const selected = button.dataset.tab === state.tab;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function syncCategoryPills(container, categories, state) {
  const host = container.querySelector('[data-role="downwork-filter-pills"]');
  if (!host) return;
  host.innerHTML = '';

  const entries = [
    { key: 'all', label: 'All tracks' },
    ...categories
  ];

  const availableKeys = new Set(entries.map(entry => entry.key));
  if (!availableKeys.has(state.category)) {
    state.category = 'all';
  }

  entries.forEach(entry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-pill';
    button.dataset.category = entry.key;
    button.textContent = entry.label;
    if (entry.key === state.category) {
      button.classList.add('is-active');
    }
    host.appendChild(button);
  });
}

function sortRows(rows = [], sortKey = 'roi') {
  const cloned = [...rows];
  cloned.sort((a, b) => {
    const numeric = (node, key) => {
      if (key === 'newest') {
        return Number(node.dataset.position || '0');
      }
      return Number(node.dataset[key] || '0');
    };

    switch (sortKey) {
      case 'time':
        return numeric(a, 'time') - numeric(b, 'time');
      case 'expires':
        return numeric(a, 'expires') - numeric(b, 'expires');
      case 'newest':
        return numeric(b, 'position') - numeric(a, 'position');
      case 'roi':
      default:
        return numeric(b, 'roi') - numeric(a, 'roi');
    }
  });
  return cloned;
}

function applyFilters(container, state) {
  const body = container.querySelector('[data-role="browser-hustle-list"]');
  if (!body) return;

  const term = state.search.trim().toLowerCase();
  const rows = Array.from(body.querySelectorAll('[data-role="downwork-row"]'));
  const visibleRows = [];
  const hiddenRows = [];

  rows.forEach(row => {
    let visible = true;

    if (state.tab === 'active') {
      visible = row.dataset.hasCommitments === 'true';
    } else if (state.tab === 'history') {
      visible = row.dataset.hasHistory === 'true';
    } else {
      const offers = Number(row.dataset.availableOffers || '0');
      const upcoming = Number(row.dataset.upcomingOffers || '0');
      visible = offers + upcoming > 0 || row.dataset.hasCommitments === 'true';
    }

    if (visible && state.category !== 'all') {
      visible = (row.dataset.marketCategory || '') === state.category;
    }

    if (visible && term) {
      const haystack = `${row.dataset.search || ''} ${row.textContent || ''}`.toLowerCase();
      visible = haystack.includes(term);
    }

    row.hidden = !visible;
    if (visible) {
      visibleRows.push(row);
    } else {
      hiddenRows.push(row);
    }
  });

  const sortedVisible = sortRows(visibleRows, state.sort);
  sortedVisible.forEach(row => body.appendChild(row));
  hiddenRows.forEach(row => body.appendChild(row));

  const empty = container.querySelector('[data-role="downwork-empty"]');
  if (empty) {
    empty.hidden = sortedVisible.length > 0;
  }
}

function bindInteractions(container) {
  const state = getDownworkState(container);

  const tabs = container.querySelector('[data-role="downwork-tabs"]');
  if (tabs && !tabs.dataset.bound) {
    tabs.addEventListener('click', event => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      state.tab = button.dataset.tab || 'market';
      syncTabState(container, state);
      applyFilters(container, state);
    });
    tabs.dataset.bound = 'true';
  }

  const pills = container.querySelector('[data-role="downwork-filter-pills"]');
  if (pills && !pills.dataset.bound) {
    pills.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category || 'all';
      pills.querySelectorAll('.downwork-pill').forEach(pill => {
        const selected = pill.dataset.category === state.category;
        pill.classList.toggle('is-active', selected);
      });
      applyFilters(container, state);
    });
    pills.dataset.bound = 'true';
  }

  const search = container.querySelector('[data-role="downwork-search-input"]');
  if (search && !search.dataset.bound) {
    search.addEventListener('input', () => {
      state.search = search.value || '';
      applyFilters(container, state);
    });
    search.dataset.bound = 'true';
  }

  const sort = container.querySelector('[data-role="downwork-sort"]');
  if (sort && !sort.dataset.bound) {
    sort.addEventListener('change', () => {
      state.sort = sort.value;
      applyFilters(container, state);
    });
    sort.dataset.bound = 'true';
  }

  const table = container.querySelector('[data-role="downwork-table"]');
  if (table && !table.dataset.bound) {
    table.addEventListener('click', event => {
      const trigger = event.target.closest('[data-role="downwork-title"]');
      if (!trigger) return;
      const row = trigger.closest('[data-role="downwork-row"]');
      if (!row) return;
      const detail = rowDetails.get(row);
      openDrawer(container, detail);
    });
    table.dataset.bound = 'true';
  }

  const drawer = container.querySelector('[data-role="downwork-drawer"]');
  if (drawer && !drawer.dataset.bound) {
    drawer.addEventListener('click', event => {
      if (event.target.closest('[data-role="downwork-drawer-close"]')) {
        closeDrawer(drawer);
      }
    });
    drawer.dataset.bound = 'true';
  }
}

function summarizeLimits(models = []) {
  let tracked = false;
  let total = 0;
  models.forEach(model => {
    const remaining = Number(model.filters?.limitRemaining);
    if (Number.isFinite(remaining)) {
      tracked = true;
      total += remaining;
    }
  });

  if (!tracked) return '';
  if (total <= 0) {
    return 'All hustle slots filled.';
  }
  const label = total === 1 ? 'run' : 'runs';
  return `${total} ${label} left today`;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    buildShell(body);
  });

  if (!refs) return null;

  const container = refs.body.querySelector('.downwork');
  const list = container?.querySelector('[data-role="browser-hustle-list"]');
  if (!container || !list) return null;
  list.innerHTML = '';

  const drawer = container.querySelector('[data-role="downwork-drawer"]');
  if (drawer && drawer.classList.contains('is-open')) {
    closeDrawer(drawer);
  }

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;
  let commitmentCount = 0;
  let upcomingCount = 0;
  const state = getDownworkState(container);
  const categories = new Map();

  definitions.forEach((definition, index) => {
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
      card.dataset.position = String(index);
      const categoryKey = card.dataset.marketCategory || '';
      if (categoryKey && !categories.has(categoryKey)) {
        const label = model.labels?.category || model.categoryLabel || categoryKey;
        categories.set(categoryKey, label);
      }
      list.appendChild(card);
    }
  });

  const categoryEntries = Array.from(categories.entries()).map(([key, label]) => ({ key, label }));
  syncCategoryPills(container, categoryEntries, state);
  bindInteractions(container);
  syncTabState(container, state);
  const sortControl = container.querySelector('[data-role="downwork-sort"]');
  if (sortControl && sortControl.value !== state.sort) {
    sortControl.value = state.sort;
  }
  applyFilters(container, state);

  const status = container.querySelector('[data-role="downwork-status"]');
  const limitSummary = summarizeLimits(models);
  const countsSummary = describeCounts({ availableCount, upcomingCount, commitmentCount });
  if (status) {
    status.textContent = limitSummary || countsSummary;
  }

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
