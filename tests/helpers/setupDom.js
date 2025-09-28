import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

let dom;

export function ensureTestDom() {
  if (dom) return dom;
  dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div class="app">
        <header class="dashboard-header">
          <div class="top-bar">
            <span id="money"></span>
            <div>
              <span id="time"></span>
              <span id="time-note"></span>
              <div id="time-progress"></div>
              <ul id="time-legend"></ul>
            </div>
            <span id="day"></span>
            <button id="end-day"></button>
          </div>
          <nav class="section-nav" id="section-nav">
            <a class="section-link" href="#section-hustles"></a>
            <a class="section-link" href="#section-education"></a>
            <a class="section-link" href="#section-assets"></a>
            <a class="section-link" href="#section-upgrades"></a>
          </nav>
        </header>
        <section id="stats-panel" data-collapsed="true">
          <button id="stats-toggle"></button>
          <div>
            <details id="summary-time-card">
              <summary>
                <span id="summary-time"></span>
                <span id="summary-time-caption"></span>
              </summary>
              <ul id="summary-time-breakdown"></ul>
            </details>
            <details id="summary-income-card">
              <summary>
                <span id="summary-income"></span>
                <span id="summary-income-caption"></span>
              </summary>
              <ul id="summary-income-breakdown"></ul>
            </details>
            <details id="summary-cost-card">
              <summary>
                <span id="summary-cost"></span>
                <span id="summary-cost-caption"></span>
              </summary>
              <ul id="summary-cost-breakdown"></ul>
            </details>
            <details id="summary-study-card">
              <summary>
                <span id="summary-study"></span>
                <span id="summary-study-caption"></span>
              </summary>
              <ul id="summary-study-breakdown"></ul>
            </details>
          </div>
        </section>
        <main class="workspace">
          <section class="global-filters">
            <input type="checkbox" id="filter-hide-locked" />
            <input type="checkbox" id="filter-hide-completed" />
            <input type="checkbox" id="filter-show-active" />
          </section>
          <section id="workspace-panels" class="workspace-panels">
            <section class="workspace-section" id="section-hustles">
              <div id="hustle-grid"></div>
            </section>
            <section class="workspace-section" id="section-education">
              <input type="checkbox" id="filter-education-active" />
              <input type="checkbox" id="filter-education-hide-complete" />
              <div id="education-grid"></div>
            </section>
            <section class="workspace-section assets-section" id="section-assets">
              <input type="checkbox" id="filter-assets-collapsed" />
              <input type="checkbox" id="filter-assets-hide-locked" />
              <div id="asset-grid">
                <div id="asset-grid-foundation"></div>
                <div id="asset-grid-creative"></div>
                <div id="asset-grid-commerce"></div>
                <div id="asset-grid-advanced"></div>
              </div>
            </section>
            <section class="workspace-section" id="section-upgrades">
              <input type="search" id="upgrade-search" />
              <div id="upgrade-grid-equipment"></div>
              <div id="upgrade-grid-automation"></div>
              <div id="upgrade-grid-consumables"></div>
              <div id="upgrade-grid"></div>
            </section>
          </section>
        </main>
        <section class="log">
          <div id="log-tip"></div>
          <button id="log-toggle"></button>
          <div id="log-feed"></div>
        </section>
      </div>
      <template id="log-template">
        <div class="log-entry">
          <span class="timestamp"></span>
          <p class="message"></p>
        </div>
      </template>
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
