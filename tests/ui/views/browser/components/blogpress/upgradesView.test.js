import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import renderUpgradesView, { renderUpgradeDetail } from '../../../../../../src/ui/views/browser/components/blogpress/views/upgradesView.js';

function withDom(t) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.HTMLElement;
    delete globalThis.Node;
  });
  return dom;
}

test('renderUpgradesView lists upgrades and wires selection', t => {
  const dom = withDom(t);
  let selectedId = null;
  let purchased = false;
  const upgrade = {
    id: 'blogpressAutomationSuite',
    name: 'Automation Suite',
    description: 'Auto-schedules recurring drafts.',
    cost: 240,
    tag: { label: 'Workflow' },
    snapshot: { ready: true, purchased: false, affordable: true },
    status: 'Ready to launch',
    boosts: 'Adds queue controls to every blog dashboard.',
    action: { onClick: () => { purchased = true; } },
    definition: { details: ['Adds queue controls to every blog dashboard.'] }
  };

  const view = renderUpgradesView({
    model: { upgrades: [upgrade] },
    state: { selectedUpgradeId: upgrade.id },
    formatters: { formatCurrency: value => `$${value}` },
    handlers: {
      onSelectUpgrade: id => {
        selectedId = id;
      }
    },
    selectors: {
      getSelectedUpgrade: () => upgrade
    }
  });

  assert.equal(view.className, 'blogpress-view blogpress-view--upgrades');
  const cards = view.querySelectorAll('.blogpress-upgrade');
  assert.equal(cards.length, 1);
  assert.ok(cards[0].classList.contains('is-active'), 'selected upgrade should be active');

  cards[0].dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.equal(selectedId, upgrade.id, 'clicking a card should report selection');

  const button = view.querySelector('.blogpress-upgrade-detail button.blogpress-button--primary');
  assert.ok(button, 'detail view should include purchase button');
  button.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.equal(purchased, true, 'purchase button should invoke upgrade action');

  const highlightItems = [...view.querySelectorAll('.blogpress-upgrade__highlights li')].map(node => node.textContent);
  assert.ok(highlightItems.some(text => text.includes('Adds queue controls')), 'highlight list should include boost copy');
});

test('renderUpgradeDetail shows empty state when nothing selected', t => {
  withDom(t);
  const detail = renderUpgradeDetail(null, {});
  const empty = detail.querySelector('.blogpress-upgrade-detail__empty');
  assert.ok(empty, 'empty state should render');
  assert.match(empty.textContent, /Select an upgrade/);
});

test('renderUpgradesView shows empty message when no upgrades available', t => {
  withDom(t);
  const view = renderUpgradesView({
    model: { upgrades: [] },
    state: {},
    formatters: { formatCurrency: value => `$${value}` },
    handlers: {},
    selectors: {
      getSelectedUpgrade: () => null
    }
  });

  const emptyMessage = view.querySelector('.blogpress-upgrades__empty');
  assert.ok(emptyMessage, 'empty text should render when no upgrades available');
  assert.match(emptyMessage.textContent || '', /No upgrades unlocked yet/);
});
