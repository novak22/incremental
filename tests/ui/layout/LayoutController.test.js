import test from 'node:test';
import assert from 'node:assert/strict';
import { LayoutController } from '../../../src/ui/layout/LayoutController.js';
import {
  resetPreferenceAdapters,
  getPreferenceAdapters,
  ensureDefaultPreferenceAdapters
} from '../../../src/ui/layout/preferenceAdapters.js';

test('syncPreferencesFromDom delegates to registered adapters', () => {
  const updates = [];
  const elements = {
    alpha: { toggle: { checked: true } },
    beta: {}
  };

  const controller = new LayoutController({
    getElement: key => elements[key] || {},
    buildLayoutModel: () => ({}),
    getLayoutPreferences: () => ({}),
    updateLayoutPreferences: (section, patch) => {
      updates.push({ section, patch });
    },
    preferenceAdapters: [
      {
        section: 'alpha',
        elementKey: 'alpha',
        read(lookup) {
          if (!lookup.toggle) return null;
          return { enabled: Boolean(lookup.toggle.checked) };
        }
      },
      {
        section: 'beta',
        elementKey: 'beta',
        read() {
          return null;
        }
      }
    ],
    logger: { error: () => {} }
  });

  controller.syncPreferencesFromDom();

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    section: 'alpha',
    patch: { enabled: true }
  });
});

test('init ensures default preference adapters are registered', () => {
  resetPreferenceAdapters();

  const controller = new LayoutController({
    getElement: () => ({}),
    buildLayoutModel: () => ({}),
    getLayoutPreferences: () => ({}),
    updateLayoutPreferences: () => {},
    logger: { error: () => {} }
  });

  controller.init();

  const sections = getPreferenceAdapters().map(adapter => adapter.section);
  assert.ok(sections.includes('hustles'));
  assert.ok(sections.includes('assets'));
  assert.ok(sections.includes('upgrades'));
  assert.ok(sections.includes('study'));

  ensureDefaultPreferenceAdapters();
});
