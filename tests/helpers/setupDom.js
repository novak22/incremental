import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import { setActiveView } from '../../src/ui/viewManager.js';
import browserView from '../../src/ui/views/browser/index.js';

let dom;

function loadBrowserShellHtml() {
  const htmlUrl = new URL('../../index.html', import.meta.url);
  const filePath = fileURLToPath(htmlUrl);
  return readFileSync(filePath, 'utf-8');
}

export function ensureTestDom() {
  if (dom) return dom;

  const html = loadBrowserShellHtml();
  dom = new JSDOM(html, {
    url: 'https://example.com',
    pretendToBeVisual: true
  });

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
