import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initElementRegistry } from '../../../../src/ui/elements/registry.js';
import { renderNicheWidget } from '../../../../src/ui/views/classic/nichePresenter.js';

function setupDom() {
  const markup = `
    <section id="niche-region">
      <div id="analytics-highlight-hot"></div>
      <p id="analytics-highlight-hot-note"></p>
      <div id="analytics-highlight-swing"></div>
      <p id="analytics-highlight-swing-note"></p>
      <div id="analytics-highlight-risk"></div>
      <p id="analytics-highlight-risk-note"></p>
      <div class="niche-controls">
        <button type="button" class="niche-controls__button" data-niche-sort="impact"></button>
        <button type="button" class="niche-controls__button" data-niche-sort="assets"></button>
        <button type="button" class="niche-controls__button" data-niche-sort="movement"></button>
        <label><input id="niche-filter-invested" type="checkbox" /></label>
        <label><input id="niche-filter-watchlist" type="checkbox" /></label>
      </div>
      <div id="niche-board"></div>
    </section>
    <div id="asset-gallery"></div>
    <div id="session-status"></div>
  `;

  const dom = new JSDOM(`<!DOCTYPE html><body>${markup}</body>`);
  const { document, window } = dom.window;

  window.requestAnimationFrame = callback => callback();

  initElementRegistry(document, {
    nicheTrends: () => ({
      highlightHot: document.getElementById('analytics-highlight-hot'),
      highlightHotNote: document.getElementById('analytics-highlight-hot-note'),
      highlightSwing: document.getElementById('analytics-highlight-swing'),
      highlightSwingNote: document.getElementById('analytics-highlight-swing-note'),
      highlightRisk: document.getElementById('analytics-highlight-risk'),
      highlightRiskNote: document.getElementById('analytics-highlight-risk-note'),
      board: document.getElementById('niche-board'),
      sortButtons: Array.from(document.querySelectorAll('[data-niche-sort]')),
      filterInvested: document.getElementById('niche-filter-invested'),
      filterWatchlist: document.getElementById('niche-filter-watchlist')
    }),
    assetGallery: () => document.getElementById('asset-gallery'),
    sessionStatus: () => document.getElementById('session-status')
  });

  globalThis.window = window;
  globalThis.document = document;
  globalThis.Node = window.Node;

  return { document, window };
}

function getBoardOrder(document) {
  return Array.from(document.querySelectorAll('.niche-card__name')).map(node => node.textContent);
}

test('renderNicheWidget updates highlights, sorting, and filters', () => {
  const { document, window } = setupDom();

  const viewModel = {
    highlights: {
      hot: { title: 'Peak Performer', note: 'Tech Innovators are on fire.' },
      swing: { title: 'Wild Swing', note: 'Hold on tight.' },
      risk: { title: 'Risk Alert', note: 'Stay frosty.' }
    },
    watchlistCount: 1,
    board: {
      entries: [
        {
          id: 'niche-a',
          definition: { name: 'Niche A' },
          popularity: { tone: 'warm', score: 80, multiplier: 1.2, delta: 5, label: 'Blazing' },
          watchlisted: true,
          assetCount: 2,
          netEarnings: 200,
          trendImpact: 60,
          baselineEarnings: 140,
          assetBreakdown: [{ name: 'Rig', count: 2 }],
          status: 'Trending'
        },
        {
          id: 'niche-b',
          definition: { name: 'Niche B' },
          popularity: { tone: 'cool', score: 30, multiplier: 0.9, delta: -4, label: 'Cooling' },
          watchlisted: false,
          assetCount: 0,
          netEarnings: 0,
          trendImpact: -10,
          baselineEarnings: 0,
          assetBreakdown: [],
          status: 'Cooling Off'
        },
        {
          id: 'niche-c',
          definition: { name: 'Niche C' },
          popularity: { tone: 'steady', score: 55, multiplier: 1.05, delta: 1, label: 'Steady' },
          watchlisted: false,
          assetCount: 3,
          netEarnings: 90,
          trendImpact: 15,
          baselineEarnings: 75,
          assetBreakdown: [],
          status: 'Steady'
        }
      ],
      emptyMessages: {
        default: 'Default empty',
        investedOnly: 'No invested entries',
        watchlistOnly: 'No watchlisted entries'
      }
    }
  };

  renderNicheWidget(viewModel);

  assert.equal(document.getElementById('analytics-highlight-hot').textContent, 'Peak Performer');
  assert.equal(document.getElementById('analytics-highlight-hot-note').textContent, 'Tech Innovators are on fire.');
  assert.equal(document.getElementById('analytics-highlight-risk').textContent, 'Risk Alert');

  const cards = document.querySelectorAll('.niche-card');
  assert.equal(cards.length, 3);
  assert.deepEqual(getBoardOrder(document), ['Niche A', 'Niche C', 'Niche B']);

  const watchlistToggle = document.getElementById('niche-filter-watchlist');
  watchlistToggle.checked = true;
  watchlistToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(getBoardOrder(document), ['Niche A']);

  const investedToggle = document.getElementById('niche-filter-invested');
  investedToggle.checked = true;
  investedToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(getBoardOrder(document), ['Niche A']);

  watchlistToggle.checked = false;
  watchlistToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  investedToggle.checked = false;
  investedToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(getBoardOrder(document), ['Niche A', 'Niche C', 'Niche B']);

  const assetsButton = document.querySelector('[data-niche-sort="assets"]');
  assetsButton.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.deepEqual(getBoardOrder(document), ['Niche C', 'Niche A', 'Niche B']);
  assert.equal(assetsButton.getAttribute('aria-pressed'), 'true');
});

test('renderNicheWidget disables watchlist filter with no entries', () => {
  const { document } = setupDom();

  const viewModel = {
    highlights: undefined,
    watchlistCount: 0,
    board: { entries: [], emptyMessages: {} }
  };

  renderNicheWidget(viewModel);

  const watchlistToggle = document.getElementById('niche-filter-watchlist');
  assert.equal(watchlistToggle.disabled, true);
  assert.equal(watchlistToggle.checked, false);
  assert.equal(document.getElementById('niche-board').textContent.trim(), 'Assign a niche to a venture to start tracking demand swings.');
});
