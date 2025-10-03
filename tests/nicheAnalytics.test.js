import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule } = harness;
const { getState } = stateModule;
const analyticsModule = await import('../src/game/analytics/niches.js');
const { archiveNicheAnalytics, collectNicheAnalytics } = analyticsModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('archiveNicheAnalytics stores and trims history snapshots', () => {
  const state = getState();
  assert.equal(Array.isArray(state.niches.analyticsHistory), true, 'expected history array');

  for (let day = 1; day <= 9; day += 1) {
    state.day = day;
    archiveNicheAnalytics({ state, day, timestamp: day * 1000 });
  }

  const history = state.niches.analyticsHistory;
  assert.equal(history.length, 7, 'keeps only the most recent seven days');
  assert.equal(history[0].day, 3, 'drops earliest snapshots');
  const latest = history.at(-1);
  assert.equal(latest.day, 9);
  assert.ok(Array.isArray(latest.analytics), 'latest snapshot keeps analytics data');
  assert.ok(latest.highlights.hot || latest.highlights.swing || latest.highlights.risk, 'latest snapshot keeps highlight summary');
});

test('collectNicheAnalytics returns entries with sanitized numbers', () => {
  const state = getState();
  const analytics = collectNicheAnalytics(state);
  assert.ok(Array.isArray(analytics));
  const entry = analytics.find(item => item.id === 'techInnovators');
  assert.ok(entry, 'expected tech innovators entry');
  assert.equal(typeof entry.definition.name, 'string');
  assert.equal(typeof entry.trendImpact, 'number');
  assert.equal(typeof entry.netEarnings, 'number');
});
