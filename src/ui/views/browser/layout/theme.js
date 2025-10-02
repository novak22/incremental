import { getElement } from '../../../elements/registry.js';

const THEME_STORAGE_KEY = 'browser-theme';
let themeToggleRef = null;
let currentTheme = 'day';

function getThemeToggle() {
  if (!themeToggleRef) {
    themeToggleRef = getElement('themeToggle');
  }
  return themeToggleRef;
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
    // ignore storage errors to keep the UI responsive
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

function initThemeControls() {
  const stored = loadThemePreference();
  const initial = stored || getShellElement()?.dataset.theme || 'day';
  applyTheme(initial);

  const toggle = getThemeToggle();
  if (!toggle) return;
  toggle.addEventListener('click', toggleTheme);
}

function getCurrentTheme() {
  return currentTheme;
}

const themeControls = {
  initThemeControls,
  applyTheme,
  getCurrentTheme
};

export { initThemeControls, applyTheme, getCurrentTheme };
export default themeControls;
