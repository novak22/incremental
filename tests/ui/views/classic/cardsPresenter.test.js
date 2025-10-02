import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initElementRegistry } from '../../../../src/ui/elements/registry.js';
import { renderAll, update, updateCard } from '../../../../src/ui/views/classic/cardsPresenter.js';
import { initializeState } from '../../../../src/core/state.js';
import { formatHours } from '../../../../src/core/helpers.js';
import { KNOWLEDGE_TRACKS } from '../../../../src/game/requirements.js';

function createTestDom() {
  const markup = `
    <div id="hustle-controls">
      <div id="hustle-list"></div>
      <input id="hustle-available" type="checkbox" />
      <select id="hustle-sort"></select>
      <input id="hustle-search" />
    </div>
    <div id="asset-gallery"></div>
    <div id="upgrade-region">
      <div id="upgrade-list"></div>
      <ul id="upgrade-lane-list"></ul>
      <section id="upgrade-overview">
        <span id="upgrade-overview-purchased"></span>
        <span id="upgrade-overview-ready"></span>
        <p id="upgrade-overview-note"></p>
      </section>
      <ul id="upgrade-dock"></ul>
      <p id="upgrade-empty"></p>
    </div>
    <div id="study-region">
      <div id="study-track-list"></div>
      <ul id="study-queue"></ul>
      <span id="study-queue-eta"></span>
      <span id="study-queue-cap"></span>
    </div>
  `;

  const dom = new JSDOM(`<!DOCTYPE html><body>${markup}</body>`);
  const { document } = dom.window;

  globalThis.window = dom.window;
  globalThis.document = document;
  globalThis.Node = dom.window.Node;

  initElementRegistry(document, {
    hustleControls: () => ({
      hustleList: document.getElementById('hustle-list'),
      hustleAvailableToggle: document.getElementById('hustle-available'),
      hustleSort: document.getElementById('hustle-sort'),
      hustleSearch: document.getElementById('hustle-search')
    }),
    assetGallery: () => document.getElementById('asset-gallery'),
    upgradeList: () => document.getElementById('upgrade-list'),
    upgradeLaneList: () => document.getElementById('upgrade-lane-list'),
    upgradeOverview: () => ({
      container: document.getElementById('upgrade-overview'),
      purchased: document.getElementById('upgrade-overview-purchased'),
      ready: document.getElementById('upgrade-overview-ready'),
      note: document.getElementById('upgrade-overview-note')
    }),
    upgradeDockList: () => document.getElementById('upgrade-dock'),
    upgradeEmpty: () => document.getElementById('upgrade-empty'),
    studyTrackList: () => document.getElementById('study-track-list'),
    studyQueue: () => ({
      list: document.getElementById('study-queue'),
      eta: document.getElementById('study-queue-eta'),
      cap: document.getElementById('study-queue-cap')
    })
  });

  return { dom, document };
}

function buildBasePayload() {
  return {
    registries: {
      hustles: [],
      assets: [],
      upgrades: [],
      education: []
    },
    models: {
      hustles: [],
      assets: [],
      upgrades: [],
      education: { queue: { entries: [], totalLabel: '', capLabel: '' } }
    }
  };
}

