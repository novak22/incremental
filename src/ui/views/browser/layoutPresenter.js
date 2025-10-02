import { getElement } from '../../elements/registry.js';
import { HOMEPAGE_ID, findPageById, findPageBySlug } from './config.js';

let currentPage = HOMEPAGE_ID;
const historyStack = [];
const futureStack = [];
let navigationRefs = null;
let sessionControls = null;
let themeToggle = null;
let currentTheme = 'day';

const openTabs = new Set([HOMEPAGE_ID]);
const tabOrder = [HOMEPAGE_ID];
let activeTab = HOMEPAGE_ID;
const activationHistory = [HOMEPAGE_ID];
let tabRefs = null;
let launchStageRef = null;
let workspaceHostRef = null;

const THEME_STORAGE_KEY = 'browser-theme';

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

function getThemeToggle() {
  if (!themeToggle) {
    themeToggle = getElement('themeToggle');
  }
  return themeToggle;
}

function getTabRefs() {
  if (!tabRefs) {
    tabRefs = getElement('browserTabs') || {};
  }
  return tabRefs;
}

function getLaunchStage() {
  if (!launchStageRef) {
    launchStageRef = getElement('launchStage') || null;
  }
  return launchStageRef;
}

function getWorkspaceHost() {
  if (!workspaceHostRef) {
    workspaceHostRef = getElement('workspaceHost') || null;
  }
  return workspaceHostRef;
}

function getShellElement() {
  return document.querySelector('.browser-shell');
}

function loadThemePreference() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveThemePreference(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // ignore storage errors
  }
}

function updateToggleState(theme) {
  const toggle = getThemeToggle();
  if (!toggle) return;
  const isNight = theme === 'night';
  toggle.setAttribute('aria-pressed', String(isNight));
  toggle.dataset.mode = theme;
  toggle.title = isNight ? 'Switch to light mode' : 'Switch to dark mode';
  const icon = toggle.querySelector('.browser-theme-toggle__icon');
  if (icon) {
    icon.textContent = isNight ? '🌜' : '🌞';
  }
  const label = toggle.querySelector('.browser-theme-toggle__label');
  if (label) {
    label.textContent = isNight ? 'Dark' : 'Light';
  }
}

function applyTheme(theme) {
  const targetTheme = theme === 'night' ? 'night' : 'day';
  currentTheme = targetTheme;
  const shell = getShellElement();
  if (shell) {
    shell.dataset.theme = targetTheme;
  }
  if (document?.documentElement) {
    document.documentElement.setAttribute('data-browser-theme', targetTheme);
  }
  updateToggleState(targetTheme);
}

function toggleTheme() {
  const next = currentTheme === 'day' ? 'night' : 'day';
  applyTheme(next);
  saveThemePreference(next);
}

function getHomepageElement() {
  return getLaunchStage() || getElement('homepage')?.container || null;
}

function getPageElement(pageId) {
  if (pageId === HOMEPAGE_ID) {
    return getHomepageElement();
  }
  const host = getWorkspaceHost();
  if (!host) return null;
  return host.querySelector(`[data-browser-page="${pageId}"]`);
}

function markActiveSite(pageId) {
  const containers = [];
  const list = getElement('siteList');
  if (list) containers.push(list);

  const homepage = getElement('homepage')?.container || null;
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

function normalizeWorkspacePath(path = '') {
  const trimmed = String(path || '')
    .trim()
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, '');
  return trimmed;
}

function getWorkspaceElement(pageId) {
  const element = getPageElement(pageId);
  if (!element) return null;
  return element;
}

function getWorkspacePath(pageId) {
  const element = getWorkspaceElement(pageId);
  if (!element) return '';
  return normalizeWorkspacePath(element.dataset.browserPath || '');
}

function setWorkspacePath(pageId, path) {
  const element = getWorkspaceElement(pageId);
  if (!element) return;
  const normalized = normalizeWorkspacePath(path);
  if (normalized) {
    element.dataset.browserPath = normalized;
  } else {
    delete element.dataset.browserPath;
  }
  if (currentPage === pageId) {
    updateAddressBar(findPageById(pageId));
  }
}

function getWorkspaceDomain(page) {
  if (!page) return 'workspace';
  const source = page.domain || page.id || page.slug || page.label || 'workspace';
  const cleaned = String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return cleaned || 'workspace';
}

function buildWorkspaceUrl(page) {
  if (!page || page.id === HOMEPAGE_ID) {
    return 'https://hustle.city/';
  }
  const domain = `${getWorkspaceDomain(page)}.hub`;
  const path = getWorkspacePath(page.id);
  const suffix = path ? `/${path}` : '/';
  return `https://${domain}${suffix}`;
}

function parseAddressValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const pattern = /^(?:https?:\/\/)?([^/]+)(?:\/(.*))?$/i;
  const match = pattern.exec(raw);
  if (!match) return null;

  const host = match[1].toLowerCase();
  const remainder = normalizeWorkspacePath(match[2] || '');

  if (host === 'hustle.city') {
    if (!remainder) {
      return { pageId: HOMEPAGE_ID };
    }
    const [slug] = remainder.split('/');
    return { slug };
  }

  if (host.endsWith('.hub')) {
    const workspace = host.slice(0, -4);
    return { slug: workspace, path: remainder };
  }

  if (!host.includes('.')) {
    return { slug: host };
  }

  return null;
}

function updateAddressBar(page) {
  const address = getElement('browserAddress') || {};
  const input = address.input;
  if (!input) return;
  const url = buildWorkspaceUrl(page);
  input.value = url;
}

function updateNavigationButtons() {
  const { backButton, forwardButton } = getNavigationRefs();
  if (backButton) {
    backButton.disabled = historyStack.length === 0;
  }
  if (forwardButton) {
    forwardButton.disabled = futureStack.length === 0;
  }
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

  const homepageContent = getElement('homepage')?.container || null;
  if (homepageContent) {
    homepageContent.hidden = !isHome;
    homepageContent.classList.toggle('is-active', isHome);
    if (isHome && focus) {
      homepageContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (workspaceHost) {
    workspaceHost.querySelectorAll('[data-browser-page]').forEach(section => {
      const active = section.dataset.browserPage === pageId;
      section.hidden = !active;
      section.classList.toggle('is-active', active);
      if (active && focus) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

function removeFromArray(array, value) {
  const index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function purgeFromHistory(stack, pageId) {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index] === pageId) {
      stack.splice(index, 1);
    }
  }
}

function recordTabActivation(pageId) {
  removeFromArray(activationHistory, pageId);
  activationHistory.push(pageId);
}

function ensureTab(pageId) {
  if (!pageId || openTabs.has(pageId)) {
    return false;
  }
  openTabs.add(pageId);
  tabOrder.push(pageId);
  return true;
}

function renderTabs() {
  const { list } = getTabRefs();
  if (!list) return;

  list.innerHTML = '';

  tabOrder.forEach(pageId => {
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
    tabButton.setAttribute('aria-controls', pageId === HOMEPAGE_ID ? 'browser-launch-stage' : `browser-page-${page.slug || page.id}`);
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

function getFallbackTab(closedId) {
  for (let index = activationHistory.length - 1; index >= 0; index -= 1) {
    const candidate = activationHistory[index];
    if (candidate && candidate !== closedId && openTabs.has(candidate)) {
      return candidate;
    }
  }
  return HOMEPAGE_ID;
}

function closeTab(pageId) {
  if (pageId === HOMEPAGE_ID || !openTabs.has(pageId)) {
    return;
  }

  openTabs.delete(pageId);
  removeFromArray(tabOrder, pageId);
  removeFromArray(activationHistory, pageId);
  purgeFromHistory(historyStack, pageId);
  purgeFromHistory(futureStack, pageId);

  const host = getWorkspaceHost();
  const section = host?.querySelector(`[data-browser-page="${pageId}"]`);
  if (section) {
    section.hidden = true;
    section.classList.remove('is-active');
  }

  const wasActive = activeTab === pageId;
  if (wasActive) {
    const fallback = getFallbackTab(pageId);
    renderTabs();
    setActivePage(fallback, { recordHistory: false, focus: true, ensureTab: false });
  } else {
    renderTabs();
  }
}

function handleTabBarClick(event) {
  const closeTarget = event.target.closest('[data-tab-close]');
  if (closeTarget) {
    event.preventDefault();
    closeTab(closeTarget.dataset.tabClose);
    return;
  }

  const tabTarget = event.target.closest('[data-tab-target]');
  if (tabTarget) {
    event.preventDefault();
    setActivePage(tabTarget.dataset.tabTarget, { recordHistory: false, focus: true });
  }
}

function openWorkspace(pageId, { focus = true, recordHistory = true } = {}) {
  if (!pageId) return;
  const resolved = findPageById(pageId) || findPageBySlug(pageId);
  if (!resolved) return;
  setActivePage(resolved.id, { recordHistory, focus, ensureTab: true });
}

function initTabs() {
  const { list } = getTabRefs();
  if (list) {
    list.addEventListener('click', handleTabBarClick);
  }
  renderTabs();
}

function setActivePage(targetId, { recordHistory = true, focus = false, ensureTab: shouldEnsureTab = true } = {}) {
  const resolved = findPageById(targetId) || findPageBySlug(targetId) || findPageById(HOMEPAGE_ID);
  const pageId = resolved?.id || HOMEPAGE_ID;
  if (recordHistory && currentPage !== pageId) {
    historyStack.push(currentPage);
    futureStack.length = 0;
  }

  let addedTab = false;
  if (shouldEnsureTab) {
    addedTab = ensureTab(pageId);
    if (addedTab) {
      renderTabs();
    }
  }
  if (!openTabs.has(pageId)) {
    return;
  }

  const element = getPageElement(pageId);
  if (!element) {
    if (addedTab) {
      openTabs.delete(pageId);
      removeFromArray(tabOrder, pageId);
      removeFromArray(activationHistory, pageId);
      renderTabs();
    }
    if (pageId !== HOMEPAGE_ID) {
      setActivePage(HOMEPAGE_ID, { recordHistory: false, focus: false, ensureTab: false });
    }
    return;
  }

  currentPage = pageId;
  activeTab = pageId;
  recordTabActivation(pageId);
  revealPage(pageId, { focus });
  markActiveSite(pageId);
  updateAddressBar(resolved);
  updateNavigationButtons();
  renderTabs();
}

function navigateBack() {
  if (!historyStack.length) return;
  const previous = historyStack.pop();
  futureStack.push(currentPage);
  setActivePage(previous, { recordHistory: false, focus: true });
}

function navigateForward() {
  if (!futureStack.length) return;
  const next = futureStack.pop();
  historyStack.push(currentPage);
  setActivePage(next, { recordHistory: false, focus: true });
}

function refreshActivePage() {
  const { refreshButton } = getNavigationRefs();
  const target = getPageElement(currentPage);
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
    setActivePage(HOMEPAGE_ID, { focus: true, recordHistory: true });
  } else {
    openWorkspace(target, { focus: true, recordHistory: true });
  }
}

function handleAddressSubmit(event) {
  event.preventDefault();
  const address = getElement('browserAddress') || {};
  const input = address.input;
  if (!input) return;
  const value = String(input.value || '').trim();
  const target = parseAddressValue(value);
  if (!target) {
    updateAddressBar(findPageById(currentPage));
    return;
  }

  if (target.pageId) {
    setActivePage(target.pageId);
    return;
  }

  const destination = target.slug ? findPageBySlug(target.slug) : null;
  if (destination) {
    setActivePage(destination.id);
    return;
  }

  updateAddressBar(findPageById(currentPage));
}

function initNavigation() {
  const { backButton, forwardButton, refreshButton } = getNavigationRefs();
  if (backButton) {
    backButton.addEventListener('click', navigateBack);
  }
  if (forwardButton) {
    forwardButton.addEventListener('click', navigateForward);
  }
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshActivePage);
  }

  const controls = getSessionControls();
  if (controls?.homeButton) {
    controls.homeButton.addEventListener('click', () => setActivePage(HOMEPAGE_ID, { focus: true, ensureTab: false }));
  }

  const address = getElement('browserAddress') || {};
  if (address.form) {
    address.form.addEventListener('submit', handleAddressSubmit);
  }

  const siteList = getElement('siteList');
  if (siteList) {
    siteList.addEventListener('click', handleSiteClick);
  }

  const homepage = getElement('homepage')?.container;
  if (homepage) {
    homepage.addEventListener('click', handleSiteClick);
  }

  setActivePage(currentPage, { recordHistory: false, ensureTab: false });
  updateNavigationButtons();
}

function initThemeControls() {
  const stored = loadThemePreference();
  const initial = stored || getShellElement()?.dataset.theme || 'day';
  applyTheme(initial);
  const toggle = getThemeToggle();
  if (!toggle) return;
  toggle.addEventListener('click', toggleTheme);
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

function applyAssetFilters(model = {}) {
  const hiddenSet = new Set(Array.isArray(model.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model.visibleIds) ? model.visibleIds : []);
  const instances = document.querySelectorAll('[data-role="browser-asset-list"] [data-asset], .browser-asset-list [data-asset]');
  instances.forEach(node => {
    const id = node.dataset.asset;
    if (!id) return;
    if (hiddenSet.has(id)) {
      node.hidden = true;
      return;
    }
    if (visibleSet.size && !visibleSet.has(id)) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
  });
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

function initControls() {
  initTabs();
  initNavigation();
  initThemeControls();
}

function applyFilters(model = {}) {
  if (!model) return;
  applyHustleFilters(model.hustles);
  applyAssetFilters(model.assets);
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

export { setWorkspacePath };
