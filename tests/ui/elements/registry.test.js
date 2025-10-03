import test from 'node:test';
import assert from 'node:assert/strict';

import {
  elements,
  getElement,
  initElementRegistry
} from '../../../src/ui/elements/registry.js';
import { setActiveView } from '../../../src/ui/viewManager.js';
import browserView from '../../../src/ui/views/browser/index.js';

test('uses injected resolvers to look up DOM nodes', t => {
  const calls = [];
  const fakeRoot = {
    lookup(key) {
      calls.push(key);
      return `${key}-node`;
    }
  };

  const resolvers = {
    browserSessionControls: root => ({
      homeButton: root.lookup('homeButton'),
      endDayButton: root.lookup('endDayButton')
    }),
    browserNotifications: root => ({
      container: root.lookup('notifications'),
      button: root.lookup('notificationsButton'),
      list: root.lookup('notificationsList')
    })
  };

  initElementRegistry(fakeRoot, resolvers);

  t.after(() => {
    const root = typeof document !== 'undefined' ? document : null;
    setActiveView(browserView, root);
  });

  const sessionControls = getElement('browserSessionControls');
  assert.deepEqual(sessionControls, {
    homeButton: 'homeButton-node',
    endDayButton: 'endDayButton-node'
  });
  assert.deepEqual(calls, ['homeButton', 'endDayButton']);

  const notifications = getElement('browserNotifications');
  assert.deepEqual(notifications, {
    container: 'notifications-node',
    button: 'notificationsButton-node',
    list: 'notificationsList-node'
  });
  assert.deepEqual(calls, ['homeButton', 'endDayButton', 'notifications', 'notificationsButton', 'notificationsList']);

  assert.deepEqual(elements.browserSessionControls, sessionControls);
  assert.deepEqual(
    elements.browserNotifications,
    notifications,
    'proxy reuses cached notification lookup'
  );
  assert.deepEqual(
    calls,
    ['homeButton', 'endDayButton', 'notifications', 'notificationsButton', 'notificationsList']
  );
});

test('returns null when no resolver is provided', t => {
  const fakeRoot = {};
  initElementRegistry(fakeRoot, {});

  t.after(() => {
    const root = typeof document !== 'undefined' ? document : null;
    setActiveView(browserView, root);
  });

  assert.equal(getElement('browserNotifications'), null);
  assert.equal(elements.browserNotifications, null);
});
