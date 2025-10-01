import { getElement } from '../../elements/registry.js';
import { HOMEPAGE_ID, findPageById, findPageBySlug } from './config.js';

let currentPage = HOMEPAGE_ID;
const historyStack = [];
const futureStack = [];
let navigationRefs = null;
let sessionControls = null;
let themeToggle = null;
let currentTheme = 'day';

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
  return getElement('homepage')?.container || null;
}

function getPageElement(pageId) {
  if (pageId === HOMEPAGE_ID) {
    return getHomepageElement();
  }
  return document.querySelector(`[data-browser-page="${pageId}"]`);
}

function listPageSections() {
  return Array.from(document.querySelectorAll('[data-browser-page]'));
}

function markActiveSite(pageId) {
  const list = getElement('siteList');
  if (!list) return;
  list.querySelectorAll('button[data-site-target]').forEach(button => {
    const isActive = button.dataset.siteTarget === pageId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function updateAddressBar(page) {
  const address = getElement('browserAddress') || {};
  const input = address.input;
  if (!input) return;
  const slug = page?.slug || 'home';
  const url = `https://hustle.city/${slug === 'home' ? '' : slug}`;
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
  const homepage = getHomepageElement();
  if (homepage) {
    const isHome = pageId === HOMEPAGE_ID;
    homepage.hidden = !isHome;
    homepage.classList.toggle('is-active', isHome);
  }

  listPageSections().forEach(section => {
    const isActive = section.dataset.browserPage === pageId;
    section.hidden = !isActive;
    section.classList.toggle('is-active', isActive);
  });

  const target = getPageElement(pageId);
  if (target && focus) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setActivePage(targetId, { recordHistory = true, focus = false } = {}) {
  const resolved = findPageById(targetId) || findPageBySlug(targetId) || findPageById(HOMEPAGE_ID);
  const pageId = resolved?.id || HOMEPAGE_ID;
  const element = getPageElement(pageId);
  if (!element) return;

  if (recordHistory && currentPage !== pageId) {
    historyStack.push(currentPage);
    futureStack.length = 0;
  }

  currentPage = pageId;
  revealPage(pageId, { focus });
  markActiveSite(pageId);
  updateAddressBar(resolved);
  updateNavigationButtons();
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
  setActivePage(button.dataset.siteTarget || HOMEPAGE_ID);
}

function handleAddressSubmit(event) {
  event.preventDefault();
  const address = getElement('browserAddress') || {};
  const input = address.input;
  if (!input) return;
  const value = String(input.value || '').trim();
  const path = value.replace(/^https?:\/\/[^/]+\//iu, '').replace(/\s+/g, '').replace(/\/+$/, '');
  const destination = findPageBySlug(path);
  if (destination) {
    setActivePage(destination.id);
  } else {
    updateAddressBar(findPageById(currentPage));
  }
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
    controls.homeButton.addEventListener('click', () => setActivePage(HOMEPAGE_ID));
  }

  const address = getElement('browserAddress') || {};
  if (address.form) {
    address.form.addEventListener('submit', handleAddressSubmit);
  }

  const siteList = getElement('siteList');
  if (siteList) {
    siteList.addEventListener('click', handleSiteClick);
  }

  setActivePage(currentPage, { recordHistory: false });
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
