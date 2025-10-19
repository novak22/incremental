import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import renderOverviewPanel from '../../../../../../src/ui/views/browser/components/blogpress/views/renderOverviewPanel.js';
import renderNichePanel from '../../../../../../src/ui/views/browser/components/blogpress/views/renderNichePanel.js';
import renderQualityPanel from '../../../../../../src/ui/views/browser/components/blogpress/views/renderQualityPanel.js';
import renderActionPanel from '../../../../../../src/ui/views/browser/components/blogpress/views/renderActionPanel.js';
import renderIncomePanel from '../../../../../../src/ui/views/browser/components/blogpress/views/renderIncomePanel.js';

function withDom(t) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.HTMLElement;
  });
  return dom;
}

test('renderOverviewPanel lists key payout stats', t => {
  withDom(t);
  const instance = {
    id: 'blog-42',
    label: 'Lofi Letters',
    status: { id: 'active', label: 'Active' },
    lifetimeIncome: 12000,
    estimatedSpend: 4200,
    latestPayout: 800,
    averagePayout: 400,
    pendingIncome: 0
  };

  const panel = renderOverviewPanel({
    instance,
    formatCurrency: value => `$${value}`
  });

  const stats = [...panel.querySelectorAll('dl.blogpress-stats dd')].map(node => node.textContent);
  assert.deepEqual(
    stats,
    ['$12000', '$4200', '$800', '$400', 'None in queue'],
    'overview panel should format and display payout stats'
  );
});

test('renderNichePanel calls handlers when selecting a niche', t => {
  const dom = withDom(t);
  const instance = {
    id: 'blog-7',
    niche: null,
    nicheOptions: [
      { id: 'travel', name: 'Travel', label: 'Hot' }
    ],
    nicheLocked: false
  };

  let selectedArgs = null;
  let viewedArgs = null;

  const panel = renderNichePanel({
    instance,
    handlers: {
      onSelectNiche: (...args) => {
        selectedArgs = args;
      },
      onViewDetail: (...args) => {
        viewedArgs = args;
      }
    }
  });

  const select = panel.querySelector('select');
  select.value = 'travel';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  assert.deepEqual(selectedArgs, ['blog-7', 'travel'], 'niche selection should call onSelectNiche with blog id and option');
  assert.deepEqual(viewedArgs, ['blog-7'], 'niche selection should request detail refresh');
});

test('renderQualityPanel shows milestone and range', t => {
  withDom(t);
  const instance = {
    qualityLevel: 2,
    qualityInfo: { name: 'Polished Posts', description: 'Readers linger longer.' },
    milestone: {
      percent: 0.35,
      summary: 'Drafting joyfully',
      nextLevel: { level: 3, name: 'Signature Style', description: 'Unlocks sponsor slots.' }
    },
    qualityRange: { min: 120, max: 360 }
  };

  const panel = renderQualityPanel({
    instance,
    formatRange: ({ min, max }) => `$${min} – $${max}`
  });

  const progressFill = panel.querySelector('.blogpress-progress__fill');
  assert.ok(progressFill.style.width.includes('35'), 'quality progress should reflect milestone percent');
  assert.match(panel.textContent, /Signature Style/, 'quality panel should describe the next level milestone');
  assert.match(panel.textContent, /\$120 – \$360/, 'quality panel should include formatted payout range');
});

test('renderActionPanel skips disabled actions and wires handler', t => {
  const dom = withDom(t);
  const instance = {
    id: 'blog-9',
    actions: [
      { id: 'revise', label: 'Revise series', time: 3, cost: 90, available: true },
      { id: 'draft', label: 'Draft sequel', time: 0, cost: 0, available: false }
    ]
  };

  let runArgs = null;
  const panel = renderActionPanel({
    instance,
    handlers: {
      onRunAction: (...args) => {
        runArgs = args;
      }
    },
    formatHours: value => `${value}h`,
    formatCurrency: value => `$${value}`
  });

  const actionButtons = panel.querySelectorAll('.blogpress-action-list button');
  assert.equal(actionButtons.length, 2, 'action panel should render a button for each action');
  const firstButton = actionButtons[0];
  firstButton.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.deepEqual(runArgs, ['blog-9', 'revise'], 'clicking an available action should forward to handler');
  assert.ok(actionButtons[1].disabled, 'second action should be disabled when unavailable');

  const sellButton = panel.querySelector('.blogpress-action-footer button');
  assert.ok(sellButton, 'action panel should render a sell button');
});

test('renderIncomePanel lists active events with impact details', t => {
  withDom(t);
  const instance = {
    status: { id: 'active', label: 'Active' },
    averagePayout: 120,
    latestPayout: 140,
    lifetimeIncome: 840,
    estimatedSpend: 420,
    lifetimeNet: 420,
    pendingIncome: 60,
    maintenanceFunded: true,
    maintenance: { hasUpkeep: true, text: '2h • $20/day' },
    events: [
      {
        id: 'event-boost',
        label: 'Backlink Parade',
        percent: 0.25,
        tone: 'positive',
        remainingDays: 2,
        source: 'asset'
      },
      {
        id: 'event-trend',
        label: 'Wellness Festival',
        percent: -0.1,
        tone: 'negative',
        remainingDays: 1,
        source: 'niche'
      }
    ]
  };

  const panel = renderIncomePanel({
    instance,
    formatCurrency: value => `$${value}`,
    formatNetCurrency: value => `$${value}`,
    formatPercent: value => `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`
  });

  const eventRows = [...panel.querySelectorAll('.blogpress-list__item')];
  assert.equal(eventRows.length, 2, 'income panel should list each active event');
  const firstRowText = eventRows[0].textContent;
  const secondRowText = eventRows[1].textContent;
  assert.match(firstRowText, /Backlink Parade/, 'should include asset event label');
  assert.match(firstRowText, /\+25%/, 'should format positive impact with sign');
  assert.match(secondRowText, /Wellness Festival/, 'should include trend event label');
  assert.match(secondRowText, /-10%/, 'should format negative impact');
  assert.match(secondRowText, /1 day left|Final day/, 'should describe remaining time');
});
