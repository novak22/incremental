import { getElement } from '../../elements/registry.js';
import { HOMEPAGE_ID, findPageById, findPageBySlug } from './config.js';
import { initThemeControls } from './layout/theme.js';
import { createNavigationController } from './layout/navigation.js';
import {
  initTabControls,
  openTab,
  closeTab,
  setActiveTab,
  isOpen,
  getFallbackTab
} from './layout/tabs.js';
import {
  getLaunchStage,
  getWorkspaceHost,
  getHomepageElement,
  getWorkspaceElement,
  buildWorkspaceUrl,
  setWorkspacePath as setWorkspacePathDom
} from './layout/workspaces.js';

let navigationRefs = null;
let sessionControls = null;

const navigationController = createNavigationController({ homepageId: HOMEPAGE_ID });

function scrollViewportToTop({ smooth = false } = {}) {
  if (typeof window === 'undefined') return;
  const behavior = smooth ? 'smooth' : 'auto';
  if (typeof window.scrollTo === 'function') {
    try {
      window.scrollTo({ top: 0, behavior });
      return;
    } catch (error) {
      window.scrollTo(0, 0);
      return;
    }
  }

  if (typeof document !== 'undefined') {
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }
}

function getNavigationRefs() {
  if (!navigationRefs) {
    navigationRefs = getElement('browserNavigation') || {};
  }
  return navigationRefs;
}

function getSessionControls() {
  if (!sessionControls) {
    sessionControls = getElement('browserSessionControls') || {};
  }
  return sessionControls;
}

function updateAddressBar(page) {
  const address = getElement('browserAddress') || {};
  const input = address.input;
  if (!input) return;
  const url = buildWorkspaceUrl(page);
  input.value = url;
}

function revealPage(pageId, { focus = false } = {}) {
  const isHome = pageId === HOMEPAGE_ID;
  const launchStage = getLaunchStage();
  if (launchStage) {
    launchStage.hidden = !isHome;
    launchStage.classList.toggle('is-active', isHome);
  }

  const workspaceHost = getWorkspaceHost();
  if (workspaceHost) {
    workspaceHost.hidden = isHome;
    workspaceHost.classList.toggle('is-active', !isHome);
  }

  const homepageContent = getHomepageElement();
  if (homepageContent) {
    homepageContent.hidden = !isHome;
    homepageContent.classList.toggle('is-active', isHome);
  }

  if (workspaceHost) {
    workspaceHost.querySelectorAll('[data-browser-page]').forEach(section => {
      const active = section.dataset.browserPage === pageId;
      section.hidden = !active;
      section.classList.toggle('is-active', active);
    });
  }

  if (focus) {
    scrollViewportToTop({ smooth: true });
  }
}

