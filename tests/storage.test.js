import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  storageModule,
  logModule
} = harness;

const { getState, getAssetState, getUpgradeState } = stateModule;
const { loadState, saveState } = storageModule;
const { addLog } = logModule;
const { archiveNicheAnalytics } = await import('../src/game/analytics/niches.js');

const STORAGE_KEY = 'online-hustle-sim-v2';
const SESSION_INDEX_KEY = `${STORAGE_KEY}:sessions`;

function getActiveSessionDescriptor() {
  const rawIndex = localStorage.getItem(SESSION_INDEX_KEY);
  if (!rawIndex) {
    return null;
  }
  const index = JSON.parse(rawIndex);
  if (!index || typeof index !== 'object') {
    return null;
  }
  const sessions = index.sessions && typeof index.sessions === 'object' ? index.sessions : {};
  const activeId = index.activeSessionId;
  if (!activeId) {
    return null;
  }
  return sessions[activeId] ?? null;
}

const resetState = () => harness.resetState();

test.beforeEach(() => {
  localStorage.clear();
  resetState();
});

test('loadState initializes defaults and welcomes new players', () => {
  const result = loadState({
    onFirstLoad: () =>
      addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info')
  });
  assert.equal(result.returning, false);
  assert.ok(result.state);
  assert.match(getState().log.at(-1).message, /Welcome to Online Hustle Simulator/);
  assert.ok(Number.isInteger(getState().version));
});

test('saveState persists current progress and loadState restores it', () => {
  const state = getState();
  state.money = 321;
  const blogState = getAssetState('blog');
  blogState.instances.push({ status: 'active', daysRemaining: 0, daysCompleted: 1 });

  saveState();
  const activeSession = getActiveSessionDescriptor();
  assert.ok(activeSession?.storageKey, 'expected storage key for active session');
  const saved = JSON.parse(localStorage.getItem(activeSession.storageKey));
  assert.equal(saved.money, 321);
  assert.ok(saved.assets.blog.instances.length >= 1);
  assert.equal(saved.version, getState().version);

  const loaded = loadState();
  assert.equal(loaded.returning, true);
  assert.equal(getState().money, 321);
  assert.ok(getAssetState('blog').instances.length >= 1);
  assert.equal(getState().version, saved.version);
});

