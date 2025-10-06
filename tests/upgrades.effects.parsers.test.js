import assert from 'node:assert/strict';
import test from 'node:test';

import { initializeState } from '../src/core/state.js';
import { configureRegistry } from '../src/core/state/registry.js';
import { loadRegistry, resetRegistry } from '../src/game/registryService.js';
import { collectEffectSources } from '../src/game/upgrades/effects/index.js';
import { parseFilterExpression, parseModifierTarget } from '../src/game/upgrades/effects/parsers.js';

function makeUpgrade(definition) {
  return {
    type: 'upgrade',
    defaultState: { purchased: false },
    requirements: [],
    effects: {},
    affects: {},
    provides: {},
    consumes: {},
    exclusivityGroup: null,
    ...definition
  };
}

test('parseFilterExpression supports multiple clauses and delimiters', () => {
  const parsed = parseFilterExpression('ids=blog|site; tags=writing, category=content');
  assert.deepEqual(parsed, {
    ids: ['blog', 'site'],
    tags: ['writing'],
    families: [],
    categories: ['content']
  });
});

test('parseModifierTarget resolves subject type and filters', () => {
  const parsed = parseModifierTarget('assets[tags=writing].payout_mult');
  assert.deepEqual(parsed, {
    subjectType: 'asset',
    property: 'payout_mult',
    scope: {
      ids: [],
      tags: ['writing'],
      families: [],
      categories: []
    }
  });
});

test('collectEffectSources aggregates multipliers for matching upgrades', t => {
  resetRegistry();
  loadRegistry({
    upgrades: [
      makeUpgrade({
        id: 'promoPush',
        name: 'Promo Push',
        effects: { payout_mult: 1.5 },
        affects: { assets: { ids: ['blog'] } }
      })
    ],
    assets: [
      {
        id: 'blog',
        name: 'Blog',
        family: 'content',
        category: 'writing',
        tags: ['writing']
      }
    ],
    hustles: []
  });
  configureRegistry();
  t.after(() => {
    resetRegistry();
  });

  const state = initializeState();
  state.upgrades.promoPush = { purchased: true };

  const result = collectEffectSources({
    subjectType: 'asset',
    subject: 'blog',
    effect: 'payout_mult',
    actionType: null,
    state
  });

  assert.equal(result.multiplier, 1.5);
  assert.equal(result.sources.length, 1);
  assert.equal(result.modifiers.length, 1);
  assert.deepEqual(result.sources[0], {
    id: 'promoPush',
    label: 'Promo Push',
    multiplier: 1.5
  });
});
