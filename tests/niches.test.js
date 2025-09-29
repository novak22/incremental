import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, assetsModule, nichesModule, nicheAssignmentsModule } = harness;

const {
  getState,
  getAssetState,
  getAssetDefinition,
  createAssetInstance
} = stateModule;

const { closeOutDay } = assetsModule;

const { assignAssetNiche } = nicheAssignmentsModule;
const {
  getInstanceNiche,
  getNicheOptions,
  randomizeNichePopularity,
  summarizeNicheTrends
} = nichesModule;

test.beforeEach(() => {
  harness.resetState();
});

test('assigning a niche locks in and boosts payouts with popularity', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const state = getState();
    const blogDefinition = getAssetDefinition('blog');
    const blogState = getAssetState('blog');
    const instance = createAssetInstance(blogDefinition, { status: 'active' });
    blogState.instances = [instance];

    const [firstOption, secondOption] = getNicheOptions();
    const assigned = assignAssetNiche(blogDefinition, instance.id, firstOption.id);
    assert.equal(assigned, true, 'niche should assign the first time');
    assert.equal(getAssetState('blog').instances[0].niche, firstOption.id);

    const secondAttempt = assignAssetNiche(blogDefinition, instance.id, secondOption.id);
    assert.equal(secondAttempt, false, 'niche should not be replaceable once set');

    state.niches[firstOption.id].popularity = 1.2;

    const activeInstance = getAssetState('blog').instances[0];
    activeInstance.maintenanceFundedToday = true;

    closeOutDay();

    const resolved = getAssetState('blog').instances[0];
    assert.equal(resolved.lastIncome, 4, 'popularity should lift payouts before rounding');
    const nicheBreakdown = resolved.lastIncomeBreakdown.entries.find(entry => entry.type === 'niche');
    assert.ok(nicheBreakdown, 'niche bonus should appear in income breakdown');
    assert.ok(
      nicheBreakdown.label.includes(firstOption.name),
      'niche breakdown should reference the chosen niche name'
    );
    assert.equal(getInstanceNiche(resolved).id, firstOption.id);
  } finally {
    Math.random = originalRandom;
  }
});

test('niche popularity drifts within the ±15% window each day', () => {
  const state = getState();
  const [firstOption] = getNicheOptions();
  state.niches[firstOption.id].popularity = 1;

  const originalRandom = Math.random;

  try {
    Math.random = () => 1;
    const increase = randomizeNichePopularity(state);
    const increased = state.niches[firstOption.id].popularity;
    assert.equal(Number(increased.toFixed(2)), 1.15);
    const increaseRecord = increase.find(change => change.id === firstOption.id);
    assert.ok(increaseRecord);
    assert.equal(Number(increaseRecord.next.toFixed(2)), 1.15);

    Math.random = () => 0;
    const decrease = randomizeNichePopularity(state);
    const decreased = state.niches[firstOption.id].popularity;
    const ratio = decreased / increased;
    assert.equal(Number(ratio.toFixed(2)), 0.85, 'popularity should only fall by 15% of its current value');
    const summary = summarizeNicheTrends(decrease);
    assert.ok(summary.includes(firstOption.name));
  } finally {
    Math.random = originalRandom;
  }
});
