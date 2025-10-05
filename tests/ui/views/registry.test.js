import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  getRegisteredViews,
  registerView,
  unregisterView,
  resolveInitialView
} from '../../../src/ui/views/registry.js';
import browserView from '../../../src/ui/views/browser/index.js';

function withDom(html, options = {}) {
  const dom = new JSDOM(html, options);
  const previousWindow = global.window;
  const previousDocument = global.document;

  global.window = dom.window;
  global.document = dom.window.document;

  return {
    dom,
    restore() {
      dom.window.close();
      if (previousWindow === undefined) {
        delete global.window;
      } else {
        global.window = previousWindow;
      }

      if (previousDocument === undefined) {
        delete global.document;
      } else {
        global.document = previousDocument;
      }
    }
  };
}

function expectResolvedView(t, { html, url, expectedId }) {
  const { dom, restore } = withDom(html, { url });

  t.after(restore);

  const resolved = resolveInitialView(dom.window.document);
  assert.equal(resolved?.id, expectedId);
}

test('registry exposes built-in views with guards and presenters', () => {
  const entries = getRegisteredViews();
  const ids = entries.map(entry => entry.id);

  assert.deepEqual(ids, ['browser', 'developer']);

  for (const entry of entries) {
    assert.equal(typeof entry.guard, 'function');
    assert.equal(typeof entry.presenters, 'object');
  }
});

test('resolveInitialView picks a flagged view when guard passes', t => {
  const { dom, restore } = withDom(
    '<!DOCTYPE html><html><body><div id="browser-home"></div></body></html>',
    { url: 'https://example.com/?ui=browser' }
  );

  t.after(restore);

  const resolved = resolveInitialView(dom.window.document);
  assert.equal(resolved?.id, 'browser');
});

test('newly registered views can be resolved without entry point changes', t => {
  const futureView = {
    id: 'future',
    presenters: { layout: () => {} }
  };

  const { dom, restore } = withDom(
    '<!DOCTYPE html><html><body data-ui-view="future"><div id="future-shell"></div></body></html>',
    { url: 'https://example.com/' }
  );

  registerView(futureView, {
    guard: root => Boolean(root?.getElementById('future-shell'))
  });

  t.after(() => {
    unregisterView('future');
    restore();
  });

  const resolved = resolveInitialView(dom.window.document);
  assert.equal(resolved, futureView);
});

test('developer view resolves when requested via query flag', t => {
  const html =
    '<!DOCTYPE html><html><body><div id="browser-home"></div><div id="developer-root"></div></body></html>';

  expectResolvedView(t, {
    html,
    url: 'https://example.com/',
    expectedId: 'browser'
  });

  expectResolvedView(t, {
    html,
    url: 'https://example.com/?view=browser',
    expectedId: 'browser'
  });

  expectResolvedView(t, {
    html,
    url: 'https://example.com/?view=developer',
    expectedId: 'developer'
  });
});

test('developer view can be requested via body dataset', t => {
  const html =
    '<!DOCTYPE html><html><body data-ui-view="developer"><div id="browser-home"></div><div id="developer-root"></div></body></html>';

  expectResolvedView(t, {
    html,
    url: 'https://example.com/',
    expectedId: 'developer'
  });
});

test('browser view activation restores default chrome', t => {
  const html =
    '<!DOCTYPE html><html><body class="developer-view-active"><div class="browser-shell" hidden aria-hidden="true"></div><div id="developer-root"></div></body></html>';

  const { dom, restore } = withDom(html, { url: 'https://example.com/' });

  t.after(restore);

  const doc = dom.window.document;
  const container = doc.getElementById('developer-root');
  const shell = doc.querySelector('.browser-shell');

  container.hidden = false;
  container.removeAttribute('hidden');
  container.removeAttribute('aria-hidden');

  browserView.onActivate({ root: doc });

  assert.equal(container.hidden, true);
  assert.equal(container.getAttribute('aria-hidden'), 'true');
  assert.equal(doc.body.classList.contains('developer-view-active'), false);
  assert.equal(shell.hasAttribute('hidden'), false);
  assert.equal(shell.getAttribute('aria-hidden'), null);
});