function markActiveSite(pageId) {
  const containers = [];
  const list = getElement('siteList');
  if (list) containers.push(list);

  const homepage = getHomepageElement();
  if (homepage) {
    homepage.querySelectorAll('[data-role="browser-app-launcher"]').forEach(node => {
      if (node instanceof HTMLElement) {
        containers.push(node);
      }
    });
  }

  if (!containers.length) return;

  containers.forEach(container => {
    container.querySelectorAll('button[data-site-target]').forEach(button => {
      const isActive = button.dataset.siteTarget === pageId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  });
}

function refreshActivePage() {
  const { refreshButton } = getNavigationRefs();
  const currentPage = navigationController.getCurrentPage();
  const target = getWorkspaceElement(currentPage);
  if (refreshButton) {
    refreshButton.classList.add('is-spinning');
    window.setTimeout(() => refreshButton.classList.remove('is-spinning'), 420);
  }
  if (target) {
    target.classList.add('is-refreshing');
    window.setTimeout(() => target.classList.remove('is-refreshing'), 420);
  }
}

function handleSiteClick(event) {
  const button = event.target.closest('button[data-site-target]');
  if (!button) return;
  event.preventDefault();
  const target = button.dataset.siteTarget || HOMEPAGE_ID;
  if (target === HOMEPAGE_ID) {
    setActivePage(HOMEPAGE_ID, { focus: true, recordHistory: true, ensureTab: false });
  } else {
    openWorkspace(target, { focus: true, recordHistory: true });
  }
}

function handleTabSelect(pageId) {
  if (!pageId) return;
  setActivePage(pageId, { recordHistory: false, focus: true, ensureTab: false });
}

function handleTabClose(pageId) {
  if (!pageId) return;
  const result = closeTab(pageId);
  if (!result.closed) return;

  navigationController.purge(pageId);

  const host = getWorkspaceHost();
  const section = host?.querySelector(`[data-browser-page="${pageId}"]`);
  if (section) {
    section.hidden = true;
    section.classList.remove('is-active');
  }

  if (result.wasActive) {
    const fallback = result.fallbackId || getFallbackTab(pageId) || HOMEPAGE_ID;
    setActivePage(fallback, { recordHistory: false, focus: true, ensureTab: false });
  } else {
    navigationController.updateButtons(getNavigationRefs());
  }
}

function setActivePage(targetId, {
  recordHistory = true,
  focus = false,
  ensureTab: shouldEnsureTab = true
} = {}) {
  const resolved =
    findPageById(targetId) || findPageBySlug(targetId) || findPageById(HOMEPAGE_ID);
  const pageId = resolved?.id || HOMEPAGE_ID;

  if (shouldEnsureTab) {
    openTab(pageId);
  }

  if (!isOpen(pageId)) {
    return;
  }

  const element = getWorkspaceElement(pageId);
  if (!element) {
    const result = closeTab(pageId);
    navigationController.purge(pageId);
    if (pageId !== HOMEPAGE_ID) {
      setActivePage(HOMEPAGE_ID, { recordHistory: false, focus: false, ensureTab: false });
    }
    if (result.closed && result.wasActive) {
      const fallback = result.fallbackId || HOMEPAGE_ID;
      setActivePage(fallback, { recordHistory: false, focus: false, ensureTab: false });
    }
    return;
  }

  setActiveTab(pageId);
  revealPage(pageId, { focus });
  markActiveSite(pageId);
  updateAddressBar(resolved || findPageById(pageId));
  navigationController.handleNavigation(pageId, { recordHistory });
  navigationController.updateButtons(getNavigationRefs());
}

function openWorkspace(pageId, { focus = true, recordHistory = true } = {}) {
  if (!pageId) return;
  const resolved = findPageById(pageId) || findPageBySlug(pageId);
  if (!resolved) return;
  setActivePage(resolved.id, { recordHistory, focus, ensureTab: true });
}

function initTabs() {
  initTabControls({ onSelectTab: handleTabSelect, onCloseTab: handleTabClose });
}

function initNavigation() {
  const { backButton, forwardButton, refreshButton } = getNavigationRefs();
  if (backButton) {
    backButton.addEventListener('click', event => {
      event.preventDefault();
      navigationController.navigateBack(pageId => {
        setActivePage(pageId, { recordHistory: false, focus: true, ensureTab: false });
      });
    });
  }

  if (forwardButton) {
    forwardButton.addEventListener('click', event => {
      event.preventDefault();
      navigationController.navigateForward(pageId => {
        setActivePage(pageId, { recordHistory: false, focus: true, ensureTab: false });
      });
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', refreshActivePage);
  }

  const controls = getSessionControls();
  if (controls?.homeButton) {
    controls.homeButton.addEventListener('click', () =>
      setActivePage(HOMEPAGE_ID, { focus: true, ensureTab: false })
    );
  }

  const address = getElement('browserAddress') || {};
  if (address.form) {
    const handler = navigationController.createAddressSubmitHandler({
      getValue: () => String(address.input?.value || ''),
      setValue: value => {
        if (address.input) {
          address.input.value = value;
        }
      },
      onNavigate: pageId => setActivePage(pageId),
      findPageById,
      findPageBySlug,
      formatAddress: page => buildWorkspaceUrl(page)
    });
    address.form.addEventListener('submit', handler);
  }

  const siteList = getElement('siteList');
  if (siteList) {
    siteList.addEventListener('click', handleSiteClick);
  }

  const homepage = getHomepageElement();
  if (homepage) {
    homepage.addEventListener('click', handleSiteClick);
  }

  setActivePage(navigationController.getCurrentPage(), {
    recordHistory: false,
    ensureTab: false
  });
  navigationController.updateButtons(getNavigationRefs());
}

function initControls() {
  initTabs();
  initNavigation();
  initThemeControls();
}

function applyHustleFilters(model = {}) {
  const list = document.querySelector('[data-role="browser-hustle-list"]');
  if (!list) return;
  const cards = Array.from(list.querySelectorAll('[data-hustle]'));
  const cardMap = new Map(cards.map(card => [card.dataset.hustle, card]));
  const fragment = document.createDocumentFragment();
  const orderedIds = Array.isArray(model.orderedIds) ? model.orderedIds : [];
  const hiddenSet = new Set(Array.isArray(model.hiddenIds) ? model.hiddenIds : []);

  orderedIds.forEach(id => {
    const card = cardMap.get(id);
    if (!card) return;
    card.hidden = hiddenSet.has(id);
    fragment.appendChild(card);
    cardMap.delete(id);
    hiddenSet.delete(id);
  });

  cardMap.forEach((card, id) => {
    const hidden = hiddenSet.has(id);
    card.hidden = hidden;
    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

function applyUpgradeFilters(model = {}) {
  const hiddenSet = new Set(Array.isArray(model.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model.visibleIds) ? model.visibleIds : []);
  document.querySelectorAll('[data-upgrade]').forEach(card => {
    const id = card.dataset.upgrade;
    if (!id) return;
    if (hiddenSet.has(id)) {
      card.hidden = true;
      return;
    }
    if (visibleSet.size && !visibleSet.has(id)) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
  });
}

function applyStudyFilters(model = {}) {
  const hiddenSet = new Set(Array.isArray(model.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model.visibleIds) ? model.visibleIds : []);
  document.querySelectorAll('[data-track]').forEach(card => {
    const id = card.dataset.track;
    if (!id) return;
    if (hiddenSet.has(id)) {
      card.hidden = true;
      return;
    }
    if (visibleSet.size && !visibleSet.has(id)) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
  });
}

function applyFilters(model = {}) {
  if (!model) return;
  applyHustleFilters(model.hustles);
  applyUpgradeFilters(model.upgrades);
  applyStudyFilters(model.study);
}

const layoutPresenter = {
  initControls,
  applyFilters
};

export default layoutPresenter;

export function navigateToWorkspace(pageId, options) {
  openWorkspace(pageId, options);
}

export function setWorkspacePath(pageId, path) {
  setWorkspacePathDom(pageId, path);
  if (navigationController.getCurrentPage() === pageId) {
    updateAddressBar(findPageById(pageId));
  }
}
