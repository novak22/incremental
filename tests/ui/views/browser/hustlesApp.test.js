import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import renderHustles from '../../../../src/ui/views/browser/apps/hustles.js';

function setupDom() {
  const dom = new JSDOM('<main id="app-root"></main>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

test('renderHustles highlights accept CTA and upcoming list', () => {
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
      id: 'priority-hustle',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      action: { label: 'Legacy' },
      tag: { label: 'Focus' }
    }
  ];

  const models = [
    {
      id: 'priority-hustle',
      name: 'Priority Hustle',
      description: 'Lock this contract now.',
      badges: ['2h time', '$50 payout'],
      metrics: {
        time: { value: 2, label: '2h' },
        payout: { value: 50, label: '$50' },
        roi: 25
      },
      requirements: { summary: 'No requirements', items: [] },
      action: {
        label: 'Accept Ready Offer',
        disabled: false,
        className: 'primary',
        onClick: () => {},
        guidance: 'Fresh hustles just landed! Claim your next gig and keep momentum rolling.'
      },
      available: true,
      offers: [
        {
          id: 'offer-ready',
          label: 'Ready Offer',
          description: 'Open now',
          meta: 'Available now • 2h focus',
          payout: 50,
          ready: true,
          availableIn: 0,
          expiresIn: 1,
          onAccept: () => {}
        }
      ],
      upcoming: [
        {
          id: 'offer-soon',
          label: 'Coming Soon',
          description: 'Opens tomorrow',
          meta: 'Opens in 1 day',
          payout: 50,
          ready: false,
          availableIn: 1,
          expiresIn: 2,
          onAccept: () => {}
        }
      ],
      commitments: [],
      filters: { available: true }
    }
  ];

  try {
    const result = renderHustles(context, definitions, models);
    assert.ok(result?.meta.includes('Keep the loop rolling — accept → work → complete.'));

    const summaryStats = document.querySelectorAll('.downwork-summary__stat');
    assert.equal(summaryStats.length, 3, 'expected three summary stats to render');
    assert.equal(document.querySelector('[data-role="downwork-focus-value"]')?.textContent, '0h');
    assert.equal(document.querySelector('[data-role="downwork-accepted-value"]')?.textContent, '0');
    assert.equal(document.querySelector('[data-role="downwork-payout-value"]')?.textContent, '$50');

    const tabs = document.querySelectorAll('.downwork-tab');
    assert.equal(tabs.length, 1, 'expected single hustle category tab');
    assert.ok(tabs[0].textContent.includes('Daily Hustles'));

    const filters = document.querySelectorAll('.downwork-filter');
    assert.equal(filters.length, 4, 'expected quick filter pills');

    const button = document.querySelector('.browser-card__actions .browser-card__button--primary');
    assert.ok(button, 'expected primary accept CTA');
    assert.equal(button.textContent, 'Accept Ready Offer');

    const readyOfferButton = document.querySelector('.hustle-card__offer .browser-card__button');
    assert.ok(readyOfferButton, 'expected ready offer button to render');
    assert.equal(readyOfferButton.textContent, 'Accept & Queue');

    const upcomingHeader = [...document.querySelectorAll('.browser-card__section-title')]
      .find(node => node.textContent === 'Queued for later');
    assert.ok(upcomingHeader, 'expected upcoming section to render');

    const upcomingItem = document.querySelector('.hustle-card__offer.is-upcoming .browser-card__button');
    assert.ok(upcomingItem, 'expected upcoming offer to render with disabled button');
    assert.equal(upcomingItem.textContent, 'Opens in 1 day');

    const skillFilter = [...filters].find(node => node.textContent.includes('Skill XP'));
    assert.ok(skillFilter, 'expected skill filter button');
    skillFilter.click();
    const filteredEmpty = document.querySelector('.browser-empty--compact');
    assert.ok(filteredEmpty, 'expected filtered empty state');
    skillFilter.click();
    assert.ok(document.querySelector('.browser-card.browser-card--hustle'), 'expected card to return after clearing filter');
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

    const titles = [...document.querySelectorAll('.hustle-card__title')]
      .map(node => node.textContent);
    assert.ok(titles.includes('Open Ready Offer'), 'expected unlocked offer to remain visible');
    assert.ok(!titles.includes('Locked Ready Offer'), 'expected locked offer to be hidden');
    assert.ok(titles.includes('Open Upcoming Offer'), 'expected unlocked upcoming to remain visible');
    assert.ok(!titles.includes('Locked Upcoming Offer'), 'expected locked upcoming offer to be hidden');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
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

    const cards = document.querySelectorAll('.browser-card.browser-card--hustle');
    assert.equal(cards.length, 0, 'expected no hustle categories to render');

    const emptyMessage = document.querySelector('.browser-empty');
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
