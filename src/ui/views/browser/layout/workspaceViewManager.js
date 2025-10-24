import { getElement } from '../../../elements/registry.js';

export function createWorkspaceViewManager({
  navigationController,
  viewportManager,
  tabs,
  dom,
  pageResolver
}) {
  function isElement(node) {
    return Boolean(node && typeof node === 'object' && node.nodeType === 1);
  }

  const {
    openTab,
    closeTab,
    setActiveTab,
    isOpen,
    getFallbackTab
  } = tabs;
  const {
    getLaunchStage,
    getWorkspaceHost,
    getHomepageElement,
    getWorkspaceElement,
    buildWorkspaceUrl,
    setWorkspacePathDom
  } = dom;
  const { findPageById, findPageBySlug, homepageId } = pageResolver;

  let navigationRefs = null;
  let sessionControls = null;

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

  function getAddressBar() {
    return getElement('browserAddress') || {};
  }

  function updateAddressBar(page) {
    const address = getAddressBar();
    const input = address.input;
    if (!input) return;
    const url = buildWorkspaceUrl(page);
    input.value = url;
  }

  function revealPage(pageId, { focus = false } = {}) {
    const isHome = pageId === homepageId;
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

    const browserTabs = getElement('browserTabs');
    const reorderToggle = browserTabs?.reorderToggle;
    if (isElement(reorderToggle)) {
      reorderToggle.hidden = !isHome;
      const CustomEventCtor =
        reorderToggle.ownerDocument?.defaultView?.CustomEvent || globalThis.CustomEvent;
      if (typeof CustomEventCtor === 'function') {
        reorderToggle.dispatchEvent(
          new CustomEventCtor('browser:reorder-visibility', {
            bubbles: false,
            detail: { visible: isHome }
          })
        );
      } else if (reorderToggle.ownerDocument?.createEvent) {
        const fallbackEvent = reorderToggle.ownerDocument.createEvent('CustomEvent');
        fallbackEvent.initCustomEvent('browser:reorder-visibility', false, false, { visible: isHome });
        reorderToggle.dispatchEvent(fallbackEvent);
      }
    }
    if (isElement(browserTabs?.sidebar)) {
      browserTabs.sidebar.hidden = !isHome;
    }

    if (workspaceHost) {
      workspaceHost.querySelectorAll('[data-browser-page]').forEach(section => {
        const active = section.dataset.browserPage === pageId;
        section.hidden = !active;
        section.classList.toggle('is-active', active);
      });
    }

    if (focus) {
      viewportManager.scrollToTop({ smooth: true });
    }
  }

  function markActiveSite(pageId) {
    const containers = [];
    const list = getElement('siteList');
    if (list) containers.push(list);

    const homepage = getHomepageElement();
    if (homepage) {
      homepage
        .querySelectorAll('[data-role="browser-app-launcher"]').forEach(node => {
          if (isElement(node)) {
            containers.push(node);
          }
        });
    }

    if (!containers.length) return;

    containers.forEach(container => {
      container.querySelectorAll('[data-site-target]').forEach(control => {
        if (!isElement(control)) {
          return;
        }
        const isActive = control.dataset.siteTarget === pageId;
        control.classList.toggle('is-active', isActive);
        if (control instanceof HTMLButtonElement) {
          control.setAttribute('aria-pressed', String(isActive));
        } else if (isActive) {
          control.setAttribute('aria-current', 'page');
        } else {
          control.removeAttribute('aria-current');
        }
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

  function setActivePage(targetId, {
    recordHistory = true,
    focus = false,
    ensureTab: shouldEnsureTab = true
  } = {}) {
    const resolved =
      findPageById(targetId) || findPageBySlug(targetId) || findPageById(homepageId);
    const pageId = resolved?.id || homepageId;

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
      if (pageId !== homepageId) {
        setActivePage(homepageId, { recordHistory: false, focus: false, ensureTab: false });
      }
      if (result.closed && result.wasActive) {
        const fallback = result.fallbackId || homepageId;
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
      const fallback = result.fallbackId || getFallbackTab(pageId) || homepageId;
      setActivePage(fallback, { recordHistory: false, focus: true, ensureTab: false });
    } else {
      navigationController.updateButtons(getNavigationRefs());
    }
  }

  function applyHustleFilters(model = {}) {
    const list = document.querySelector('[data-role="browser-hustle-list"]');
    if (!list) return;
    const cards = Array.from(list.querySelectorAll('[data-offer-id]'));
    const cardMap = new Map();
    cards.forEach(card => {
      const id = (card.dataset.offerId || '').trim();
      if (!id) return;
      cardMap.set(id, card);
    });
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

  function setWorkspacePath(pageId, path) {
    setWorkspacePathDom(pageId, path);
    if (navigationController.getCurrentPage() === pageId) {
      updateAddressBar(findPageById(pageId));
    }
  }

  return {
    setActivePage,
    openWorkspace,
    handleTabSelect,
    handleTabClose,
    refreshActivePage,
    applyFilters,
    setWorkspacePath,
    getNavigationRefs,
    getSessionControls,
    getAddressBar
  };
}

