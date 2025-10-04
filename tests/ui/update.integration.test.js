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

test('state mutators mark dirty sections and drive partial UI refreshes', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/ui/invalidation.js');
  const assetsActionsModule = await import('../../src/game/assets/actions.js');
  const skillsModule = await import('../../src/game/skills/index.js');

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
        render: (...args) => {
          callCounts.player += 1;
          return browserView.presenters?.player?.render?.(...args);
        }
      },
      skillsWidget: {
        render: (...args) => {
          callCounts.skills += 1;
          return browserView.presenters?.skillsWidget?.render?.(...args);
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

  const resetCounts = () => {
    Object.keys(callCounts).forEach(key => {
      callCounts[key] = 0;
    });
  };

  const expectCoreDirty = dirtyMap => {
    const keys = Object.keys(dirtyMap).sort();
    const expected = ['dashboard', 'headerAction', 'player', 'skillsWidget'].sort();
    assert.deepStrictEqual(keys, expected, 'expected money/time updates to flag core UI presenters');
    expected.forEach(section => {
      assert.strictEqual(dirtyMap[section], true, `expected ${section} to be marked dirty`);
    });
  };

  // Money changes flag dashboard/player/skills/header presenters.
  resetCounts();
  invalidation.consumeDirty();
  harness.currencyModule.addMoney(25, null);
  const moneyDirty = invalidation.consumeDirty();
  expectCoreDirty(moneyDirty);
  updateModule.updateUI(moneyDirty);
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh for money change');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh for money change');
  assert.ok(callCounts.skills > 0, 'expected skills widget to refresh for money change');
  assert.ok(callCounts.header > 0, 'expected header action to refresh for money change');
  assert.strictEqual(callCounts.cards, 0, 'expected cards presenter to stay idle during money update');

  // Time changes mark the same presenters.
  resetCounts();
  invalidation.consumeDirty();
  harness.timeModule.spendTime(1);
  const timeDirty = invalidation.consumeDirty();
  expectCoreDirty(timeDirty);
  updateModule.updateUI(timeDirty);
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh for time change');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh for time change');
  assert.ok(callCounts.skills > 0, 'expected skills widget to refresh for time change');
  assert.ok(callCounts.header > 0, 'expected header action to refresh for time change');
  assert.strictEqual(callCounts.cards, 0, 'expected cards presenter to stay idle during time update');

  // Skill progress touches the same core presenters.
  resetCounts();
  invalidation.consumeDirty();
  const xpAwarded = skillsModule.awardSkillProgress({
    skills: ['writing'],
    baseXp: 4,
    state
  });
  assert.ok(xpAwarded > 0, 'expected awardSkillProgress to grant experience');
  const skillDirty = invalidation.consumeDirty();
  expectCoreDirty(skillDirty);
  updateModule.updateUI(skillDirty);
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh for skill progress');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh for skill progress');
  assert.ok(callCounts.skills > 0, 'expected skills widget to refresh for skill progress');
  assert.ok(callCounts.header > 0, 'expected header action to refresh for skill progress');
  assert.strictEqual(callCounts.cards, 0, 'expected cards presenter to stay idle when only skills update');

  // Launching an asset via executeAction should refresh all five presenters.
  resetCounts();
  invalidation.consumeDirty();
  state.money = 1000;
  state.timeLeft = 24;
  const launchable = harness.assetsModule.ASSETS.find(asset => Array.isArray(asset?.skills?.setup) && asset.skills.setup.length);
  assert.ok(launchable, 'expected to find an asset with setup skills for testing');
  const launchAction = assetsActionsModule.buildAssetAction(launchable);
  launchAction.onClick();
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh when launching asset');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh when launching asset');
  assert.ok(callCounts.skills > 0, 'expected skills widget to refresh when launching asset');
  assert.ok(callCounts.header > 0, 'expected header action to refresh when launching asset');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to update when launching asset');
  const postLaunchDirty = invalidation.consumeDirty();
  assert.deepStrictEqual(postLaunchDirty, {}, 'expected executeAction to consume dirty sections after launch');

  // Selling the newly created instance should also refresh all presenters.
  const assetState = harness.stateModule.getAssetState(launchable.id, state);
  const [firstInstance] = assetState.instances;
  assert.ok(firstInstance, 'expected a launched asset instance for sale test');
  firstInstance.lastIncome = 48;

  resetCounts();
  invalidation.consumeDirty();
  const sold = assetsActionsModule.sellAssetInstance(launchable, firstInstance.id);
  assert.strictEqual(sold, true, 'expected sellAssetInstance to succeed');
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh when selling asset');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh when selling asset');
  assert.ok(callCounts.skills > 0, 'expected skills widget to refresh when selling asset');
  assert.ok(callCounts.header > 0, 'expected header action to refresh when selling asset');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to refresh when selling asset');
  const postSaleDirty = invalidation.consumeDirty();
  assert.deepStrictEqual(postSaleDirty, {}, 'expected executeAction to consume dirty sections after sale');
});

