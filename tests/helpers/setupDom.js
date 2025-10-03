import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { setActiveView } from '../../src/ui/viewManager.js';
import browserView from '../../src/ui/views/browser/index.js';

const browserMarkup = readFileSync(new URL('../../browser.html', import.meta.url), 'utf8');

let dom;

export function ensureTestDom() {
  if (dom) return dom;

  dom = new JSDOM(browserMarkup, { url: 'https://example.com/' });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  global.requestAnimationFrame = window.requestAnimationFrame ?? (cb => setTimeout(cb, 16));
  global.cancelAnimationFrame = window.cancelAnimationFrame ?? clearTimeout;
  global.localStorage = window.localStorage;
  global.performance = window.performance;
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
  Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });

  setActiveView(browserView, window.document);

  return dom;
}

export function getTestDom() {
  return dom;
}

export function destroyTestDom() {
  if (!dom) return;

  const { window } = dom;
  if (window && typeof window.close === 'function') {
    window.close();
  }

  delete global.window;
  delete global.document;
  delete global.navigator;
  delete global.HTMLElement;
  delete global.Node;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete global.localStorage;
  delete global.performance;
  delete global.crypto;

  dom = null;
}
