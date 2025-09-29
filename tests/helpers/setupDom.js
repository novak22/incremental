import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

let dom;

export function ensureTestDom() {
  if (dom) return dom;
  dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div class="shell">
        <header class="shell__header">
          <div class="shell__brand">
            <h1>Test Shell</h1>
            <p id="session-status"></p>
          </div>
          <div class="shell__pulse">
            <div class="shell-metric">
              <span id="header-daily-plus"></span>
              <span id="header-daily-plus-note"></span>
            </div>
            <div class="shell-metric">
              <span id="header-daily-minus"></span>
              <span id="header-daily-minus-note"></span>
            </div>
            <div class="shell-metric">
              <span id="header-total-plus"></span>
              <span id="header-total-plus-note"></span>
            </div>
            <div class="shell-metric">
              <span id="header-total-minus"></span>
              <span id="header-total-minus-note"></span>
            </div>
            <div class="shell-metric">
              <span id="header-time-available"></span>
              <span id="header-time-available-note"></span>
            </div>
            <div class="shell-metric">
              <span id="header-time-reserved"></span>
              <span id="header-time-reserved-note"></span>
            </div>
          </div>
          <div class="shell__controls">
            <button id="command-palette-trigger"></button>
            <button id="end-day"></button>
          </div>
        </header>
        <nav class="shell__tabs" role="tablist">
          <button id="tab-dashboard" class="shell__tab" aria-controls="panel-dashboard"></button>
          <button id="tab-hustles" class="shell__tab" aria-controls="panel-hustles"></button>
          <button id="tab-assets" class="shell__tab" aria-controls="panel-assets"></button>
          <button id="tab-upgrades" class="shell__tab" aria-controls="panel-upgrades"></button>
          <button id="tab-education" class="shell__tab" aria-controls="panel-education"></button>
        </nav>
        <main class="shell__main">
          <section id="panel-dashboard" class="panel">
            <section class="dashboard__kpis">
              <button id="kpi-cash"></button>
              <button id="kpi-net"><span id="kpi-net-value"></span><span id="kpi-net-note"></span></button>
              <button id="kpi-hours"><span id="kpi-hours-value"></span><span id="kpi-hours-note"></span></button>
              <button id="kpi-upkeep"><span id="kpi-upkeep-value"></span><span id="kpi-upkeep-note"></span></button>
              <button id="kpi-assets"><span id="kpi-assets-value"></span><span id="kpi-assets-note"></span></button>
              <button id="kpi-study"><span id="kpi-study-value"></span><span id="kpi-study-note"></span></button>
            </section>
            <section class="dashboard__grid">
              <div class="dashboard__top-row">
                <article><div id="daily-time-summary"></div></article>
                <article><ul id="quick-actions"></ul></article>
                <article><ul id="asset-upgrade-actions"></ul></article>
              </div>
              <div class="dashboard__scroll">
                <article><div id="dashboard-skills"></div></article>
                <article><ul id="notification-list"></ul></article>
                <article>
                  <div id="event-log-preview"></div>
                  <button id="open-event-log"></button>
                </article>
                <article>
                  <ol id="action-queue"></ol>
                  <button id="queue-pause"></button>
                  <button id="queue-cancel"></button>
                </article>
              </div>
            </section>
          </section>
          <section id="panel-hustles" class="panel" hidden>
            <input id="hustle-search" />
            <input id="hustle-available-toggle" type="checkbox" />
            <select id="hustle-sort"></select>
            <div id="hustle-category-chips"></div>
            <div id="hustle-req-chips"></div>
            <div id="hustle-list"></div>
          </section>
          <section id="panel-assets" class="panel" hidden>
            <input id="asset-active-toggle" type="checkbox" />
            <input id="asset-maintenance-toggle" type="checkbox" />
            <input id="asset-risk-toggle" type="checkbox" />
            <table>
              <tbody id="asset-table-body"></tbody>
            </table>
            <div id="asset-selection-note"></div>
            <button id="asset-batch-maintain"></button>
            <button id="asset-batch-pause"></button>
            <button id="asset-batch-preset"></button>
          </section>
          <section id="panel-upgrades" class="panel" hidden>
            <input id="upgrade-search" />
            <input id="upgrade-affordable-toggle" type="checkbox" />
            <input id="upgrade-favorites-toggle" type="checkbox" />
            <div id="upgrade-category-chips"></div>
            <div id="upgrade-list"></div>
            <aside>
              <ul id="upgrade-dock-list"></ul>
            </aside>
          </section>
          <section id="panel-education" class="panel" hidden>
            <input id="study-active-toggle" type="checkbox" />
            <input id="study-hide-complete" type="checkbox" />
            <ol id="study-queue-list"></ol>
            <span id="study-queue-eta"></span>
            <span id="study-queue-cap"></span>
            <div id="study-track-list"></div>
          </section>
        </main>
      </div>
      <template id="log-template"><article class="log-entry"><span class="timestamp"></span><p class="message"></p></article></template>
      <div id="log-tip"></div>
      <div id="slide-over"><div class="slide-over__backdrop" data-close="slide-over"></div><div class="slide-over__panel"><header><p id="slide-over-eyebrow"></p><h2 id="slide-over-title"></h2><button id="slide-over-close" data-close="slide-over"></button></header><div id="slide-over-content"></div></div></div>
      <aside id="event-log-panel" hidden><button id="event-log-close" data-close="event-log"></button></aside>
      <div id="log-feed"></div>
      <div id="command-palette"><div class="command-palette__backdrop" data-close="command"></div><div class="command-palette__panel"><header><input id="command-palette-search" /></header><ul id="command-palette-results"></ul></div></div>
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
