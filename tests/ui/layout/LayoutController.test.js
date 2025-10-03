import test from 'node:test';
import assert from 'node:assert/strict';
import { LayoutController } from '../../../src/ui/layout/LayoutController.js';

test('applyFilters uses the active view presenter when available', () => {
  const applyCalls = [];
  const presenter = {
    initControls: () => {},
    applyFilters: model => applyCalls.push(model)
  };

  const controller = new LayoutController({
    buildLayoutModel: models => ({ processed: models }),
    getLayoutPreferences: () => ({}),
    updateLayoutPreferences: () => {},
    getActiveView: () => ({
      id: 'browser',
      presenters: { layout: presenter }
    })
  });

  controller.applyFilters({ foo: 'bar' });

  assert.equal(applyCalls.length, 1);
  assert.deepEqual(applyCalls[0], { processed: { foo: 'bar' } });
});

test('handlePreferenceChange updates preferences and reapplies filters', () => {
  const updates = [];
  const applyCalls = [];
  let onChangeHandler = null;

  const presenter = {
    initControls: options => {
      onChangeHandler = options.onChange;
    },
    applyFilters: model => applyCalls.push(model)
  };

  const controller = new LayoutController({
    buildLayoutModel: models => ({ filtered: models }),
    getLayoutPreferences: () => ({}),
    updateLayoutPreferences: (section, patch) => {
      updates.push({ section, patch });
    },
    getActiveView: () => ({
      id: 'browser',
      presenters: { layout: presenter }
    })
  });

  controller.applyFilters({ alpha: true });
  assert.ok(onChangeHandler, 'initControls should provide an onChange handler');
  assert.equal(applyCalls.length, 1);

  onChangeHandler('layout', { condensed: true });

  assert.deepEqual(updates, [{ section: 'layout', patch: { condensed: true } }]);
  assert.equal(applyCalls.length, 2);
  assert.deepEqual(applyCalls[1], { filtered: { alpha: true } });
});
