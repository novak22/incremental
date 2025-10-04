import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

const dom = ensureTestDom();
const { document } = dom.window;

test('renderCards hydrates browser workspaces with default models', { concurrency: false }, async t => {
  ensureTestDom();
  const registryService = await import('../../src/game/registryService.js');
  const updateModule = await import('../../src/ui/update.js');
  const storageModule = await import('../../src/core/storage.js');

  registryService.resetRegistry();
  global.localStorage?.clear?.();
  storageModule.loadState();

  updateModule.renderCards();

  const hustleList = document.querySelector('[data-role="browser-hustle-list"]');
  assert.ok(hustleList, 'expected hustle workspace list to mount');
  const hustleCards = hustleList.querySelectorAll('[data-hustle]');
  assert.ok(hustleCards.length > 0, 'expected hustle cards to render in workspace');

  t.after(() => {
    registryService.resetRegistry();
  });
});

test('browser view update flow routes through cards presenter and updates summaries', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const advancedAsset = harness.assetsModule.ASSETS.find(asset => asset.tag?.type === 'advanced')
    || harness.assetsModule.ASSETS[0];
  const { createAssetInstance } = harness.assetStateModule;
  const { getAssetState } = harness.stateModule;
  const activeInstance = createAssetInstance(
    advancedAsset,
    {
      status: 'active',
      maintenanceFundedToday: false,
      lastIncome: 48,
      totalIncome: 96
    },
    { state }
  );
  const setupInstance = createAssetInstance(
    advancedAsset,
    { status: 'setup', daysRemaining: 2 },
    { state }
  );
  const assetState = getAssetState(advancedAsset.id, state);
  assetState.instances = [activeInstance, setupInstance];

  const updateModule = await import('../../src/ui/update.js');
  const cardsModule = await import('../../src/ui/views/browser/cardsPresenter.js');

  const presenter = cardsModule.default;
  const calls = [];
  const originalRenderAll = presenter.renderAll;
  const originalUpdate = presenter.update;

  presenter.renderAll = (payload, options) => {
    calls.push({ type: 'renderAll', payload, options });
    return originalRenderAll(payload, options);
  };
  presenter.update = (payload, options) => {
    calls.push({ type: 'update', payload, options });
    return originalUpdate(payload, options);
  };

  t.after(() => {
    presenter.renderAll = originalRenderAll;
    presenter.update = originalUpdate;
  });

  updateModule.renderCards();
  updateModule.updateUI();

  assert.ok(
    calls.some(call => call.type === 'renderAll'),
    'expected cards presenter to handle initial render'
  );
  const updateCall = calls.find(call => call.type === 'update');
  assert.ok(updateCall, 'expected cards presenter update to run');
  assert.ok(updateCall.payload?.models, 'expected update payload to include view models');

  const summaries = cardsModule.getLatestServiceSummaries();
  assert.ok(Array.isArray(summaries) && summaries.length > 0, 'expected service summaries after update');

  const todoList = document.getElementById('browser-widget-todo-list');
  assert.ok(todoList, 'expected todo widget to mount');
});

test('updateUI skips untouched presenters when sections are clean', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  harness.resetState();

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/ui/invalidation.js');

  const originalView = viewManager.getActiveView();
  const browserView = browserViewModule.default;

  const callCounts = {
    dashboard: 0,
    player: 0,
    skills: 0,
    header: 0,
    cards: 0
  };

  const stubView = {
    ...browserView,
    presenters: {
      ...browserView.presenters,
      player: {
        render: () => {
          callCounts.player += 1;
        }
      },
      skillsWidget: {
        render: () => {
          callCounts.skills += 1;
        }
      },
      headerAction: {
        ...browserView.presenters?.headerAction,
        renderAction: (...args) => {
          callCounts.header += 1;
          return browserView.presenters?.headerAction?.renderAction?.(...args);
        }
      },
      cards: {
        ...browserView.presenters?.cards,
        renderAll: (...args) => {
          browserView.presenters?.cards?.renderAll?.(...args);
          return undefined;
        },
        update: (...args) => {
          callCounts.cards += 1;
          return browserView.presenters?.cards?.update?.(...args);
        }
      }
    },
    renderDashboard: (...args) => {
      callCounts.dashboard += 1;
      return browserView.renderDashboard?.(...args);
    }
  };

  viewManager.setActiveView(stubView, document);

  t.after(() => {
    invalidation.consumeDirty();
    viewManager.setActiveView(originalView ?? browserView, document);
  });

  updateModule.updateUI();

  Object.keys(callCounts).forEach(key => {
    callCounts[key] = 0;
  });

  invalidation.markDirty('cards');
  const cardDirty = invalidation.consumeDirty();
  updateModule.updateUI(cardDirty);

  assert.strictEqual(callCounts.cards > 0, true, 'expected cards presenter to update when marked dirty');
  assert.strictEqual(callCounts.dashboard, 0, 'expected dashboard presenter to stay idle during card-only refresh');
  assert.strictEqual(callCounts.player, 0, 'expected player presenter to stay idle during card-only refresh');
  assert.strictEqual(callCounts.skills, 0, 'expected skills presenter to stay idle during card-only refresh');
  assert.strictEqual(callCounts.header, 0, 'expected header action presenter to stay idle during card-only refresh');

  const previousCardCalls = callCounts.cards;

  invalidation.markDirty(['dashboard', 'headerAction']);
  const dashboardDirty = invalidation.consumeDirty();
  updateModule.updateUI(dashboardDirty);

  assert.strictEqual(callCounts.dashboard, 1, 'expected dashboard to refresh when marked dirty');
  assert.strictEqual(callCounts.header, 1, 'expected header action to refresh when marked dirty');
  assert.strictEqual(callCounts.player, 0, 'expected player presenter to remain untouched when not flagged');
  assert.strictEqual(callCounts.skills, 0, 'expected skills presenter to remain untouched when not flagged');
  assert.strictEqual(callCounts.cards, previousCardCalls, 'expected cards presenter not to re-render without dirty flag');
});
