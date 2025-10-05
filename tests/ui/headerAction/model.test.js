import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeaderActionModel } from '../../../src/ui/headerAction/model.js';
import {
  registerActionProvider,
  clearActionProviders
} from '../../../src/ui/actions/providers.js';

function createNoop() {
  return () => {};
}

test('buildHeaderActionModel prefers the top upgrade recommendation from the registry', () => {
  const restore = clearActionProviders();
  try {
    registerActionProvider(() => ({
      id: 'asset-upgrades',
      focusCategory: 'upgrade',
      entries: [
        {
          id: 'asset-upgrade:ebook:ebook-1:writeChapter:pages',
          title: 'Episode 1 · Write Volume',
          buttonLabel: 'Write Volume',
          subtitle: 'Log a fresh chapter.',
          timeCost: 4,
          onClick: createNoop()
        },
        {
          id: 'asset-upgrade:ebook:ebook-1:batchEdit:shots',
          title: 'Episode 1 · Batch Edit',
          buttonLabel: 'Batch Edit',
          subtitle: 'Polish recent shoots.',
          timeCost: 2,
          onClick: createNoop()
        }
      ],
      metrics: {}
    }));

    registerActionProvider(() => ({
      id: 'quick-actions',
      focusCategory: 'hustle',
      entries: [
        {
          id: 'hustle:create-post',
          title: 'Create Post',
          primaryLabel: 'Queue',
          description: 'Draft a daily update.',
          timeCost: 1,
          onClick: createNoop()
        }
      ],
      metrics: {}
    }));

    const model = buildHeaderActionModel({ timeLeft: 6 });
    assert.equal(model.recommendation.mode, 'asset');
    assert.match(model.button.text, /Write Volume/);
  } finally {
    restore();
  }
});

test('buildHeaderActionModel falls back to quick actions when no upgrades exist', () => {
  const restore = clearActionProviders();
  try {
    registerActionProvider(() => ({
      id: 'asset-upgrades',
      focusCategory: 'upgrade',
      entries: [],
      metrics: {}
    }));

    registerActionProvider(() => ({
      id: 'quick-actions',
      focusCategory: 'hustle',
      entries: [
        {
          id: 'hustle:stream',
          title: 'Stream Session',
          primaryLabel: 'Queue',
          description: 'Go live for fans.',
          timeCost: 3,
          onClick: createNoop()
        },
        {
          id: 'hustle:post',
          title: 'Post Update',
          primaryLabel: 'Queue',
          description: 'Share a quick update.',
          timeCost: 1,
          onClick: createNoop()
        }
      ],
      metrics: {}
    }));

    const model = buildHeaderActionModel({ timeLeft: 4 });
    assert.equal(model.recommendation.mode, 'hustle');
    assert.match(model.button.text, /Stream Session/);
  } finally {
    restore();
  }
});
