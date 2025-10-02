import { getElement } from '../../../elements/registry.js';
import { HOMEPAGE_ID, findPageById } from '../config.js';

const openTabs = new Set([HOMEPAGE_ID]);
const tabOrder = [HOMEPAGE_ID];
const activationHistory = [HOMEPAGE_ID];
let activeTab = HOMEPAGE_ID;
let tabRefs = null;

function removeFromArray(list, value) {
  const index = list.indexOf(value);
  if (index !== -1) {
    list.splice(index, 1);
  }
}

function getTabRefs() {
  if (!tabRefs) {
    tabRefs = getElement('browserTabs') || {};
  }
  return tabRefs;
}

function ensureTab(pageId) {
  if (!pageId || openTabs.has(pageId)) {
    return false;
  }
  openTabs.add(pageId);
  tabOrder.push(pageId);
  return true;
}

function recordActivation(pageId) {
  removeFromArray(activationHistory, pageId);
  activationHistory.push(pageId);
}

function getFallbackTab(closedId) {
  for (let index = activationHistory.length - 1; index >= 0; index -= 1) {
    const candidate = activationHistory[index];
    if (candidate && candidate !== closedId && openTabs.has(candidate)) {
      return candidate;
    }
  }
  return HOMEPAGE_ID;
}

function renderTabs() {
  const { list } = getTabRefs();
  if (!list) return;

  list.innerHTML = '';

  tabOrder.forEach(pageId => {
    if (!openTabs.has(pageId)) return;
    const page = findPageById(pageId);
    if (!page) return;

    const item = document.createElement('li');
    item.className = 'browser-tab';
    item.dataset.tab = pageId;
    if (pageId === activeTab) {
      item.classList.add('is-active');
    }

    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = 'browser-tab__button';
    tabButton.dataset.tabTarget = pageId;
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', pageId === activeTab ? 'true' : 'false');
    const panelId =
      pageId === HOMEPAGE_ID ? 'browser-launch-stage' : `browser-page-${page.slug || page.id}`;
    tabButton.setAttribute('aria-controls', panelId);
    tabButton.tabIndex = pageId === activeTab ? 0 : -1;

    const icon = document.createElement('span');
    icon.className = 'browser-tab__icon';
    icon.textContent = page.icon || '✨';

    const label = document.createElement('span');
    label.className = 'browser-tab__label';
    label.textContent = page.label || page.name || 'Workspace';

    tabButton.append(icon, label);
    item.appendChild(tabButton);

    if (pageId !== HOMEPAGE_ID) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'browser-tab__close';
      close.dataset.tabClose = pageId;
      close.setAttribute('aria-label', `Close ${page.label || page.name || 'workspace'} tab`);
      close.textContent = '×';
      item.appendChild(close);
    }

    list.appendChild(item);
  });
}

function initTabControls({ onSelectTab, onCloseTab } = {}) {
  const { list } = getTabRefs();
  if (list) {
    list.addEventListener('click', event => {
      const closeTarget = event.target.closest('[data-tab-close]');
      if (closeTarget) {
        event.preventDefault();
        onCloseTab?.(closeTarget.dataset.tabClose);
        return;
      }

      const tabTarget = event.target.closest('[data-tab-target]');
      if (tabTarget) {
        event.preventDefault();
        onSelectTab?.(tabTarget.dataset.tabTarget);
      }
    });
  }
  renderTabs();
}

function openTab(pageId) {
  const added = ensureTab(pageId);
  if (added) {
    renderTabs();
  }
  return added;
}

function closeTab(pageId) {
  if (pageId === HOMEPAGE_ID || !openTabs.has(pageId)) {
    return { closed: false, wasActive: false, fallbackId: null };
  }

  openTabs.delete(pageId);
  removeFromArray(tabOrder, pageId);
  removeFromArray(activationHistory, pageId);

  const wasActive = activeTab === pageId;
  const fallbackId = wasActive ? getFallbackTab(pageId) : null;

  renderTabs();

  return { closed: true, wasActive, fallbackId };
}

function setActiveTab(pageId) {
  if (!openTabs.has(pageId)) {
    return false;
  }
  activeTab = pageId;
  recordActivation(pageId);
  renderTabs();
  return true;
}

function isOpen(pageId) {
  return openTabs.has(pageId);
}

function getActiveTab() {
  return activeTab;
}

const tabControls = {
  initTabControls,
  openTab,
  closeTab,
  setActiveTab,
  isOpen,
  getActiveTab,
  getFallbackTab,
  renderTabs
};

export {
  initTabControls,
  openTab,
  closeTab,
  setActiveTab,
  isOpen,
  getActiveTab,
  getFallbackTab,
  renderTabs
};

export default tabControls;
