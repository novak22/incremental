import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLogNodes,
  getMoneyNode,
  initElementRegistry
} from '../../../src/ui/elements/registry.js';
import { setActiveView } from '../../../src/ui/viewManager.js';
import classicView from '../../../src/ui/views/classic/index.js';

test('uses injected resolvers to look up DOM nodes', t => {
  const calls = [];
  const fakeRoot = {
    lookup(key) {
      calls.push(key);
      return `${key}-node`;
    }
  };

  const resolvers = {
    money: root => root.lookup('money'),
    logNodes: root => ({
      logFeed: root.lookup('log'),
      logTip: root.lookup('tip')
    })
  };

  initElementRegistry(fakeRoot, resolvers);

  t.after(() => {
    const root = typeof document !== 'undefined' ? document : null;
    setActiveView(classicView, root);
  });

  assert.equal(getMoneyNode(), 'money-node');
  assert.equal(getMoneyNode(), 'money-node', 'reuses cached value');
  assert.deepEqual(calls, ['money']);

  const logNodes = getLogNodes();
  assert.deepEqual(logNodes, { logFeed: 'log-node', logTip: 'tip-node' });
  assert.deepEqual(calls, ['money', 'log', 'tip']);
});

test('returns null when no resolver is provided', t => {
  const fakeRoot = {};
  initElementRegistry(fakeRoot, {});

  t.after(() => {
    const root = typeof document !== 'undefined' ? document : null;
    setActiveView(classicView, root);
  });

  assert.equal(getMoneyNode(), null);
});
