import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../../helpers/setupDom.js';
import { getGameTestHarness } from '../../helpers/gameTestHarness.js';

test('header action ends the day when the button mode is end even with a recommendation', async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();
  state.timeLeft = 8;
  const startingDay = state.day;

  const viewManager = await import('../../../src/ui/viewManager.js');
  const headerActionModule = await import('../../../src/ui/headerAction/index.js');

  const originalView = viewManager.getActiveView();
  const callbacks = {};
  const presenter = {
    init(args = {}) {
      callbacks.onPrimaryAction = args.onPrimaryAction;
      callbacks.onPrimaryModeChange = args.onPrimaryModeChange;
    },
    renderAction() {
      callbacks.onPrimaryModeChange?.('end');
    },
    renderAutoForward() {},
    isPrimaryEnabled() {
      return true;
    }
  };

  const testView = { id: 'test-header-end', presenters: { headerAction: presenter } };
  viewManager.setActiveView(testView);

  t.after(() => {
    if (originalView) {
      viewManager.setActiveView(originalView, originalView.root);
    }
  });

  headerActionModule.initHeaderActionControls();

  assert.equal(typeof callbacks.onPrimaryAction, 'function', 'expected the presenter to receive the action handler');

  let recommendationTriggered = 0;
  headerActionModule.renderHeaderAction({
    recommendation: {
      id: 'rec-end',
      mode: 'asset',
      buttonText: 'Upgrade asset',
      description: 'Test upgrade',
      onClick: () => {
        recommendationTriggered += 1;
      }
    },
    button: {
      text: 'End Day',
      mode: 'asset',
      actionId: 'rec-end',
      title: 'Test upgrade',
      isRecommendation: true
    }
  });

  callbacks.onPrimaryAction({ mode: 'end' });

  assert.equal(recommendationTriggered, 0, 'should not trigger the recommendation when ending the day');
  assert.equal(state.day, startingDay + 1, 'should advance the day');
});

test('header action triggers recommendation when mode is not end', async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();
  state.timeLeft = 8;
  const startingDay = state.day;

  const viewManager = await import('../../../src/ui/viewManager.js');
  const headerActionModule = await import('../../../src/ui/headerAction/index.js');

  const originalView = viewManager.getActiveView();
  const callbacks = {};
  const presenter = {
    init(args = {}) {
      callbacks.onPrimaryAction = args.onPrimaryAction;
      callbacks.onPrimaryModeChange = args.onPrimaryModeChange;
    },
    renderAction() {
      callbacks.onPrimaryModeChange?.('asset');
    },
    renderAutoForward() {},
    isPrimaryEnabled() {
      return true;
    }
  };

  const testView = { id: 'test-header-asset', presenters: { headerAction: presenter } };
  viewManager.setActiveView(testView);

  t.after(() => {
    if (originalView) {
      viewManager.setActiveView(originalView, originalView.root);
    }
  });

  headerActionModule.initHeaderActionControls();

  assert.equal(typeof callbacks.onPrimaryAction, 'function', 'expected the presenter to receive the action handler');

  let recommendationTriggered = 0;
  headerActionModule.renderHeaderAction({
    recommendation: {
      id: 'rec-asset',
      mode: 'asset',
      buttonText: 'Upgrade asset',
      description: 'Test upgrade',
      onClick: () => {
        recommendationTriggered += 1;
      }
    },
    button: {
      text: 'Upgrade asset',
      mode: 'asset',
      actionId: 'rec-asset',
      title: 'Test upgrade',
      isRecommendation: true
    }
  });

  callbacks.onPrimaryAction({ mode: 'asset' });

  assert.equal(recommendationTriggered, 1, 'should trigger the recommendation for non-end modes');
  assert.equal(state.day, startingDay, 'should not advance the day when running a recommendation');
});