test('renderAll builds hustle card markup from models', () => {
  const { document } = createTestDom();
  initializeState();

  const payload = buildBasePayload();

  const hustleDefinition = {
    id: 'quick-gig',
    name: 'Quick Gig',
    description: 'Shoot and edit a short promo reel.',
    action: { label: 'Queue', onClick: () => {} },
    tag: { label: 'Focus' }
  };

  const hustleModel = {
    id: 'quick-gig',
    name: 'Quick Gig',
    description: 'Shoot and edit a short promo reel.',
    metrics: {
      time: { value: 2, label: '2h' },
      payout: { value: 60, label: '$60' },
      roi: 30
    },
    badges: ['2h time', '$60 payout', 'Focus'],
    requirements: { summary: 'Ready to roll', items: [] },
    limit: { summary: '3/3 runs left today' },
    action: { label: 'Queue', disabled: false, className: 'primary' },
    available: true,
    filters: {
      search: 'quick gig',
      time: 2,
      payout: 60,
      roi: 30,
      available: true,
      limitRemaining: 3,
      tag: 'Focus'
    }
  };

  payload.registries.hustles = [hustleDefinition];
  payload.models.hustles = [hustleModel];

  renderAll(payload);

  const card = document.querySelector('.hustle-card');
  assert.ok(card, 'expected hustle card to render');
  assert.equal(card.dataset.hustle, 'quick-gig');
  assert.equal(card.dataset.available, 'true');
  assert.equal(card.dataset.time, '2');
  assert.equal(card.dataset.payout, '60');
  assert.equal(card.dataset.roi, '30');
  assert.equal(card.dataset.limitRemaining, '3');

  const badges = Array.from(card.querySelectorAll('.badge')).map(node => node.textContent);
  assert.deepEqual(badges, ['2h time', '$60 payout', 'Focus']);

  const limitCopy = card.querySelector('.hustle-card__limit');
  assert.equal(limitCopy.textContent, '3/3 runs left today');
});

test('update refreshes hustle card datasets and emits events', () => {
  const { document } = createTestDom();
  const state = initializeState();
  state.money = 500;

  const payload = buildBasePayload();

  const hustleDefinition = {
    id: 'product-shoot',
    name: 'Product Shoot',
    description: 'Capture a product carousel.',
    action: { label: 'Queue', onClick: () => {} }
  };

  const initialModel = {
    id: 'product-shoot',
    name: 'Product Shoot',
    description: 'Capture a product carousel.',
    metrics: {
      time: { value: 3, label: '3h' },
      payout: { value: 90, label: '$90' },
      roi: 30
    },
    badges: ['3h time', '$90 payout'],
    requirements: { summary: 'Set lights and props', items: [] },
    limit: { summary: '2/3 runs left today' },
    action: { label: 'Queue', disabled: false, className: 'primary' },
    available: true,
    filters: {
      search: 'product shoot',
      time: 3,
      payout: 90,
      roi: 30,
      available: true,
      limitRemaining: 2,
      tag: ''
    }
  };

  const updatedModel = {
    ...initialModel,
    metrics: {
      time: { value: 3, label: '3h' },
      payout: { value: 120, label: '$120' },
      roi: 40
    },
    limit: { summary: '1/3 runs left today' },
    filters: {
      ...initialModel.filters,
      payout: 120,
      roi: 40,
      limitRemaining: 1,
      available: false
    },
    available: false
  };

  payload.registries.hustles = [hustleDefinition];
  payload.models.hustles = [initialModel];

  renderAll(payload);

  const hustleEvents = [];
  const upgradesEvents = [];
  const hustleListener = () => hustleEvents.push('hustle');
  const upgradesListener = () => upgradesEvents.push('upgrades');
  document.addEventListener('hustles:availability-updated', hustleListener);
  document.addEventListener('upgrades:state-updated', upgradesListener);

  const card = document.querySelector('[data-hustle="product-shoot"]');
  assert.ok(card, 'expected hustle card before update');
  assert.equal(card.dataset.payout, '90');
  assert.equal(card.dataset.roi, '30');
  assert.equal(card.querySelector('.hustle-card__limit').textContent, '2/3 runs left today');

  update({
    registries: payload.registries,
    models: { ...payload.models, hustles: [updatedModel] }
  });

  document.removeEventListener('hustles:availability-updated', hustleListener);
  document.removeEventListener('upgrades:state-updated', upgradesListener);

  assert.equal(card.dataset.payout, '120');
  assert.equal(card.dataset.roi, '40');
  assert.equal(card.dataset.available, 'false');
  assert.equal(card.dataset.limitRemaining, '1');
  assert.equal(card.querySelector('.hustle-card__limit').textContent, '1/3 runs left today');

  assert.equal(hustleEvents.length, 1, 'expected hustle availability event to fire once');
  assert.equal(upgradesEvents.length, 1, 'expected upgrade state event to fire once during update');
});