test('firing an assistant marks cards dirty and refreshes card presenters', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/ui/invalidation.js');

  const { hireAssistant, fireAssistant } = harness.assistantModule;

  const browserView = browserViewModule.default;
  const originalView = viewManager.getActiveView();
  const originalConsumeDirty = invalidation.consumeDirty;

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
        render: (...args) => {
          callCounts.player += 1;
          return browserView.presenters?.player?.render?.(...args);
        }
      },
      skillsWidget: {
        render: (...args) => {
          callCounts.skills += 1;
          return browserView.presenters?.skillsWidget?.render?.(...args);
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
    originalConsumeDirty();
    viewManager.setActiveView(originalView ?? browserView, document);
  });

  const resetCounts = () => {
    Object.keys(callCounts).forEach(key => {
      callCounts[key] = 0;
    });
  };

  updateModule.renderCards();
  updateModule.updateUI();

  state.money = 1000;
  state.timeLeft = 24;

  const hired = hireAssistant();
  assert.strictEqual(hired, true, 'expected to hire an assistant for the setup step');
  const hireDirty = originalConsumeDirty();
  updateModule.updateUI(hireDirty);
  resetCounts();

  const fired = fireAssistant();
  assert.strictEqual(fired, true, 'expected to fire the assistant during the test');
  const dirtySections = originalConsumeDirty();

  const expectedSections = ['cards', 'dashboard', 'headerAction', 'player', 'skillsWidget'];
  assert.deepStrictEqual(
    Object.keys(dirtySections).sort(),
    expectedSections.sort(),
    'expected firing assistant to flag cards along with core presenters'
  );
  expectedSections.forEach(section => {
    assert.strictEqual(dirtySections[section], true, `expected ${section} to be marked dirty when firing assistant`);
  });

  updateModule.updateUI(dirtySections);

  assert.ok(callCounts.cards > 0, 'expected cards presenter to refresh after firing assistant');
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh after firing assistant');
  assert.ok(callCounts.player > 0, 'expected player presenter to refresh after firing assistant');
  assert.ok(callCounts.skills > 0, 'expected skills presenter to refresh after firing assistant');
  assert.ok(callCounts.header > 0, 'expected header action presenter to refresh after firing assistant');
});

test('game loop fallback renders dashboard and cards when no sections are dirty', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  harness.resetState();

  const loopModule = await import('../../src/game/loop.js');
  const hustlesModule = await import('../../src/game/hustles.js');
  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/ui/invalidation.js');

  const browserView = browserViewModule.default;
  const originalView = viewManager.getActiveView();

  const callCounts = { dashboard: 0, cards: 0 };

  const stubView = {
    ...browserView,
    renderDashboard: (...args) => {
      callCounts.dashboard += 1;
      return browserView.renderDashboard?.(...args);
    },
    presenters: {
      ...browserView.presenters,
      cards: {
        ...browserView.presenters?.cards,
        renderAll: (...args) => {
          return browserView.presenters?.cards?.renderAll?.(...args);
        },
        update: (...args) => {
          callCounts.cards += 1;
          return browserView.presenters?.cards?.update?.(...args);
        }
      }
    }
  };

  viewManager.setActiveView(stubView, document);

  const originalHustles = [...hustlesModule.HUSTLES];
  hustlesModule.HUSTLES.splice(0, hustlesModule.HUSTLES.length);

  t.after(() => {
    hustlesModule.HUSTLES.splice(0, hustlesModule.HUSTLES.length, ...originalHustles);
    invalidation.consumeDirty();
    viewManager.setActiveView(originalView ?? browserView, document);
  });

  invalidation.consumeDirty();
  updateModule.renderCards();

  loopModule.runGameLoop();

  assert.ok(callCounts.dashboard > 0, 'expected dashboard fallback render when no dirty sections were marked');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to update during fallback render');

  const remainingDirty = invalidation.consumeDirty();
  assert.deepEqual(remainingDirty, {}, 'expected dirty registry to remain empty after fallback render');
});
