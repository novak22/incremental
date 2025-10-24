import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import renderHustles from '../../../../src/ui/views/browser/apps/hustles.js';
import { getState, defaultStateManager } from '../../../../src/core/state.js';

function setupDom() {
  const dom = new JSDOM('<main id="app-root"></main>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

function mockSessionState(options = {}) {
  const { quickFilters, downwork } = options || {};
  const previousState = defaultStateManager.state;
  const originalGetUpgradeState = defaultStateManager.getUpgradeState;

  const downworkConfig = { quickFilters: [] };

  if (Array.isArray(quickFilters)) {
    downworkConfig.quickFilters = [...quickFilters];
  }

  if (downwork && typeof downwork === 'object') {
    Object.entries(downwork).forEach(([key, value]) => {
      downworkConfig[key] = Array.isArray(value) ? [...value] : value;
    });
    if (Array.isArray(downwork.quickFilters)) {
      downworkConfig.quickFilters = [...downwork.quickFilters];
    }
  }

  const mockState = {
    money: 0,
    timeLeft: 0,
    baseTime: 0,
    bonusTime: 0,
    day: 1,
    upgrades: {
      assistant: { count: 0 }
    },
    session: {
      config: {
        downwork: downworkConfig
      }
    }
  };

  defaultStateManager.state = mockState;
  defaultStateManager.getUpgradeState = function mockGetUpgradeState(
    id,
    target = this.state
  ) {
    const resolvedState = target || this.state || {};
    const upgrades =
      resolvedState && typeof resolvedState.upgrades === 'object'
        ? resolvedState.upgrades
        : {};
    if (!id) {
      return upgrades || {};
    }
    return upgrades[id] || {};
  };

  return () => {
    defaultStateManager.state = previousState;
    defaultStateManager.getUpgradeState = originalGetUpgradeState;
  };
}

function createMetrics({ timeValue, timeLabel, payoutValue, payoutLabel, roiValue }) {
  return {
    time: { value: timeValue ?? 0, label: timeLabel || '' },
    payout: { value: payoutValue ?? 0, label: payoutLabel || '' },
    roi: roiValue ?? 0
  };
}

function createRequirements(summary = 'No requirements', items = []) {
  return { summary, items };
}

function buildFilters({
  name = '',
  description = '',
  metrics = createMetrics({}),
  available = false,
  category = 'hustle',
  categoryLabel = 'Hustle',
  limit = null,
  offerId = null,
  status = 'upcoming',
  overrides = {}
} = {}) {
  const search = `${name || ''} ${description || ''}`.trim().toLowerCase();
  return {
    search,
    time: metrics.time?.value ?? 0,
    payout: metrics.payout?.value ?? 0,
    roi: metrics.roi ?? 0,
    available: Boolean(available),
    limitRemaining: limit?.remaining ?? null,
    tag: '',
    category,
    actionCategory: category,
    categoryLabel,
    templateKind: '',
    marketCategory: '',
    offerId,
    status,
    ...overrides
  };
}

function createOfferModel({
  definitionId,
  offerId,
  name,
  description,
  badges = [],
  tags = [],
  category = 'hustle',
  categoryLabel = 'Hustle',
  metrics = createMetrics({}),
  requirements = createRequirements(),
  action = null,
  offer = null,
  available = false,
  status = 'upcoming',
  limit = null,
  commitments = [],
  filters = {}
} = {}) {
  const mergedFilters = buildFilters({
    name,
    description,
    metrics,
    available,
    category,
    categoryLabel,
    limit,
    offerId,
    status,
    overrides: filters
  });

  return {
    id: `${definitionId}:${offerId}`,
    definitionId,
    offerId,
    name,
    description,
    badges,
    tags,
    tag: null,
    templateKind: '',
    actionCategory: category,
    category,
    categoryLabel,
    descriptors: {},
    labels: { category: categoryLabel },
    metrics,
    requirements,
    limit,
    action,
    available: Boolean(available),
    status,
    offer,
    commitments,
    filters: mergedFilters,
    seat: null
  };
}

function createPlaceholderModel({
  definitionId,
  name,
  description,
  badges = [],
  tags = [],
  category = 'hustle',
  categoryLabel = 'Hustle',
  metrics = createMetrics({}),
  requirements = createRequirements(),
  action = null,
  limit = null,
  commitments = [],
  filters = {}
} = {}) {
  const mergedFilters = buildFilters({
    name,
    description,
    metrics,
    available: false,
    category,
    categoryLabel,
    limit,
    offerId: null,
    status: 'placeholder',
    overrides: filters
  });

  return {
    id: `${definitionId}:placeholder`,
    definitionId,
    offerId: null,
    name,
    description,
    badges,
    tags,
    tag: null,
    templateKind: '',
    actionCategory: category,
    category,
    categoryLabel,
    descriptors: {},
    labels: { category: categoryLabel },
    metrics,
    requirements,
    limit,
    action,
    available: false,
    status: 'placeholder',
    offer: null,
    commitments,
    filters: mergedFilters,
    seat: null
  };
}

test('renderHustles renders unified offer feed with metrics, CTA wiring, and filters', () => {
  const dom = setupDom();
  const acceptLog = [];
  const actionLog = [];
  const context = {
    stats: { focusHoursRemaining: 5 },
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const definitions = [
    {
      id: 'priority-hustle',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      action: {
        label: 'Accept Ready Offer',
        className: 'primary',
        onClick: () => actionLog.push('model-action'),
        guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
      }
    },
    {
      id: 'slow-burn',
      name: 'Slow Burn Hustle',
      description: 'Plan ahead for this sprint.',
      action: { label: 'Prep outreach', className: 'secondary', disabled: true }
    }
  ];

  const priorityMetrics = createMetrics({
    timeValue: 2,
    timeLabel: '2h focus',
    payoutValue: 50,
    payoutLabel: '$50 payout',
    roiValue: 25
  });
  const slowBurnMetrics = createMetrics({
    timeValue: 4,
    timeLabel: '4h focus',
    payoutValue: 120,
    payoutLabel: '$120 payout',
    roiValue: 30
  });
  const baseRequirements = createRequirements('No requirements', []);

  const models = [
    createOfferModel({
      definitionId: 'priority-hustle',
      offerId: 'offer-ready-primary',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      badges: ['Skill XP Bonus', 'Remote-friendly'],
      tags: ['writing', 'remote'],
      category: 'writing',
      categoryLabel: 'Writing',
      metrics: priorityMetrics,
      requirements: baseRequirements,
      action: {
        label: 'Accept Ready Offer',
        disabled: false,
        className: 'primary',
        onClick: () => actionLog.push('model-action'),
        guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
      },
      offer: {
        id: 'offer-ready-primary',
        label: 'Ready Contract A',
        description: 'Open now',
        meta: 'Available now • 2h focus',
        payout: 50,
        ready: true,
        availableIn: 0,
        hoursRequired: 2,
        expiresIn: 1,
        acceptLabel: 'Queue this lead',
        locked: false,
        onAccept: () => acceptLog.push('offer-ready-primary'),
        action: {
          label: 'Accept Ready Offer',
          disabled: false,
          className: 'primary',
          guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.',
          onClick: () => actionLog.push('offer-ready-primary-action')
        }
      },
      available: true,
      status: 'ready'
    }),
    createOfferModel({
      definitionId: 'priority-hustle',
      offerId: 'offer-ready-secondary',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      badges: ['Skill XP Bonus', 'Remote-friendly'],
      tags: ['writing', 'remote'],
      category: 'writing',
      categoryLabel: 'Writing',
      metrics: priorityMetrics,
      requirements: baseRequirements,
      action: {
        label: 'Accept Ready Offer',
        disabled: false,
        className: 'primary',
        onClick: () => actionLog.push('model-action'),
        guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
      },
      offer: {
        id: 'offer-ready-secondary',
        label: 'Ready Contract B',
        description: 'Second slot',
        meta: 'Available now • 3h focus',
        payout: 80,
        ready: true,
        availableIn: 0,
        hoursRequired: 3,
        expiresIn: 2,
        locked: false,
        onAccept: () => acceptLog.push('offer-ready-secondary'),
        action: {
          label: 'Accept Ready Offer',
          disabled: false,
          className: 'primary',
          guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.',
          onClick: () => actionLog.push('offer-ready-secondary-action')
        }
      },
      available: true,
      status: 'ready'
    }),
    createOfferModel({
      definitionId: 'priority-hustle',
      offerId: 'offer-soon',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      badges: ['Skill XP Bonus', 'Remote-friendly'],
      tags: ['writing', 'remote'],
      category: 'writing',
      categoryLabel: 'Writing',
      metrics: priorityMetrics,
      requirements: baseRequirements,
      action: {
        label: 'Opens in 2 days',
        disabled: true,
        className: 'primary',
        onClick: null,
        guidance: 'Next wave unlocks tomorrow. Prep now so you\'re ready to accept and start logging progress.'
      },
      offer: {
        id: 'offer-soon',
        label: 'Coming Soon',
        description: 'Opens tomorrow',
        meta: 'Opens in 2 days',
        payout: 60,
        ready: false,
        availableIn: 2,
        hoursRequired: 2,
        expiresIn: 3,
        locked: false,
        onAccept: () => acceptLog.push('offer-soon'),
        action: {
          label: 'Opens in 2 days',
          disabled: true,
          className: 'primary',
          guidance:
            'Next wave unlocks tomorrow. Prep now so you\'re ready to accept and start logging progress.',
          onClick: null
        }
      },
      available: false,
      status: 'upcoming'
    }),
    createOfferModel({
      definitionId: 'slow-burn',
      offerId: 'offer-slow',
      name: 'Slow Burn Hustle',
      description: 'Plan ahead for this sprint.',
      badges: [],
      category: 'community',
      categoryLabel: 'Community',
      metrics: slowBurnMetrics,
      requirements: createRequirements('Requires level 2', []),
      action: {
        label: 'Opens in 1 day',
        disabled: true,
        className: 'primary',
        onClick: null,
        guidance: 'Queue another gig to unlock this lane.'
      },
      offer: {
        id: 'offer-slow',
        label: 'Audience Sprint',
        description: 'Warm up leads',
        meta: 'Opens tomorrow',
        payout: 120,
        ready: false,
        availableIn: 1,
        hoursRequired: 4,
        expiresIn: 4,
        locked: false,
        onAccept: () => acceptLog.push('offer-slow'),
        action: {
          label: 'Opens in 1 day',
          disabled: true,
          className: 'primary',
          guidance: 'Queue another gig to unlock this lane.',
          onClick: null
        }
      },
      available: false,
      status: 'upcoming'
    })
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.equal(result?.meta, 'Keep the loop rolling — $250 potential on the board.');

    assert.equal(document.querySelectorAll('.downwork-tab').length, 0, 'expected legacy tabs to be removed');

    const board = document.querySelector('[data-role="downwork-board"]');
    assert.ok(board, 'expected board shell to render');

    const summaryStats = document.querySelectorAll('.downwork-summary__stat');
    assert.equal(summaryStats.length, 3, 'expected three summary stats to render');
    assert.equal(document.querySelector('[data-role="downwork-focus-value"]').textContent, '5h');
    assert.equal(document.querySelector('[data-role="downwork-accepted-value"]').textContent, '0');
    assert.equal(document.querySelector('[data-role="downwork-payout-value"]').textContent, '$250');

    const filterShell = document.querySelector('.downwork-marketplace__filters');
    assert.ok(filterShell, 'expected filter grid wrapper');
    const quickFilters = document.querySelectorAll('button[data-filter-id]');
    assert.equal(quickFilters.length, 4, 'expected quick filter pills');
    const categoryFilters = document.querySelectorAll('button[data-category-id]');
    const categoryFilterIds = [...categoryFilters]
      .map(button => button.dataset.categoryId)
      .sort();
    assert.deepEqual(categoryFilterIds, ['community', 'writing'], 'expected hustle category filters to match categories');

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = [...list.querySelectorAll('.downwork-card')];
    assert.equal(cards.length, 4, 'expected unified feed to render one card per task');
    assert.equal(
      cards.filter(card => card.dataset.definitionId === 'priority-hustle').length,
      3,
      'expected each priority hustle offer to render separately'
    );

    const readyCards = cards.filter(
      card => card.dataset.definitionId === 'priority-hustle' && card.dataset.available === 'true'
    );
    assert.equal(readyCards.length, 2, 'expected two ready priority hustle cards');
    assert.deepEqual(
      readyCards.map(card => card.dataset.offerId),
      ['offer-ready-secondary', 'offer-ready-primary'],
      'expected ready cards to expose offer-specific ids'
    );

    const [topCard, nextCard] = readyCards;
    assert.ok(topCard, 'expected high payout card to render first');
    assert.equal(topCard.dataset.time, '3');
    assert.equal(topCard.dataset.payout, '80');
    assert.equal(topCard.dataset.roi, '25');
    assert.ok(topCard.querySelector('.downwork-card__metrics').textContent.includes('📈 ROI'));
    const topSummary = topCard.querySelector('.browser-card__summary');
    assert.ok(topSummary, 'expected high payout card to include summary copy');
    assert.equal(topSummary.textContent, 'Lock this contract now.');
    assert.equal(topCard.querySelectorAll('.browser-card__badge').length, 2, 'expected high payout card badges');
    assert.equal(topCard.querySelectorAll('.downwork-card__tag').length, 2, 'expected high payout card tags');
    assert.equal(topCard.querySelector('.browser-card__meta')?.textContent, 'No requirements');
    assert.equal(topCard.querySelectorAll('.hustle-card__offer').length, 1, 'expected high payout card to show one ready offer');
    assert.equal(
      topCard.querySelectorAll('.hustle-card__offer.is-upcoming').length,
      0,
      'expected high payout card to omit nested upcoming offers'
    );

    assert.ok(nextCard, 'expected second ready card for priority hustle');
    assert.equal(nextCard.dataset.time, '2');
    assert.equal(nextCard.dataset.payout, '50');
    assert.equal(nextCard.dataset.roi, '25');
    const nextSummary = nextCard.querySelector('.browser-card__summary');
    assert.ok(nextSummary, 'expected second card to include summary copy');
    assert.equal(nextSummary.textContent, 'Lock this contract now.');
    assert.equal(nextCard.querySelectorAll('.browser-card__badge').length, 2, 'expected second card badges');
    assert.equal(nextCard.querySelectorAll('.downwork-card__tag').length, 2, 'expected second card tags');
    assert.ok(nextCard.querySelector('.browser-card__meta'), 'expected second card requirements summary');

    const priorityUpcomingCard = cards.find(card =>
      card.dataset.definitionId === 'priority-hustle' && card.dataset.available === 'false'
    );
    assert.ok(priorityUpcomingCard, 'expected upcoming priority hustle card to render separately');
    assert.equal(priorityUpcomingCard.dataset.offerId, 'offer-soon');
    assert.equal(
      priorityUpcomingCard.querySelectorAll('.hustle-card__offer').length,
      1,
      'expected upcoming card to render a single queued offer'
    );
    assert.equal(
      priorityUpcomingCard.querySelector('.browser-card__section-title')?.textContent,
      'Opening soon',
      'expected upcoming card to retain upcoming section heading'
    );

    const upcomingCard = cards.find(card =>
      card.dataset.definitionId === 'slow-burn' && card.dataset.available === 'false'
    );
    assert.ok(upcomingCard, 'expected upcoming hustle card to be present');
    assert.equal(upcomingCard.dataset.available, 'false');
    assert.equal(upcomingCard.dataset.definitionId, 'slow-burn');
    assert.equal(upcomingCard.dataset.offerId, 'offer-slow');
    assert.ok(
      upcomingCard.querySelector('.browser-card__summary'),
      'expected upcoming primary card to keep descriptive summary'
    );
    assert.ok(
      [...upcomingCard.querySelectorAll('.browser-card__section-title')]
        .some(node => node.textContent === 'Opening soon'),
      'expected upcoming card to surface opening soon section'
    );

    const primaryAction = nextCard.querySelector('.browser-card__actions .browser-card__button--primary');
    assert.ok(primaryAction, 'expected primary hustle CTA');
    assert.equal(primaryAction.textContent, 'Accept Ready Offer');
    primaryAction.click();
    assert.deepEqual(actionLog, ['offer-ready-primary-action']);

    const readyOfferButton = nextCard.querySelector('.hustle-card__offer:not(.is-upcoming) .browser-card__button');
    assert.ok(readyOfferButton, 'expected ready offer button to render');
    assert.equal(readyOfferButton.textContent, 'Queue this lead');
    readyOfferButton.click();
    assert.deepEqual(acceptLog, ['offer-ready-primary']);

    assert.equal(document.querySelector('[data-role="downwork-focus-value"]').textContent, '3h');
    assert.equal(document.querySelector('[data-role="downwork-accepted-value"]').textContent, '1');
    assert.equal(document.querySelector('[data-role="downwork-payout-value"]').textContent, '$200');

    const toast = document.querySelector('[data-role="downwork-toast-host"] .downwork-toast');
    assert.ok(toast, 'expected toast after accepting an offer');
    assert.ok(toast.textContent.includes('Added to your hustle queue'));

    const shortTaskFilter = document.querySelector('button[data-filter-id="shortTasks"]');
    shortTaskFilter.click();
    assert.ok(shortTaskFilter.classList.contains('is-active'));
    assert.equal(shortTaskFilter.getAttribute('aria-pressed'), 'true');
    assert.ok(board.classList.contains('is-filtered'));
    assert.ok(list.classList.contains('is-filtered'));
    assert.equal(list.querySelectorAll('.downwork-card').length, 2, 'expected quick filter to narrow results');

    const highPayoutFilter = document.querySelector('button[data-filter-id="highPayout"]');
    highPayoutFilter.click();
    const filteredEmpty = list.querySelector('.browser-empty--compact');
    assert.ok(filteredEmpty, 'expected filtered empty state when filters conflict');
    assert.equal(
      filteredEmpty.textContent,
      'No gigs match these filters yet. Adjust or clear a filter to see more leads.'
    );

    highPayoutFilter.click();
    shortTaskFilter.click();
    assert.equal(list.querySelectorAll('.downwork-card').length, 4, 'expected cards to return after clearing filters');
    assert.ok(!board.classList.contains('is-filtered'));
    assert.ok(!list.classList.contains('is-filtered'));
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('renderHustles omits locked offers from DownWork feed', () => {
  const dom = setupDom();
  const context = {
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const definitions = [
    {
      id: 'locked-filter',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      action: { label: 'Legacy' }
    }
  ];

  const metrics = createMetrics({
    timeValue: 1,
    timeLabel: '1h',
    payoutValue: 25,
    payoutLabel: '$25',
    roiValue: 25
  });
  const requirements = createRequirements('No requirements', []);

  const models = [
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-locked',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics,
      requirements,
      action: {
        label: 'Accept Open Offer',
        disabled: false,
        className: 'primary',
        onClick: () => {}
      },
      offer: {
        id: 'offer-locked',
        label: 'Locked Ready Offer',
        description: 'Hidden because locked.',
        meta: 'Locked meta',
        payout: 25,
        ready: true,
        availableIn: 0,
        expiresIn: 2,
        locked: true
      },
      available: true,
      status: 'ready'
    }),
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-open',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics,
      requirements,
      action: {
        label: 'Accept Open Offer',
        disabled: false,
        className: 'primary',
        onClick: () => {}
      },
      offer: {
        id: 'offer-open',
        label: 'Open Ready Offer',
        description: 'Visible offer.',
        meta: 'Open now',
        payout: 25,
        ready: true,
        availableIn: 0,
        expiresIn: 2,
        locked: false
      },
      available: true,
      status: 'ready'
    }),
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-locked-upcoming',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics,
      requirements,
      action: {
        label: 'Opens soon',
        disabled: true,
        className: 'primary',
        onClick: null
      },
      offer: {
        id: 'offer-locked-upcoming',
        label: 'Locked Upcoming Offer',
        description: 'Hidden upcoming offer.',
        meta: 'Locked upcoming',
        payout: 25,
        ready: false,
        availableIn: 2,
        expiresIn: 3,
        locked: true
      },
      available: false,
      status: 'upcoming'
    }),
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-open-upcoming',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics,
      requirements,
      action: {
        label: 'Opens in 1 day',
        disabled: true,
        className: 'primary',
        onClick: null
      },
      offer: {
        id: 'offer-open-upcoming',
        label: 'Open Upcoming Offer',
        description: 'Visible upcoming offer.',
        meta: 'Unlocks soon',
        payout: 25,
        ready: false,
        availableIn: 1,
        expiresIn: 4,
        locked: false
      },
      available: false,
      status: 'upcoming'
    })
  ];

  try {
    renderHustles(context, definitions, models);

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? [...list.querySelectorAll('.downwork-card')] : [];
    assert.equal(cards.length, 2, 'expected unlocked offers to render on separate cards');

    const offerTitles = [...document.querySelectorAll('.hustle-card__title')]
      .map(node => node.textContent.trim());
    assert.ok(offerTitles.includes('Open Ready Offer'), 'expected unlocked offer to remain visible');
    assert.ok(!offerTitles.includes('Locked Ready Offer'), 'expected locked offer to be hidden');
    assert.ok(offerTitles.includes('Open Upcoming Offer'), 'expected unlocked upcoming to remain visible');
    assert.ok(!offerTitles.includes('Locked Upcoming Offer'), 'expected locked upcoming offer to be hidden');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('renderHustles renders multiple upcoming-only offers without duplication', () => {
  const dom = setupDom();
  const context = {
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const upcomingOffers = [
    {
      id: 'upcoming-alpha',
      label: 'Alpha Contract',
      description: 'First to unlock.',
      meta: 'Opens tomorrow',
      payout: 40,
      ready: false,
      availableIn: 1,
      expiresIn: 3
    },
    {
      id: 'upcoming-beta',
      label: 'Beta Contract',
      description: 'Queue this next.',
      meta: 'Opens in two days',
      payout: 55,
      ready: false,
      availableIn: 2,
      expiresIn: 4
    },
    {
      id: 'upcoming-gamma',
      label: 'Gamma Contract',
      description: 'Warm the leads.',
      meta: 'Opens in three days',
      payout: 65,
      ready: false,
      availableIn: 3,
      expiresIn: 5
    }
  ];

  const definitions = [
    {
      id: 'upcoming-only',
      name: 'Upcoming Only Hustle',
      description: 'Plan ahead while slots unlock.',
      action: { label: 'Check back soon', className: 'secondary', disabled: true }
    }
  ];

  const upcomingMetrics = createMetrics({
    timeValue: 2,
    timeLabel: '2h focus',
    payoutValue: 60,
    payoutLabel: '$60 payout',
    roiValue: 30
  });
  const upcomingRequirements = createRequirements('No requirements', []);

  const models = upcomingOffers.map(offer =>
    createOfferModel({
      definitionId: 'upcoming-only',
      offerId: offer.id,
      name: 'Upcoming Only Hustle',
      description: 'Plan ahead while slots unlock.',
      badges: [],
      category: 'ops',
      categoryLabel: 'Ops',
      metrics: upcomingMetrics,
      requirements: upcomingRequirements,
      action: {
        label: offer.availableIn === 1 ? 'Opens in 1 day' : `Opens in ${offer.availableIn} days`,
        disabled: true,
        className: 'primary',
        onClick: null
      },
      offer: {
        ...offer,
        locked: false
      },
      available: false,
      status: 'upcoming'
    })
  );

  try {
    renderHustles(context, definitions, models);

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? [...list.querySelectorAll('.downwork-card')] : [];
    assert.equal(cards.length, upcomingOffers.length, 'expected one card per upcoming offer');

    upcomingOffers.forEach(offer => {
      const occurrences = [...document.querySelectorAll('.hustle-card__title')]
        .filter(node => node.textContent.trim() === offer.label).length;
      assert.equal(occurrences, 1, `expected ${offer.label} to appear once`);
    });

    cards.forEach(card => {
      const upcomingHeadings = [...card.querySelectorAll('.browser-card__section-title')]
        .filter(node => node.textContent === 'Opening soon');
      assert.equal(upcomingHeadings.length, 1, 'expected a single upcoming section per card');
    });
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('renderHustles syncs quick filter state with session config', () => {
  const dom = setupDom();
  const restoreState = mockSessionState({
    downwork: { quickFilters: ['shortTasks'], sortKey: ' readyFirst ' }
  });
  const state = getState();
  state.session.config.downwork = {
    quickFilters: ['shortTasks'],
    categoryFilters: ['legacy-lane'],
    activeCategory: 'writing',
    sortKey: ' readyFirst '
  };

  const context = {
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const definitions = [
    {
      id: 'session-filter',
      name: 'Session Filter Hustle',
      description: 'Persists quick filters.',
      action: { label: 'Accept offer', disabled: false }
    }
  ];

  const models = [
    createOfferModel({
      definitionId: 'session-filter',
      offerId: 'offer-ready',
      name: 'Session Filter Hustle',
      description: 'Persists quick filters.',
      badges: [],
      tags: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics: {
        time: { value: 1, label: '1h' },
        payout: { value: 20, label: '$20' },
        roi: 20
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Accept offer',
        disabled: false,
        onClick: () => {}
      },
      offer: {
        id: 'offer-ready',
        label: 'Ready Offer',
        description: 'Open now',
        meta: 'Available now • 1h focus',
        payout: 20,
        ready: true,
        availableIn: 0,
        expiresIn: 1,
        onAccept: () => {}
      },
      available: true,
      status: 'ready'
    })
  ];

  try {
    renderHustles(context, definitions, models);
    let config = getState().session.config.downwork;
    assert.deepEqual(config.quickFilters, ['shortTasks']);
    assert.equal(config.sortKey, 'readyFirst');
    assert.ok(!('categoryFilters' in config), 'expected legacy category filters to be removed');
    assert.ok(!('activeCategory' in config), 'expected legacy active category to be removed');
    const savedFilter = document.querySelector('button[data-filter-id="shortTasks"]');
    assert.ok(savedFilter?.classList.contains('is-active'), 'saved quick filter should start active');

    const payoutFilter = document.querySelector('button[data-filter-id="highPayout"]');
    assert.ok(payoutFilter, 'expected high payout quick filter');
    payoutFilter.click();

    config = getState().session.config.downwork;
    assert.deepEqual(config.quickFilters, ['highPayout', 'shortTasks']);
    assert.equal(config.sortKey, 'readyFirst');
    assert.ok(!('categoryFilters' in config));
    assert.ok(!('activeCategory' in config));

    savedFilter.click();
    config = getState().session.config.downwork;
    assert.deepEqual(config.quickFilters, ['highPayout']);
    assert.equal(config.sortKey, 'readyFirst');
    assert.ok(!('categoryFilters' in config));
    assert.ok(!('activeCategory' in config));
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    restoreState();
  }
});

test('renderHustles hides categories without unlocked offers', () => {
  const dom = setupDom();
  const context = {
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const definitions = [
    {
      id: 'locked-filter',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      action: { label: 'Legacy' }
    }
  ];

  const lockedMetrics = createMetrics({
    timeValue: 1,
    timeLabel: '1h',
    payoutValue: 25,
    payoutLabel: '$25',
    roiValue: 25
  });
  const lockedRequirements = createRequirements('No requirements', []);

  const models = [
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-locked',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics: lockedMetrics,
      requirements: lockedRequirements,
      action: {
        label: 'Locked — Hidden',
        disabled: true,
        className: 'primary',
        onClick: null
      },
      offer: {
        id: 'offer-locked',
        label: 'Locked Ready Offer',
        description: 'Hidden because locked.',
        meta: 'Locked meta',
        payout: 25,
        ready: true,
        availableIn: 0,
        expiresIn: 2,
        locked: true
      },
      available: true,
      status: 'ready'
    }),
    createOfferModel({
      definitionId: 'locked-filter',
      offerId: 'offer-locked-upcoming',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics: lockedMetrics,
      requirements: lockedRequirements,
      action: {
        label: 'Opens soon',
        disabled: true,
        className: 'primary',
        onClick: null
      },
      offer: {
        id: 'offer-locked-upcoming',
        label: 'Locked Upcoming Offer',
        description: 'Hidden upcoming offer.',
        meta: 'Locked upcoming',
        payout: 25,
        ready: false,
        availableIn: 2,
        expiresIn: 3,
        locked: true
      },
      available: false,
      status: 'upcoming'
    })
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.equal(result?.meta, 'No actions ready yet — accept your next contract to kick things off.');

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? list.querySelectorAll('.downwork-card') : [];
    assert.equal(cards.length, 0, 'expected no hustle cards to render');

    const emptyMessage = list?.querySelector('.browser-empty--compact');
    assert.ok(emptyMessage, 'expected empty state when no unlocked actions exist');
    assert.equal(emptyMessage.textContent, 'Queue an action to see it spotlighted here.');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('renderHustles falls back to empty-state language when no offers exist', () => {
  const dom = setupDom();
  const context = {
    ensurePageContent: (_page, builder) => {
      const body = document.createElement('div');
      builder({ body });
      document.body.appendChild(body);
      return { body };
    }
  };

  const definitions = [
    {
      id: 'empty-hustle',
      name: 'Empty Hustle',
      description: 'Waiting on the next drop.',
      action: { label: 'Legacy' }
    }
  ];

  const models = [
    createPlaceholderModel({
      definitionId: 'empty-hustle',
      name: 'Empty Hustle',
      description: 'Waiting on the next drop.',
      badges: [],
      tags: [],
      category: 'hustle',
      categoryLabel: 'Hustle',
      metrics: createMetrics({
        timeValue: 2,
        timeLabel: '2h',
        payoutValue: 80,
        payoutLabel: '$80',
        roiValue: 40
      }),
      requirements: createRequirements('No requirements', []),
      action: {
        label: 'Check back tomorrow',
        disabled: true,
        className: 'secondary',
        onClick: null,
        guidance: 'Fresh leads roll in with tomorrow\'s refresh. Accept the next hustle to keep momentum.'
      },
      commitments: []
    })
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.equal(result?.meta, 'No actions ready yet — accept your next contract to kick things off.');

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? list.querySelectorAll('.downwork-card') : [];
    assert.equal(cards.length, 1, 'expected placeholder hustle card when no offers exist');
    assert.equal(cards[0]?.dataset.definitionId, 'empty-hustle');
    assert.equal(cards[0]?.dataset.offerId, 'empty-hustle:placeholder');
    assert.equal(cards[0]?.dataset.available, 'false');
    assert.ok(!list?.querySelector('.browser-empty--compact'), 'expected placeholder card instead of empty message');

    const button = document.querySelector('.browser-card__actions .browser-card__button');
    assert.ok(button, 'expected fallback button');
    assert.equal(button.textContent, 'Check back tomorrow');
    assert.equal(button.disabled, true);

    const guidance = document.querySelector('.browser-card__note');
    assert.ok(guidance?.textContent.includes('Accept the next hustle'));
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
