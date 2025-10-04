import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  WORKSPACE_LOCK_THEMES,
  getWorkspaceLockTheme
} from '../src/ui/views/browser/components/common/workspaceLockThemes.js';
import { createWorkspaceLockRenderer } from '../src/ui/views/browser/components/common/renderWorkspaceLock.js';

const WORKSPACE_IDS = ['blogpress', 'digishelf', 'shopily', 'serverhub', 'videotube'];

function assertString(value, message) {
  assert.equal(typeof value, 'string', message);
  assert.ok(value.length > 0, message);
}

test('workspace lock themes expose consistent structure', () => {
  for (const id of WORKSPACE_IDS) {
    const config = WORKSPACE_LOCK_THEMES.get(id);
    assert.ok(config, `expected lock config for ${id}`);

    const { theme, fallbackMessage } = config;
    assert.ok(theme && typeof theme === 'object', `theme should be an object for ${id}`);
    assertString(fallbackMessage, `fallback message missing for ${id}`);

    for (const key of ['container', 'locked', 'message', 'label']) {
      assertString(theme[key], `theme.${key} missing for ${id}`);
    }
  }
});

test('workspace lock renderer uses shared fallback copy', t => {
  const dom = new JSDOM('<div id="mount"></div>');
  const { document } = dom.window;
  const mount = document.getElementById('mount');

  globalThis.window = dom.window;
  globalThis.document = document;
  globalThis.HTMLElement = dom.window.HTMLElement;

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.HTMLElement;
  });

  for (const id of WORKSPACE_IDS) {
    const { theme, fallbackMessage } = getWorkspaceLockTheme(id);
    const renderLocked = createWorkspaceLockRenderer({ theme, fallbackMessage });
    renderLocked({}, mount);

    const messageSelector = theme.message ? `.${theme.message}` : theme.messageTag || 'p';
    const messageElement = mount.querySelector(messageSelector);
    assert.ok(messageElement, `rendered message element for ${id}`);
    assert.equal(
      messageElement.textContent,
      fallbackMessage,
      `fallback copy should render for ${id}`
    );
  }
});
