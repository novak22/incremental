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

  const models = [
    {
      id: 'priority-hustle',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      badges: ['Skill XP Bonus', 'Remote-friendly'],
      tags: ['writing', 'remote'],
      actionCategory: 'writing',
      metrics: {
        time: { value: 2, label: '2h focus' },
        payout: { value: 50, label: '$50 payout' },
        roi: 25
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Accept Ready Offer',
        disabled: false,
        className: 'primary',
        onClick: () => actionLog.push('model-action'),
        guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
      },
      available: true,
      offers: [
        {
          id: 'offer-ready-primary',
          label: 'Ready Contract A',
          description: 'Open now',
          meta: 'Available now • 2h focus',
          payout: 50,
          ready: true,
          hoursRequired: 2,
          expiresIn: 1,
          acceptLabel: 'Queue this lead',
          onAccept: () => acceptLog.push('offer-ready-primary')
        },
        {
          id: 'offer-ready-secondary',
          label: 'Ready Contract B',
          description: 'Second slot',
          meta: 'Available now • 3h focus',
          payout: 80,
          ready: true,
          hoursRequired: 3,
          expiresIn: 2,
          onAccept: () => acceptLog.push('offer-ready-secondary')
        }
      ],
      upcoming: [
        {
          id: 'offer-soon',
          label: 'Coming Soon',
          description: 'Opens tomorrow',
          meta: 'Opens in 2 days',
          payout: 60,
          ready: false,
          availableIn: 2,
          expiresIn: 3,
          onAccept: () => acceptLog.push('offer-soon')
        }
      ],
      commitments: [],
      filters: { available: true, category: 'writing' }
    },
    {
      id: 'slow-burn',
      name: 'Slow Burn Hustle',
      description: 'Plan ahead for this sprint.',
      badges: [],
      actionCategory: 'community',
      metrics: {
        time: { value: 4, label: '4h focus' },
        payout: { value: 120, label: '$120 payout' },
        roi: 30
      },
      requirements: { summary: 'Requires level 2', items: [] },
      action: {
        label: 'Prep outreach',
        className: 'secondary',
        disabled: true,
        guidance: 'Queue another gig to unlock this lane.'
      },
      available: false,
      offers: [],
      upcoming: [
        {
          id: 'offer-slow',
          label: 'Audience Sprint',
          description: 'Warm up leads',
          meta: 'Opens tomorrow',
          payout: 120,
          ready: false,
          availableIn: 1,
          expiresIn: 4,
          onAccept: () => acceptLog.push('offer-slow')
        }
      ],
      commitments: [],
      filters: { available: false, category: 'community' }
    }
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.ok(result?.meta.includes('2 offers ready'));
    assert.ok(result?.meta.includes('2 queued'));

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
    assert.equal(categoryFilters.length, 2, 'expected hustle category filters to be present');

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = [...list.querySelectorAll('.downwork-card')];
    assert.equal(cards.length, 3, 'expected unified feed to render one card per offer');
    assert.equal(
      cards.filter(card => card.dataset.hustle === 'priority-hustle').length,
      2,
      'expected multiple offers from the same hustle to render separately'
    );

    const primaryCard = cards.find(card =>
      card.dataset.hustle === 'priority-hustle' &&
      card.dataset.available === 'true' &&
      card.querySelector('.browser-card__summary')
    );
    assert.ok(primaryCard, 'expected primary ready card for priority hustle');
    assert.equal(primaryCard.dataset.time, '2');
    assert.equal(primaryCard.dataset.payout, '50');
    assert.equal(primaryCard.dataset.roi, '25');
    assert.ok(primaryCard.querySelector('.downwork-card__metrics').textContent.includes('📈 ROI $25 / h'));
    const primarySummary = primaryCard.querySelector('.browser-card__summary');
    assert.ok(primarySummary, 'expected primary card to include summary copy');
    assert.equal(primarySummary.textContent, 'Lock this contract now.');
    assert.equal(primaryCard.querySelectorAll('.browser-card__badge').length, 2, 'expected primary card badges');
    assert.equal(primaryCard.querySelectorAll('.downwork-card__tag').length, 2, 'expected primary card tags');
    assert.equal(primaryCard.querySelector('.browser-card__meta')?.textContent, 'No requirements');

    const secondaryCard = cards.find(card =>
      card.dataset.hustle === 'priority-hustle' &&
      card.dataset.available === 'true' &&
      !card.querySelector('.browser-card__summary')
    );
    assert.ok(secondaryCard, 'expected secondary ready card for priority hustle');
    assert.equal(secondaryCard.dataset.time, '3');
    assert.equal(secondaryCard.dataset.payout, '80');
    assert.equal(
      secondaryCard.querySelector('.browser-card__summary'),
      null,
      'expected secondary card to omit repeated summary copy'
    );
    assert.equal(
      secondaryCard.querySelector('.browser-card__badges'),
      null,
      'expected secondary card to hide badges'
    );
    assert.equal(
      secondaryCard.querySelector('.downwork-card__tags'),
      null,
      'expected secondary card to hide tag list'
    );
    assert.equal(
      secondaryCard.querySelector('.browser-card__meta'),
      null,
      'expected secondary card to hide requirements summary'
    );

    const upcomingCard = cards.find(card =>
      card.dataset.hustle === 'slow-burn' && card.dataset.available === 'false'
    );
    assert.ok(upcomingCard, 'expected upcoming hustle card to be present');
    assert.equal(upcomingCard.dataset.available, 'false');
    assert.equal(upcomingCard.dataset.hustle, 'slow-burn');
    assert.ok(
      upcomingCard.querySelector('.browser-card__summary'),
      'expected upcoming primary card to keep descriptive summary'
    );
    assert.ok(
      [...upcomingCard.querySelectorAll('.browser-card__section-title')]
        .some(node => node.textContent === 'Opening soon'),
      'expected upcoming card to surface opening soon section'
    );

    const primaryAction = primaryCard.querySelector('.browser-card__actions .browser-card__button--primary');
    assert.ok(primaryAction, 'expected primary hustle CTA');
    assert.equal(primaryAction.textContent, 'Accept Ready Offer');
    primaryAction.click();
    assert.deepEqual(actionLog, ['model-action']);

    const readyOfferButton = primaryCard.querySelector('.hustle-card__offer:not(.is-upcoming) .browser-card__button');
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

    const upcomingButton = primaryCard.querySelector('.hustle-card__offer.is-upcoming .browser-card__button');
    assert.ok(upcomingButton, 'expected upcoming offer to render with disabled CTA');
    assert.equal(upcomingButton.textContent, 'Opens in 2 days');
    assert.equal(upcomingButton.disabled, true);

    const shortTaskFilter = document.querySelector('button[data-filter-id="shortTasks"]');
    shortTaskFilter.click();
    assert.ok(shortTaskFilter.classList.contains('is-active'));
    assert.equal(shortTaskFilter.getAttribute('aria-pressed'), 'true');
    assert.ok(board.classList.contains('is-filtered'));
    assert.ok(list.classList.contains('is-filtered'));
    assert.equal(list.querySelectorAll('.downwork-card').length, 1, 'expected quick filter to narrow results');

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
    assert.equal(list.querySelectorAll('.downwork-card').length, 3, 'expected cards to return after clearing filters');
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

  const models = [
    {
      id: 'locked-filter',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      metrics: {
        time: { value: 1, label: '1h' },
        payout: { value: 25, label: '$25' },
        roi: 25
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Accept Open Offer',
        disabled: false,
        className: 'primary',
        onClick: () => {}
      },
      available: true,
      offers: [
        {
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
        {
          id: 'offer-open',
          label: 'Open Ready Offer',
          description: 'Visible offer.',
          meta: 'Open now',
          payout: 25,
          ready: true,
          availableIn: 0,
          expiresIn: 2,
          locked: false
        }
      ],
      upcoming: [
        {
          id: 'offer-locked-upcoming',
          label: 'Locked Upcoming Offer',
          description: 'Hidden upcoming offer.',
          meta: 'Locked upcoming',
          ready: false,
          availableIn: 2,
          expiresIn: 3,
          locked: true
        },
        {
          id: 'offer-open-upcoming',
          label: 'Open Upcoming Offer',
          description: 'Visible upcoming offer.',
          meta: 'Unlocks soon',
          ready: false,
          availableIn: 1,
          expiresIn: 4,
          locked: false
        }
      ],
      commitments: [],
      filters: { available: true }
    }
  ];

  try {
    renderHustles(context, definitions, models);

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? [...list.querySelectorAll('.downwork-card')] : [];
    assert.equal(cards.length, 1, 'expected unified card with unlocked offers to render');

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

  const models = [
    {
      id: 'upcoming-only',
      name: 'Upcoming Only Hustle',
      description: 'Plan ahead while slots unlock.',
      badges: [],
      metrics: {
        time: { value: 2, label: '2h focus' },
        payout: { value: 60, label: '$60 payout' },
        roi: 30
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Check back soon',
        className: 'secondary',
        disabled: true
      },
      available: false,
      offers: [],
      upcoming: upcomingOffers,
      commitments: [],
      filters: { available: false, category: 'ops' }
    }
  ];

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
    {
      id: 'session-filter',
      name: 'Session Filter Hustle',
      description: 'Persists quick filters.',
      badges: [],
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
      available: true,
      offers: [
        {
          id: 'offer-ready',
          label: 'Ready Offer',
          description: 'Open now',
          meta: 'Available now • 1h focus',
          payout: 20,
          ready: true,
          availableIn: 0,
          expiresIn: 1,
          onAccept: () => {}
        }
      ],
      upcoming: [],
      commitments: [],
      filters: { available: true }
    }
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

  const models = [
    {
      id: 'locked-filter',
      name: 'Locked Filter Hustle',
      description: 'Only unlocked offers should appear.',
      badges: [],
      metrics: {
        time: { value: 1, label: '1h' },
        payout: { value: 25, label: '$25' },
        roi: 25
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Locked — Hidden',
        disabled: true,
        className: 'primary',
        onClick: null
      },
      available: false,
      offers: [
        {
          id: 'offer-locked',
          label: 'Locked Ready Offer',
          description: 'Hidden because locked.',
          meta: 'Locked meta',
          payout: 25,
          ready: true,
          availableIn: 0,
          expiresIn: 2,
          locked: true
        }
      ],
      upcoming: [
        {
          id: 'offer-locked-upcoming',
          label: 'Locked Upcoming Offer',
          description: 'Hidden upcoming offer.',
          meta: 'Locked upcoming',
          ready: false,
          availableIn: 2,
          expiresIn: 3,
          locked: true
        }
      ],
      commitments: [],
      filters: { available: false }
    }
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
    {
      id: 'empty-hustle',
      name: 'Empty Hustle',
      description: 'Waiting on the next drop.',
      badges: [],
      metrics: {
        time: { value: 2, label: '2h' },
        payout: { value: 80, label: '$80' },
        roi: 40
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Check back tomorrow',
        disabled: true,
        className: 'secondary',
        onClick: null,
        guidance: 'Fresh leads roll in with tomorrow\'s refresh. Accept the next hustle to keep momentum.'
      },
      available: false,
      offers: [],
      upcoming: [],
      commitments: [],
      filters: { available: false }
    }
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.equal(result?.meta, 'No actions ready yet — accept your next contract to kick things off.');

    const list = document.querySelector('[data-role="browser-hustle-list"]');
    const cards = list ? list.querySelectorAll('.downwork-card') : [];
    assert.equal(cards.length, 1, 'expected placeholder hustle card when no offers exist');
    assert.equal(cards[0]?.dataset.hustle, 'empty-hustle');
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
