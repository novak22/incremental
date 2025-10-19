import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createDetailViewController } from '../../../../../../src/ui/views/browser/components/blogpress/views/createDetailViewController.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  return dom;
}

function teardownDom(dom) {
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.HTMLElement;
}

test('createDetailViewController composes panels and forwards handlers', t => {
  const dom = setupDom();
  t.after(() => teardownDom(dom));

  const calls = {
    back: 0,
    overview: 0,
    niche: 0,
    quality: 0,
    income: 0,
    actions: 0,
    activity: 0
  };

  const controller = createDetailViewController({
    createBackButton: ({ onClick }) => {
      const button = document.createElement('button');
      button.addEventListener('click', onClick);
      calls.back += 1;
      return button;
    },
    renderOverviewPanel: ({ instance }) => {
      calls.overview += 1;
      const node = document.createElement('div');
      node.dataset.panel = `overview-${instance.id}`;
      return node;
    },
    renderNichePanel: ({ handlers }) => {
      calls.niche += 1;
      const node = document.createElement('div');
      node.dataset.panel = 'niche';
      node.addEventListener('custom', () => handlers.onSelectNiche('blog-1', 'travel'));
      return node;
    },
    renderQualityPanel: () => {
      calls.quality += 1;
      const panel = document.createElement('div');
      panel.dataset.panel = 'quality';
      const details = document.createElement('div');
      details.dataset.panel = 'quality-details';
      return { panel, details };
    },
    renderIncomePanel: () => {
      calls.income += 1;
      const node = document.createElement('div');
      node.dataset.panel = 'income';
      return node;
    },
    renderActionPanel: ({ handlers }) => {
      calls.actions += 1;
      const node = document.createElement('div');
      node.dataset.panel = 'actions';
      node.addEventListener('custom', () => handlers.onRunAction('blog-1', 'revamp'));
      return node;
    },
    renderActivityPanel: () => {
      calls.activity += 1;
      const node = document.createElement('div');
      node.dataset.panel = 'activity';
      return node;
    }
  });

  const handlerCalls = {
    back: 0,
    niche: null,
    action: null
  };

  const view = controller({
    instance: {
      id: 'blog-1',
      label: 'Sample blog'
    },
    formatters: {},
    formatRange: () => 'range',
    handlers: {
      onBack: () => {
        handlerCalls.back += 1;
      },
      onSelectNiche: (...args) => {
        handlerCalls.niche = args;
      },
      onViewDetail: () => {},
      onRunAction: (...args) => {
        handlerCalls.action = args;
      }
    }
  });

  assert.ok(view, 'controller should return a DOM node');
  assert.equal(view.className, 'blogpress-view blogpress-view--detail');
  assert.equal(calls.back, 1, 'controller should build back button once');
  assert.equal(calls.activity, 1, 'controller should build activity panel once');

  const panels = view.querySelectorAll('[data-panel]');
  assert.ok(panels.length >= 5, 'controller should append all primary panels');
  assert.ok(view.querySelector('[data-panel="quality"]'), 'quality panel should mount in primary tier');
  const detailsPanel = view.querySelector('details.blogpress-details');
  assert.ok(detailsPanel, 'details accordion should render');
  assert.ok(detailsPanel.querySelector('[data-panel="quality-details"]'), 'quality details should appear inside accordion');
  assert.ok(detailsPanel.querySelector('[data-panel="activity"]'), 'activity panel should appear inside accordion');

  const backButton = view.querySelector('button');
  backButton.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.equal(handlerCalls.back, 1, 'back handler should fire when clicking back button');

  const nichePanel = [...view.querySelectorAll('[data-panel="niche"]')][0];
  nichePanel.dispatchEvent(new dom.window.Event('custom'));
  assert.deepEqual(handlerCalls.niche, ['blog-1', 'travel'], 'niche panel should invoke selection handler');

  const actionsPanel = [...view.querySelectorAll('[data-panel="actions"]')][0];
  actionsPanel.dispatchEvent(new dom.window.Event('custom'));
  assert.deepEqual(handlerCalls.action, ['blog-1', 'revamp'], 'action panel should invoke run handler');
});

test('createDetailViewController returns null when instance missing', t => {
  const dom = setupDom();
  t.after(() => teardownDom(dom));

  const controller = createDetailViewController({});
  const result = controller({ instance: null });
  assert.equal(result, null);
});
