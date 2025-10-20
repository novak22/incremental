import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, assetStateModule, registryModule } = harness;
const { getState } = stateModule;
const { normalizeAssetState } = assetStateModule;
const { getAssetDefinition } = registryModule;

const nichesModule = await import('../src/game/assets/niches.js');
const {
  ensureNicheState,
  getNicheWatchlist,
  setNicheWatchlist,
  assignInstanceToNiche
} = nichesModule;

const { NICHE_ANALYTICS_HISTORY_LIMIT } = await import('../src/core/state/niches.js');
const { getNicheDefinitions } = await import('../src/game/assets/nicheData.js');
const { subscribeToInvalidation } = await import('../src/core/events/invalidationBus.js');

const resetState = () => harness.resetState();

const nicheDefinitions = getNicheDefinitions();

const [firstNiche, secondNiche] = nicheDefinitions;

const blogDefinition = getAssetDefinition('blog');

test.beforeEach(() => {
  resetState();
});

test('ensureNicheState sanitizes unknown entries and caps history', () => {
  const state = getState();
  const target = state.niches;
  target.popularity = {
    [firstNiche.id]: { score: 62, multiplier: 1.5, label: 'Trending' },
    mysteryZone: { score: 5 }
  };
  target.watchlist = [firstNiche.id, 'unknownNiche', 123, null];
  target.analyticsHistory = Array.from({ length: NICHE_ANALYTICS_HISTORY_LIMIT + 3 }, (_, index) => ({
    id: `history-${index}`,
    day: index + 1
  }));
  target.lastRollDay = 42;

  const ensured = ensureNicheState(state);

  assert.equal(ensured, target, 'ensureNicheState returns the niche slice');
  assert.deepEqual(ensured.watchlist, [firstNiche.id], 'watchlist keeps only known ids');
  assert.equal(
    ensured.analyticsHistory.length,
    NICHE_ANALYTICS_HISTORY_LIMIT,
    'history trimmed to the configured limit'
  );
  assert.equal(
    ensured.analyticsHistory[0].id,
    `history-${3}`,
    'keeps the most recent history snapshots'
  );
  assert.ok(!('mysteryZone' in ensured.popularity), 'unknown popularity entries removed');
  assert.equal(
    typeof ensured.popularity[firstNiche.id].score,
    'number',
    'known popularity entry sanitized'
  );
  assert.ok(
    ensured.popularity[secondNiche.id],
    'missing popularity entries initialized with defaults'
  );
  assert.ok(!('lastRollDay' in ensured), 'legacy fields removed from state');
});

test('niche watchlist helpers filter ids, toggle entries, and flag UI updates', () => {
  const state = getState();
  state.niches.watchlist = [firstNiche.id, 'badEntry', 99];

  const initialWatchlist = getNicheWatchlist(state);
  assert.ok(initialWatchlist instanceof Set, 'returns a Set instance');
  assert.equal(initialWatchlist.size, 1, 'filters to valid ids');
  assert.equal(initialWatchlist.has(firstNiche.id), true);

  const events = [];
  const unsubscribe = subscribeToInvalidation(payload => {
    events.push(payload);
  });

  try {
    const added = setNicheWatchlist(secondNiche.id, true);
    assert.equal(added, true, 'adding a new id reports a change');
    assert.equal(getNicheWatchlist().has(secondNiche.id), true, 'id added to watchlist');
    assert.deepEqual(
      events.at(-1),
      { cards: true, dashboard: true },
      'markDirty flagged dashboard and cards when toggled on'
    );

    const redundantAdd = setNicheWatchlist(secondNiche.id, true);
    assert.equal(redundantAdd, false, 're-adding same id has no effect');
    assert.equal(events.length, 1, 'no new invalidation when nothing changes');

    const removed = setNicheWatchlist(secondNiche.id, false);
    assert.equal(removed, true, 'removing an id reports a change');
    assert.equal(
      getNicheWatchlist().has(secondNiche.id),
      false,
      'id removed from watchlist'
    );
    assert.deepEqual(
      events.at(-1),
      { cards: true, dashboard: true },
      'markDirty flagged dashboard and cards when toggled off'
    );

    const ignored = setNicheWatchlist('totallyUnknown', true);
    assert.equal(ignored, false, 'invalid ids are ignored');
    assert.equal(events.length, 2, 'invalid ids do not trigger invalidation');
  } finally {
    unsubscribe();
  }
});

test('assignInstanceToNiche logs changes with consistent copy', () => {
  const state = getState();
  state.log = [];

  const assetState = normalizeAssetState(
    blogDefinition,
    {
      instances: [
        { id: 'blog-1', status: 'active', nicheId: firstNiche.id }
      ]
    },
    { state }
  );
  state.assets[blogDefinition.id] = assetState;

  const events = [];
  const unsubscribe = subscribeToInvalidation(payload => {
    events.push(payload);
  });

  try {
    const changed = assignInstanceToNiche(blogDefinition.id, 'blog-1', secondNiche.id);
    assert.equal(changed, true, 'niche reassignment reports a change');
    const instance = state.assets[blogDefinition.id].instances[0];
    assert.equal(instance.nicheId, secondNiche.id, 'instance now uses the requested niche');
    assert.deepEqual(
      events.at(-1),
      { cards: true, dashboard: true, player: true },
      'invalidation includes card, dashboard, and player sections'
    );

    const lastLog = state.log.at(-1);
    assert.ok(lastLog, 'reassignment writes a log entry');
    const expectedHypeLabel = state.niches.popularity[secondNiche.id]?.label;
    const expectedHype = expectedHypeLabel
      ? `${expectedHypeLabel.toLowerCase()} demand`
      : 'fresh buzz';
    assert.equal(
      lastLog.message,
      `Blog #1 pivoted into the ${secondNiche.name} niche to chase ${expectedHype}.`,
      'log message keeps the upbeat copy for new niche assignments'
    );
  } finally {
    unsubscribe();
  }

  const followUpEvents = [];
  const releaseUnsubscribe = subscribeToInvalidation(payload => {
    followUpEvents.push(payload);
  });

  try {
    const cleared = assignInstanceToNiche(blogDefinition.id, 'blog-1', null);
    assert.equal(cleared, true, 'clearing the niche reports a change');
    const instance = state.assets[blogDefinition.id].instances[0];
    assert.ok(instance.nicheId == null, 'niche id removed from the instance');
    assert.deepEqual(
      followUpEvents.at(-1),
      { cards: true, dashboard: true, player: true },
      'clearing a niche triggers the same invalidation sections'
    );
    const lastLog = state.log.at(-1);
    assert.equal(
      lastLog.message,
      'Blog #1 is taking a breather from niche targeting today.',
      'log message keeps the supportive copy when removing a niche'
    );
  } finally {
    releaseUnsubscribe();
  }
});
