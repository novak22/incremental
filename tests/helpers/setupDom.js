import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import { setActiveView } from '../../src/ui/viewManager.js';
import classicView from '../../src/ui/views/classic/index.js';

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
            <button id="end-day"></button>
          </div>
        </header>
        <nav class="shell__tabs" role="tablist">
          <button id="tab-dashboard" class="shell__tab" aria-controls="panel-dashboard"></button>
          <button id="tab-hustles" class="shell__tab" aria-controls="panel-hustles"></button>
          <button id="tab-ventures" class="shell__tab" aria-controls="panel-ventures"></button>
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
              <button id="kpi-ventures"><span id="kpi-ventures-value"></span><span id="kpi-ventures-note"></span></button>
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
                </article>
              </div>
            </section>
          </section>
          <section id="panel-hustles" class="panel" hidden>
            <input id="hustle-search" />
            <input id="hustle-available-toggle" type="checkbox" />
            <select id="hustle-sort"></select>
            <div id="hustle-list"></div>
          </section>
          <section id="panel-ventures" class="panel" hidden>
            <header class="panel__header venture-panel__header">
              <div class="venture-panel__intro">
                <h2>Ventures</h2>
                <p>Test venture hub</p>
              </div>
              <div class="filter-bar venture-panel__filters" role="group" aria-label="Venture filters">
                <label class="filter-toggle">
                  <input id="venture-active-toggle" type="checkbox" />
                  <span>Active only</span>
                </label>
                <label class="filter-toggle">
                  <input id="venture-maintenance-toggle" type="checkbox" />
                  <span>Needs upkeep</span>
                </label>
                <label class="filter-toggle">
                  <input id="venture-risk-toggle" type="checkbox" />
                  <span>Hide high risk</span>
                </label>
              </div>
            </header>
            <div class="asset-gallery venture-gallery" id="venture-gallery"></div>
          </section>
          <section id="panel-upgrades" class="panel" hidden>
            <input id="upgrade-unlocked-toggle" type="checkbox" checked />
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

  setActiveView(classicView, window.document);

  return dom;
}
