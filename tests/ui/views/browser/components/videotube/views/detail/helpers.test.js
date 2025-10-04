import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  renderActionsPanel,
  renderNichePanel,
  renderRenameForm
} from '../../../../../../../../src/ui/views/browser/components/videotube/views/detail/index.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.com' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  return dom;
}

function teardownDom(dom) {
  dom.window.close();
  delete global.window;
  delete global.document;
  delete global.HTMLElement;
  delete global.Node;
}

test('rename form submits the entered title through onRename', () => {
  const dom = setupDom();
  try {
    const calls = [];
    const video = { id: 'vt-1', fallbackLabel: 'Starter Title', customName: 'Custom Title' };
    const form = renderRenameForm(video, {
      onRename: (videoId, value) => {
        calls.push({ videoId, value });
      }
    });

    document.body.appendChild(form);
    const input = form.querySelector('input');
    input.value = 'Edited Title';

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    assert.deepEqual(calls, [{ videoId: 'vt-1', value: 'Edited Title' }]);
  } finally {
    teardownDom(dom);
  }
});

test('quality action buttons trigger onQuickAction when available', () => {
  const dom = setupDom();
  try {
    const calls = [];
    const video = {
      id: 'vt-2',
      actions: [
        {
          id: 'boost-quality',
          label: 'Boost quality',
          effect: 'Glow up your production',
          time: 2,
          cost: 150,
          available: true
        }
      ]
    };

    const panel = renderActionsPanel(video, {
      formatCurrency: amount => `$${amount}`,
      formatHours: hours => `${hours} hours`,
      onQuickAction: (videoId, actionId) => {
        calls.push({ videoId, actionId });
      }
    });

    document.body.appendChild(panel);
    const button = panel.querySelector('button');
    button.click();

    assert.deepEqual(calls, [{ videoId: 'vt-2', actionId: 'boost-quality' }]);
  } finally {
    teardownDom(dom);
  }
});

test('niche selection propagates the chosen option through onNicheSelect', () => {
  const dom = setupDom();
  try {
    const calls = [];
    const video = {
      id: 'vt-3',
      nicheLocked: false,
      niche: null,
      nicheOptions: [
        { id: 'niche-alpha', name: 'Arcade retro', label: 'Hot', summary: 'Trendsetters adore it.' }
      ]
    };

    const panel = renderNichePanel(video, {
      onNicheSelect: (videoId, nicheId) => {
        calls.push({ videoId, nicheId });
      }
    });

    document.body.appendChild(panel);
    const select = panel.querySelector('select');
    select.value = 'niche-alpha';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    assert.deepEqual(calls, [{ videoId: 'vt-3', nicheId: 'niche-alpha' }]);
  } finally {
    teardownDom(dom);
  }
});