test('legacy saves migrate to new asset structure', () => {
  const legacy = {
    money: 500,
    timeLeft: 7,
    day: 12,
    lastSaved: 123456,
    blog: {
      active: true,
      buffer: 80,
      instances: [
        { active: true, totalIncome: 300 },
        { active: false }
      ]
    },
    assistantHired: true,
    coffeesToday: 2,
    log: [{ id: 'legacy', message: 'Legacy entry', timestamp: Date.now(), type: 'info' }]
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const result = loadState();
  const state = getState();
  assert.equal(result.returning, true);
  assert.equal(state.money, 500);
  assert.equal(getAssetState('blog').instances.length, 2);
  assert.equal(getUpgradeState('assistant').count, 1);
  assert.equal(getUpgradeState('coffee').usedToday, 2);
  assert.ok(state.log.some(entry => entry.message === 'Legacy entry'));
  assert.ok(Number.isInteger(state.version));

  const indexRaw = localStorage.getItem(SESSION_INDEX_KEY);
  assert.ok(indexRaw, 'session index is created');
  const index = JSON.parse(indexRaw);
  assert.ok(index.version >= 1, 'session index records migration version');

  const activeSession = getActiveSessionDescriptor();
  assert.equal(activeSession.id, 'default');
  assert.equal(activeSession.lastSaved, 123456);
  assert.ok(
    activeSession.storageKey.endsWith(':session:default'),
    `expected storage key to migrate to default session slot, got ${activeSession.storageKey}`
  );
  assert.equal(localStorage.getItem(STORAGE_KEY), null, 'legacy key removed after migration');
  const migratedSnapshot = JSON.parse(localStorage.getItem(activeSession.storageKey));
  assert.equal(migratedSnapshot.money, 500);
});

test('saveState persists a trimmed niche analytics history snapshot', () => {
  const state = getState();
  state.niches.analyticsHistory = [];

  for (let day = 1; day <= 9; day += 1) {
    state.day = day;
    archiveNicheAnalytics({ state, day, timestamp: day * 1000 });
  }

  saveState();
  const activeSession = getActiveSessionDescriptor();
  assert.ok(activeSession?.storageKey, 'expected storage key for active session');
  const saved = JSON.parse(localStorage.getItem(activeSession.storageKey));
  const history = saved?.niches?.analyticsHistory;

  assert.ok(Array.isArray(history), 'expected analytics history array in snapshot');
  assert.equal(history.length, 7, 'keeps only the newest seven entries');
  assert.equal(history[0].day, 3);
  assert.equal(history.at(-1).day, 9);
});

test('session repository APIs create, switch, and delete slots', () => {
  const primaryLoad = loadState();
  assert.equal(primaryLoad.returning, false);
  const primarySession = storageModule.getActiveSession();
  assert.ok(primarySession?.id, 'expected default session id');
  const defaultMoney = getState().money;

  const state = getState();
  state.money = 777;
  saveState();

  const { session: altSession, loadResult: altLoad } = storageModule.createSession({ name: 'Alt Slot' });
  assert.ok(altSession?.id, 'expected new session id');
  assert.notEqual(altSession.id, primarySession.id);
  assert.equal(altLoad.returning, false, 'new sessions should start from defaults');
  assert.equal(getState().money, defaultMoney, 'new session should load default money');

  const altState = getState();
  altState.money = 1234;
  saveState();

  const { loadResult: restored } = storageModule.setActiveSession(primarySession.id);
  assert.equal(restored.returning, true, 'existing session should load saved data');
  assert.equal(getState().money, 777, 'primary session restores saved money');

  const sessions = storageModule.listSessions();
  assert.equal(sessions.length, 2, 'expected two sessions tracked');

  const { removed, session: fallback } = storageModule.deleteSession(altSession.id);
  assert.equal(removed.id, altSession.id);
  assert.equal(fallback.id, primarySession.id, 'fallback to primary after deletion');
  assert.equal(storageModule.listSessions().length, 1, 'only primary session remains');
});

test('exportSession returns a serialized snapshot for the active slot', () => {
  const loadResult = loadState();
  assert.equal(loadResult.returning, false);
  const state = getState();
  state.money = 1337;
  saveState();

  const exported = storageModule.exportSession();
  assert.ok(exported, 'expected export payload');
  assert.equal(exported.type, 'online-hustle-sim/session');
  assert.equal(exported.session.id, storageModule.getActiveSession().id);
  assert.equal(exported.snapshot.money, 1337);
  assert.equal(exported.snapshot.lastSaved, exported.session.lastSaved);
});

test('importSession loads the provided snapshot into a new slot', () => {
  loadState();
  const baseSessions = storageModule.listSessions().length;

  const exported = storageModule.exportSession();
  exported.session.name = 'Imported Adventure';
  exported.snapshot.money = 4242;

  const result = storageModule.importSession(exported);
  assert.ok(result?.session, 'expected imported session metadata');
  assert.ok(result?.loadResult, 'expected a load result after import');
  assert.equal(storageModule.listSessions().length, baseSessions + 1, 'adds a new session slot');
  assert.equal(storageModule.getActiveSession().name, 'Imported Adventure');
  assert.equal(getState().money, 4242, 'imported snapshot should apply to active state');
});

test('importSession rejects invalid payloads', () => {
  loadState();
  const before = storageModule.listSessions().length;
  const result = storageModule.importSession({ bogus: true });
  assert.equal(result, null, 'invalid payload should not import');
  assert.equal(storageModule.listSessions().length, before, 'session roster remains unchanged');
});
