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
    assert.ok(result?.meta.includes('Fresh hustles just landed!'));

    const button = document.querySelector('.browser-card__actions .browser-card__button--primary');
    assert.ok(button, 'expected primary accept CTA');
    assert.equal(button.textContent, 'Accept Ready Offer');

    const upcomingHeader = [...document.querySelectorAll('.browser-card__section-title')]
      .find(node => node.textContent === 'Coming tomorrow');
    assert.ok(upcomingHeader, 'expected upcoming section to render');

    const upcomingItem = document.querySelector('.hustle-card__offer.is-upcoming .browser-card__button');
    assert.ok(upcomingItem, 'expected upcoming offer to render with disabled button');
    assert.equal(upcomingItem.textContent, 'Unlocks in 1 day');
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
        guidance: 'Fresh leads roll in with tomorrow\'s market refresh.'
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
    assert.equal(result?.meta, 'No hustles ready yet');

    const button = document.querySelector('.browser-card__actions .browser-card__button');
    assert.ok(button, 'expected fallback button');
    assert.equal(button.textContent, 'Check back tomorrow');
    assert.equal(button.disabled, true);

    const guidance = document.querySelector('.browser-card__note');
    assert.ok(guidance?.textContent.includes('Fresh leads roll in'));
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
