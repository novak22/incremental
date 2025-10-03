import { renderCollections, updateCollections } from '../../cards/presenters/shared.js';
import { getElement } from '../../elements/registry.js';
import { SERVICE_PAGES } from './config.js';
import renderYourNetwork from './apps/yourNetwork.js';
import renderHustles from './apps/hustles.js';
import renderTrends from './apps/trends.js';
import renderDigishelf from './apps/digishelf.js';
import renderVideoTube from './apps/videotube.js';
import renderBlogpress from './apps/blogpress.js';
import renderShopily from './apps/shopily.js';
import renderServerHub from './apps/serverhub.js';
import renderUpgrades from './apps/upgrades.js';
import renderEducation from './apps/education.js';
import renderFinance from './apps/finance.js';
import {
  cachePayload,
  getCachedPayload,
  setServiceSummaries,
  getLatestServiceSummaries as getManagedSummaries,
  subscribeToServiceSummaries as subscribeToManaged
} from './apps/serviceManager.js';

let mainContainer = null;
const pageSections = new Map();

function getMainContainer() {
  if (mainContainer) return mainContainer;
  const host = getElement('workspaceHost');
  const container = host || document.getElementById('browser-workspaces');
  mainContainer = container;
  return mainContainer;
}

function createPageSection(page) {
  const main = getMainContainer();
  if (!main || pageSections.has(page.id)) {
    return pageSections.get(page.id) || null;
  }

  const section = document.createElement('section');
  section.className = 'browser-page';
  section.dataset.browserPage = page.id;
  section.id = `browser-page-${page.slug}`;

  const header = document.createElement('header');
  header.className = 'browser-page__header';

  let title = null;
  if (page.headline) {
    title = document.createElement('h1');
    title.textContent = page.headline;
    header.appendChild(title);
  }

  let note = null;
  if (page.tagline) {
    note = document.createElement('p');
    note.textContent = page.tagline;
    header.appendChild(note);
  }

  const body = document.createElement('div');
  body.className = 'browser-page__body';

  if (header.childNodes.length > 0) {
    section.append(header, body);
  } else {
    section.appendChild(body);
  }
  main.appendChild(section);

  const refs = { section, header: header.childNodes.length ? header : null, note, body };
  pageSections.set(page.id, refs);
  return refs;
}

function ensurePageContent(page, builder) {
  const refs = createPageSection(page);
  if (!refs) return null;
  if (typeof builder === 'function') {
    builder(refs);
  }
  return refs;
}

function renderSiteList(summaries = []) {
  const list = getElement('siteList');
  if (!list) return;
  list.innerHTML = '';

  const summaryMap = new Map(summaries.map(entry => [entry?.id, entry]));
  const visiblePages = SERVICE_PAGES.filter(page => {
    const meta = summaryMap.get(page.id)?.meta || '';
    return !/lock/i.test(meta);
  });

  visiblePages.forEach(page => {
    const summary = summaryMap.get(page.id) || {};
    const li = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-app-card';
    button.dataset.siteTarget = page.id;
    button.setAttribute('aria-label', `${page.label} workspace`);

    const icon = document.createElement('span');
    icon.className = 'browser-app-card__icon';
    icon.textContent = page.icon || '✨';

    const header = document.createElement('div');
    header.className = 'browser-app-card__header';

    const title = document.createElement('span');
    title.className = 'browser-app-card__title';
    title.textContent = page.label;
    header.appendChild(title);

    if (summary.meta) {
      const badge = document.createElement('span');
      badge.className = 'browser-app-card__badge';
      badge.textContent = summary.meta;
      header.appendChild(badge);
    }

    const meta = document.createElement('p');
    meta.className = 'browser-app-card__meta';
    meta.textContent = page.tagline;

    button.append(icon, header, meta);
    li.appendChild(button);
    list.appendChild(li);
  });

  const addButton = getElement('addSiteButton');
  if (addButton) {
    addButton.classList.add('browser-app-button');
    const addWrapper = document.createElement('li');
    addWrapper.appendChild(addButton);
    list.appendChild(addWrapper);
  }

  const note = getElement('siteListNote');
  if (note) {
    note.textContent = visiblePages.length
      ? 'Launch into any app. Status badges refresh in real time.'
      : 'Unlock more workspaces through upgrades and courses.';
  }
}

export const APP_RENDERERS = [
  (context, registries = {}, models = {}) => renderYourNetwork(context, models),
  (context, registries = {}, models = {}) =>
    renderHustles(context, registries.hustles || [], models.hustles || []),
  (context, registries = {}, models = {}) =>
    renderDigishelf(context, registries.assets || [], models.digishelf || {}),
  (context, registries = {}, models = {}) =>
    renderServerHub(context, registries.assets || [], models.serverhub || {}),
  (context, registries = {}, models = {}) =>
    renderVideoTube(context, registries.assets || [], models.videotube || {}),
  (context, registries = {}, models = {}) =>
    renderShopily(context, registries.assets || [], models.shopily || {}),
  (context, registries = {}, models = {}) => renderTrends(context, models.trends || {}),
  (context, registries = {}, models = {}) =>
    renderBlogpress(context, registries.assets || [], models.blogpress || {}),
  (context, registries = {}, models = {}) =>
    renderUpgrades(context, registries.upgrades || [], models.upgrades || {}),
  (context, registries = {}, models = {}) =>
    renderEducation(context, registries.education || [], models.education || {}),
  (context, registries = {}, models = {}) => renderFinance(context, registries, models)
];

function collectSummaries(context, registries = {}, models = {}) {
  const summaries = [];
  APP_RENDERERS.forEach(renderer => {
    const summary = renderer(context, registries, models);
    if (summary) summaries.push(summary);
  });
  return summaries;
}

function cacheBrowserPayload(registries = {}, models = {}) {
  cachePayload(registries, models);
}

function renderBrowserCollections(registries = {}, models = {}) {
  const context = { ensurePageContent };
  const summaries = collectSummaries(context, registries, models);

  renderSiteList(summaries);
  setServiceSummaries(summaries);
}

export function renderAll(payload = {}) {
  renderCollections(payload, {
    cache: cacheBrowserPayload,
    render: renderBrowserCollections
  });
}

export function update(payload = {}) {
  updateCollections(payload, {
    cache: cacheBrowserPayload,
    update: renderBrowserCollections
  });
}

export function updateCard() {
  const cached = getCachedPayload();
  if (!cached) return;
  renderCollections(cached, {
    cache: cacheBrowserPayload,
    render: renderBrowserCollections
  });
}

export function refreshUpgradeSections() {
  updateCard();
}

export function getLatestServiceSummaries() {
  return getManagedSummaries();
}

export function subscribeToServiceSummaries(listener) {
  return subscribeToManaged(listener);
}

export default {
  renderAll,
  update,
  updateCard,
  refreshUpgradeSections
};