test('updateCard refreshes upgrade UI and dispatches events', () => {
  const { document } = createTestDom();
  const state = initializeState();
  state.money = 1000;

  const payload = buildBasePayload();

  const upgradeDefinition = {
    id: 'studio-lighting',
    name: 'Studio Lighting',
    description: 'Brighten your shoot space.',
    cost: 250,
    category: 'studio',
    family: 'lighting',
    tag: { label: 'Upgrade' },
    action: { label: 'Buy', className: 'primary', onClick: () => {} }
  };

  const upgradeModel = {
    id: 'studio-lighting',
    name: 'Studio Lighting',
    cost: 250,
    filters: {
      category: 'studio',
      family: 'lighting',
      search: 'studio lighting',
      ready: true,
      affordable: true
    },
    snapshot: {
      cost: 250,
      affordable: true,
      disabled: false,
      purchased: false,
      ready: true
    },
    definition: upgradeDefinition
  };

  payload.registries.upgrades = [upgradeDefinition];
  payload.models.upgrades = {
    categories: [
      {
        id: 'studio',
        name: 'Studio Gear',
        families: [
          {
            id: 'lighting',
            name: 'Lighting',
            description: 'Keep the set glowing.',
            definitions: [upgradeModel]
          }
        ]
      }
    ],
    overview: {
      purchased: 0,
      ready: 1,
      total: 1,
      note: 'Ready to deploy'
    }
  };

  renderAll(payload);

  const events = [];
  const listener = () => events.push('upgrades');
  document.addEventListener('upgrades:state-updated', listener);

  updateCard(upgradeDefinition);

  document.removeEventListener('upgrades:state-updated', listener);

  assert.equal(events.length, 1, 'expected upgrade event to emit during targeted update');
  const dockItems = document.querySelectorAll('#upgrade-dock li');
  assert.ok(dockItems.length > 0, 'expected upgrade dock to render content');
});

test('renderAll populates study tracks and queue details', () => {
  const { document } = createTestDom();
  const state = initializeState();

  const [track] = Object.values(KNOWLEDGE_TRACKS);
  assert.ok(track, 'expected at least one knowledge track fixture');

  state.progress.knowledge[track.id] = {
    enrolled: true,
    studiedToday: true,
    totalDays: track.days,
    daysCompleted: 1,
    completed: false
  };

  const studyDefinition = {
    id: track.id,
    name: track.name,
    description: track.description,
    action: { label: 'Study', onClick: () => {} }
  };

  const payload = buildBasePayload();
  payload.registries.education = [studyDefinition];
  payload.models.education = {
    queue: {
      entries: [
        { name: track.name, hoursPerDay: track.hoursPerDay }
      ],
      totalLabel: 'Total: 2 tracks queued',
      capLabel: 'Queue cap: 3'
    }
  };

  renderAll(payload);

  const trackNode = document.querySelector(`[data-track="${track.id}"]`);
  assert.ok(trackNode, 'expected study track article');
  assert.equal(trackNode.dataset.active, 'true');
  assert.equal(trackNode.dataset.complete, 'false');

  const remaining = trackNode.querySelector('.study-track__remaining');
  assert.ok(remaining?.textContent.includes('1/'), 'expected progress summary to render');

  const queueItems = Array.from(document.querySelectorAll('#study-queue li')).map(item => item.textContent);
  assert.deepEqual(queueItems, [`${track.name} • ${formatHours(track.hoursPerDay)} per day`]);

  assert.equal(document.getElementById('study-queue-eta').textContent, 'Total: 2 tracks queued');
  assert.equal(document.getElementById('study-queue-cap').textContent, 'Queue cap: 3');
});
