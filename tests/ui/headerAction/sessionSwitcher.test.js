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
  onExportSession,
  onImportSession,
  now
} = {}) {
  initElementRegistry(dom.window.document, browserResolvers);
  const safeAlert =
    typeof dom.window.alert === 'function'
      ? (...args) => {
          try {
            return dom.window.alert(...args);
          } catch (error) {
            return undefined;
          }
        }
      : () => {};
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
    onExportSession,
    onImportSession,
    alert: safeAlert,
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

test('exporting the active session saves and triggers a download', { concurrency: false }, async () => {
  const calls = [];
  const sessions = [{ id: 'default', name: 'Main Hustle', lastSaved: 10, metadata: {} }];

  const appended = [];
  const originalAppend = dom.window.document.body.appendChild;
  dom.window.document.body.appendChild = function append(node) {
    appended.push(node);
    return originalAppend.call(this, node);
  };

  const createdUrls = [];
  const originalCreateObjectURL = dom.window.URL.createObjectURL;
  const originalRevokeObjectURL = dom.window.URL.revokeObjectURL;
  dom.window.URL.createObjectURL = blob => {
    assert.ok(blob, 'expected blob to be created for export');
    const url = `blob:${createdUrls.length}`;
    createdUrls.push(url);
    return url;
  };
  dom.window.URL.revokeObjectURL = href => {
    createdUrls.push(`revoked:${href}`);
  };

  try {
    setupSessionSwitcher({
      listSessions: () => sessions.map(session => ({ ...session })),
      getActiveSession: () => ({ ...sessions[0] }),
      onSaveSession: () => {
        calls.push('save');
      },
      onExportSession: ({ id }) => {
        calls.push(`export:${id}`);
        return { type: 'test', snapshot: { value: 1 } };
      },
      now: () => 42
    });

    const summary = dom.window.document.querySelector('[data-session-summary]');
    summary.click();
    const exportButton = dom.window.document.querySelector('[data-session-export]');
    assert.ok(exportButton, 'expected export button');
    exportButton.click();

    await new Promise(resolve => dom.window.setTimeout(resolve, 0));

    assert.deepEqual(calls, ['save', 'export:default']);
    assert.ok(createdUrls.some(url => url.startsWith('blob:')), 'expected blob URL to be created');
    assert.ok(
      appended.some(node => node.dataset?.sessionDownload === 'true' && node.tagName === 'A'),
      'expected anchor element appended for download'
    );
    assert.ok(
      createdUrls.includes(`revoked:${createdUrls[0]}`),
      'expected blob URL to be revoked after download'
    );
  } finally {
    dom.window.document.body.appendChild = originalAppend;
    dom.window.URL.createObjectURL = originalCreateObjectURL;
    dom.window.URL.revokeObjectURL = originalRevokeObjectURL;
  }
});

test('importing a session forwards parsed payload to the handler', { concurrency: false }, async () => {
  const sessions = [{ id: 'default', name: 'Main Hustle', lastSaved: 10, metadata: {} }];
  const calls = [];

  setupSessionSwitcher({
    listSessions: () => sessions.map(session => ({ ...session })),
    getActiveSession: () => ({ ...sessions[0] }),
    onImportSession: async ({ data }) => {
      calls.push(data.snapshot.money);
    }
  });

  const summary = dom.window.document.querySelector('[data-session-summary]');
  summary.click();
  const importInput = dom.window.document.querySelector('[data-session-import-input]');
  assert.ok(importInput, 'expected hidden import input');

  const payload = {
    type: 'online-hustle-sim/session',
    snapshot: { money: 999 }
  };
  const file = {
    text: () => Promise.resolve(JSON.stringify(payload))
  };
  Object.defineProperty(importInput, 'files', {
    configurable: true,
    value: [file]
  });

  importInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  await new Promise(resolve => dom.window.setTimeout(resolve, 0));

  assert.deepEqual(calls, [999]);
  assert.equal(importInput.value, '', 'import input should reset after processing');
});

test('importing invalid json shows a friendly alert', { concurrency: false }, async () => {
  const sessions = [{ id: 'default', name: 'Main Hustle', lastSaved: 10, metadata: {} }];
  const alerts = [];
  const originalAlert = dom.window.alert;
  dom.window.alert = message => {
    alerts.push(message);
  };

  try {
    setupSessionSwitcher({
      listSessions: () => sessions.map(session => ({ ...session })),
      getActiveSession: () => ({ ...sessions[0] })
    });

    const summary = dom.window.document.querySelector('[data-session-summary]');
    summary.click();
    const importInput = dom.window.document.querySelector('[data-session-import-input]');
    const badFile = { text: () => Promise.resolve('not-json') };
    Object.defineProperty(importInput, 'files', {
      configurable: true,
      value: [badFile]
    });

    importInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    await new Promise(resolve => dom.window.setTimeout(resolve, 0));

    assert.equal(alerts.length, 1, 'expected a friendly alert for invalid imports');
  } finally {
    dom.window.alert = originalAlert;
  }
});
