import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

let dom;

export function ensureTestDom() {
  if (dom) return dom;
  dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <header>
        <span id="money"></span>
        <span id="time"></span>
        <div id="time-progress"></div>
        <span id="day"></span>
      </header>
      <main>
        <div id="hustle-grid"></div>
        <div id="asset-grid"></div>
        <div id="upgrade-grid"></div>
      </main>
      <section>
        <div id="log-tip"></div>
        <div id="log-feed"></div>
        <template id="log-template">
          <div class="log-entry">
            <span class="timestamp"></span>
            <p class="message"></p>
          </div>
        </template>
      </section>
      <button id="end-day"></button>
    </body></html>`,
    { url: 'https://example.com' }
  );

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

  return dom;
}
