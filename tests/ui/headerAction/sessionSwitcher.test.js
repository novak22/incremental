import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureTestDom } from '../../helpers/setupDom.js';
import { initElementRegistry } from '../../../src/ui/elements/registry.js';
import browserResolvers from '../../../src/ui/views/browser/resolvers.js';
import { initSessionSwitcher } from '../../../src/ui/headerAction/sessionSwitcher.js';

const dom = ensureTestDom();

function setupSessionSwitcher({
  listSessions,
  getActiveSession,
  onCreateSession,
  onActivateSession,
  onDeleteSession,
  onSaveSession,
  now
} = {}) {
  initElementRegistry(dom.window.document, browserResolvers);
  return initSessionSwitcher({
    storage: {
      listSessions,
      getActiveSession
    },
    document: dom.window.document,
    onCreateSession,
    onActivateSession,
    onDeleteSession,
    onSaveSession,
    now
  });
}

test('creating a session prompts for a name and closes the panel', { concurrency: false }, () => {
  const calls = [];
  const sessions = [
    { id: 'default', name: 'Main Hustle', lastSaved: 1, metadata: {} }
  ];
  const originalPrompt = dom.window.prompt;
  dom.window.prompt = () => '  Alt Run  ';

  try {
    setupSessionSwitcher({
      listSessions: () => sessions.map(session => ({ ...session })),
      getActiveSession: () => ({ ...sessions[0] }),
      onCreateSession: ({ name }) => {
        calls.push(['create', name]);
      },
      now: () => 2
    });

    const summary = dom.window.document.querySelector('[data-session-summary]');
    summary.click();
    const panel = dom.window.document.querySelector('[data-session-panel]');
    assert.equal(panel.hidden, false, 'panel should open after clicking the summary');

    const createButton = dom.window.document.querySelector('[data-session-create]');
    assert.ok(createButton, 'expected to find the create button');
    createButton.click();

    assert.deepEqual(calls, [['create', 'Alt Run']]);
    assert.equal(panel.hidden, true, 'panel should close after confirming creation');
    assert.equal(summary.getAttribute('aria-expanded'), 'false');
  } finally {
    dom.window.prompt = originalPrompt;
  }
});

test('switching sessions saves before activating the new slot', { concurrency: false }, () => {
  const calls = [];
  const sessions = [
    { id: 'alpha', name: 'Alpha Run', lastSaved: 5, metadata: {} },
    { id: 'beta', name: 'Beta Run', lastSaved: null, metadata: {} }
  ];

  setupSessionSwitcher({
    listSessions: () => sessions.map(session => ({ ...session })),
    getActiveSession: () => ({ ...sessions[0] }),
    onActivateSession: ({ id }) => {
      calls.push(`activate:${id}`);
    },
    onSaveSession: () => {
      calls.push('save');
    },
    now: () => 10
  });

  const summary = dom.window.document.querySelector('[data-session-summary]');
  summary.click();
  const activateButton = dom.window.document.querySelector(
    '[data-session-action="activate"][data-session-id="beta"]'
  );
  assert.ok(activateButton, 'expected activate control for the alternate session');
  activateButton.click();

  assert.deepEqual(calls, ['save', 'activate:beta']);
});

test('deleting a session confirms the action and closes the panel', { concurrency: false }, () => {
  const calls = [];
  const sessions = [
    { id: 'alpha', name: 'Alpha Run', lastSaved: 5, metadata: {} },
    { id: 'beta', name: 'Beta Run', lastSaved: 3, metadata: {} }
  ];

  const originalConfirm = dom.window.confirm;
  dom.window.confirm = () => true;

  try {
    setupSessionSwitcher({
      listSessions: () => sessions.map(session => ({ ...session })),
      getActiveSession: () => ({ ...sessions[0] }),
      onDeleteSession: ({ id }) => {
        calls.push(`delete:${id}`);
      },
      now: () => 12
    });

    const summary = dom.window.document.querySelector('[data-session-summary]');
    summary.click();
    const panel = dom.window.document.querySelector('[data-session-panel]');
    const deleteButton = dom.window.document.querySelector(
      '[data-session-action="delete"][data-session-id="beta"]'
    );
    assert.ok(deleteButton, 'expected delete control for non-active session');
    deleteButton.click();

    assert.deepEqual(calls, ['delete:beta']);
    assert.equal(panel.hidden, true, 'panel should close after deleting');
    assert.equal(summary.getAttribute('aria-expanded'), 'false');
  } finally {
    dom.window.confirm = originalConfirm;
  }
});
