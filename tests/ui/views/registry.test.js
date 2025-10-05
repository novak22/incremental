import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  getRegisteredViews,
  registerView,
  unregisterView,
  resolveInitialView
} from '../../../src/ui/views/registry.js';

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
  const { dom, restore } = withDom(
    '<!DOCTYPE html><html><body><div id="browser-home"></div><div id="developer-root"></div></body></html>',
    { url: 'https://example.com/?view=developer' }
  );

  t.after(restore);

  const resolved = resolveInitialView(dom.window.document);
  assert.equal(resolved?.id, 'developer');
});
