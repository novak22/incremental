import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initElementRegistry } from '../../../../../src/ui/elements/registry.js';
import {
  initThemeControls,
  getCurrentTheme
} from '../../../../../src/ui/views/browser/layout/theme.js';

test('initThemeControls applies stored preference and toggles themes', async t => {
  const dom = new JSDOM(`
    <div class="browser-shell" data-theme="day">
      <button id="theme-toggle" type="button" data-mode="day" aria-pressed="false">
        <span class="browser-theme-toggle__icon"></span>
        <span class="browser-theme-toggle__label"></span>
      </button>
    </div>
  `, { url: 'https://hustle.city/' });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  dom.window.localStorage.setItem('browser-theme', 'night');

  initElementRegistry(dom.window.document, {
    themeToggle: root => root.getElementById('theme-toggle')
  });

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  initThemeControls();

  assert.equal(getCurrentTheme(), 'night', 'stored preference should be applied');
  assert.equal(
    dom.window.document.documentElement.getAttribute('data-browser-theme'),
    'night',
    'document theme attribute should match stored preference'
  );
  const shell = dom.window.document.querySelector('.browser-shell');
  assert.equal(shell.dataset.theme, 'night', 'shell element receives stored theme');

  const toggle = dom.window.document.getElementById('theme-toggle');
  toggle.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.equal(getCurrentTheme(), 'day', 'clicking the toggle flips the theme');
  assert.equal(
    dom.window.document.documentElement.getAttribute('data-browser-theme'),
    'day',
    'document theme updates after toggle'
  );
  assert.equal(dom.window.localStorage.getItem('browser-theme'), 'day');
});
