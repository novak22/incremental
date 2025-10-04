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
  const invalidation = await import('../../src/core/events/invalidationBus.js');

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
  const invalidation = await import('../../src/core/events/invalidationBus.js');
  const assetsActionsModule = await import('../../src/game/assets/actions.js');
  const skillsModule = await import('../../src/game/skills/index.js');
  const nichesModule = await import('../../src/game/assets/niches.js');
  const summaryModule = await import('../../src/game/summary.js');
  const dashboardModelModule = await import('../../src/ui/dashboard/model.js');

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
  const launchable = harness.assetsModule.ASSETS.find(asset => {
    if (!Array.isArray(asset?.skills?.setup) || asset.skills.setup.length === 0) {
      return false;
    }
    const options = nichesModule.getAssignableNicheSummaries(asset, state);
    const uniqueIds = new Set(options.map(entry => entry?.definition?.id).filter(Boolean));
    return uniqueIds.size >= 2;
  }) || harness.assetsModule.ASSETS.find(asset => Array.isArray(asset?.skills?.setup) && asset.skills.setup.length)
    || harness.assetsModule.ASSETS[0];
  assert.ok(launchable, 'expected to find an asset with setup skills and multiple niche options for testing');
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
  firstInstance.lastIncome = 180;
  firstInstance.lastIncomeBreakdown = {
    total: 180,
    entries: [
      { type: 'niche', amount: 60, label: 'Trend boost' }
    ]
  };

  // Seed predictable niche analytics for the assignment flow.
  const assignableNiches = nichesModule.getAssignableNicheSummaries(launchable, state);
  const uniqueOptions = [];
  const seenNicheIds = new Set();
  assignableNiches.forEach(entry => {
    const id = entry?.definition?.id;
    if (!id || seenNicheIds.has(id)) return;
    seenNicheIds.add(id);
    uniqueOptions.push(entry);
  });
  assert.ok(uniqueOptions.length >= 2, 'expected at least two assignable niches for the asset');

  const initialNicheId = uniqueOptions[0].definition.id;
  const targetNicheId = uniqueOptions[1].definition.id;
  const initialNicheName = uniqueOptions[0].definition.name || initialNicheId;
  const targetNicheName = uniqueOptions[1].definition.name || targetNicheId;

  state.niches = {
    popularity: {
      [initialNicheId]: { score: 64, previousScore: 52 },
      [targetNicheId]: { score: 88, previousScore: 70 }
    },
    watchlist: [],
    lastRollDay: state.day || 1
  };

  resetCounts();
  invalidation.consumeDirty();
  const initialAssignment = nichesModule.assignInstanceToNiche(launchable.id, firstInstance.id, initialNicheId);
  assert.strictEqual(initialAssignment, true, 'expected initial niche assignment to succeed');
  const baselineSummary = summaryModule.computeDailySummary(state);
  const baselineViewModel = dashboardModelModule.buildDashboardViewModel(state, baselineSummary);
  const initialBoardEntry = baselineViewModel.niche.board.entries.find(entry => entry.id === initialNicheId);
  assert.ok(initialBoardEntry, 'expected board entry for initial niche after assignment');
  assert.strictEqual(initialBoardEntry.assetCount, 1, 'expected initial niche to count the assigned venture');
  const baselineHotTitle = baselineViewModel.niche.highlights.hot?.title || '';
  assert.ok(
    baselineHotTitle.includes(initialNicheName),
    'expected hot highlight to mention the initial niche'
  );
  invalidation.consumeDirty();

  // Reassigning the instance to a new niche should refresh cards and dashboard analytics.
  resetCounts();
  invalidation.consumeDirty();
  const reassigned = nichesModule.assignInstanceToNiche(launchable.id, firstInstance.id, targetNicheId);
  assert.strictEqual(reassigned, true, 'expected assignInstanceToNiche to succeed');
  const updatedAssetState = harness.stateModule.getAssetState(launchable.id, state);
  const updatedInstance = updatedAssetState.instances.find(entry => entry?.id === firstInstance.id);
  assert.strictEqual(updatedInstance?.nicheId, targetNicheId, 'expected instance to adopt the chosen niche');
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh when changing an asset niche');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to refresh when changing an asset niche');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh immediately for niche change');
  assert.strictEqual(callCounts.skills, 0, 'expected skills widget to remain untouched for niche change');
  assert.strictEqual(callCounts.header, 0, 'expected header action to remain untouched for niche change');
  const reassignedSummary = summaryModule.computeDailySummary(state);
  const reassignedViewModel = dashboardModelModule.buildDashboardViewModel(state, reassignedSummary);
  const nicheBoardEntries = reassignedViewModel.niche.board.entries;
  const reassignedTargetEntry = nicheBoardEntries.find(entry => entry.id === targetNicheId);
  assert.ok(reassignedTargetEntry, 'expected board entry for target niche after reassignment');
  assert.strictEqual(
    reassignedTargetEntry.assetCount,
    1,
    'expected target niche to show the reassigned venture immediately'
  );
  const vacatedEntry = nicheBoardEntries.find(entry => entry.id === initialNicheId);
  assert.ok(vacatedEntry, 'expected board entry for initial niche to persist after reassignment');
  assert.strictEqual(vacatedEntry.assetCount, 0, 'expected initial niche to drop to zero ventures after reassignment');
  const reassignedHotTitle = reassignedViewModel.niche.highlights.hot?.title || '';
  assert.ok(
    reassignedHotTitle.includes(targetNicheName),
    'expected hot highlight to follow the reassigned niche without extra actions'
  );
  assert.notStrictEqual(
    reassignedHotTitle,
    baselineHotTitle,
    'expected hot highlight to refresh with new niche details after reassignment'
  );
  const postNicheDirty = invalidation.consumeDirty();
  assert.deepStrictEqual(postNicheDirty, {}, 'expected executeAction to consume dirty sections after niche change');

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

  // Relaunch an instance that has not generated income yet and make sure the player panel updates when selling it.
  resetCounts();
  invalidation.consumeDirty();
  state.money = Math.max(state.money, 1000);
  state.timeLeft = 24;
  const relaunchAction = assetsActionsModule.buildAssetAction(launchable);
  relaunchAction.onClick();
  const relaunchState = harness.stateModule.getAssetState(launchable.id, state);
  const zeroInstance = relaunchState.instances.at(-1);
  assert.ok(zeroInstance, 'expected a relaunched asset instance for zero-income sale test');
  zeroInstance.lastIncome = 0;
  zeroInstance.lastIncomeBreakdown = { total: 0, entries: [] };

  resetCounts();
  invalidation.consumeDirty();
  const zeroSold = assetsActionsModule.sellAssetInstance(launchable, zeroInstance.id);
  assert.strictEqual(zeroSold, true, 'expected zero-income sale to succeed');
  assert.ok(callCounts.player > 0, 'expected player panel to refresh when selling a zero-income asset');
  assert.ok(callCounts.dashboard > 0, 'expected dashboard to refresh when selling a zero-income asset');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to refresh when selling a zero-income asset');
  const postZeroSaleDirty = invalidation.consumeDirty();
  assert.deepStrictEqual(postZeroSaleDirty, {}, 'expected executeAction to consume dirty sections after zero-income sale');
});

test('firing an assistant marks cards dirty and refreshes card presenters', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/core/events/invalidationBus.js');

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

test('game loop leaves view untouched until sections are marked dirty', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  harness.resetState();

  const loopModule = await import('../../src/game/loop.js');
  const hustlesModule = await import('../../src/game/hustles.js');
  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/core/events/invalidationBus.js');

  const browserView = browserViewModule.default;
  const originalView = viewManager.getActiveView();

  const callCounts = { dashboard: 0, cards: 0, player: 0, skills: 0 };

  const stubView = {
    ...browserView,
    renderDashboard: (...args) => {
      callCounts.dashboard += 1;
      return browserView.renderDashboard?.(...args);
    },
    presenters: {
      ...browserView.presenters,
      player: {
        ...browserView.presenters?.player,
        render: (...args) => {
          callCounts.player += 1;
          return browserView.presenters?.player?.render?.(...args);
        }
      },
      skillsWidget: {
        ...browserView.presenters?.skillsWidget,
        render: (...args) => {
          callCounts.skills += 1;
          return browserView.presenters?.skillsWidget?.render?.(...args);
        }
      },
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

  assert.strictEqual(callCounts.dashboard, 0, 'expected dashboard presenter to stay idle without dirty sections');
  assert.strictEqual(callCounts.cards, 0, 'expected cards presenter to stay idle without dirty sections');
  assert.strictEqual(callCounts.player, 0, 'expected player presenter to stay idle without dirty sections');
  assert.strictEqual(callCounts.skills, 0, 'expected skills presenter to stay idle without dirty sections');

  invalidation.markDirty(['dashboard', 'cards']);

  loopModule.runGameLoop();

  assert.ok(callCounts.dashboard > 0, 'expected dashboard to render after sections were marked dirty');
  assert.ok(callCounts.cards > 0, 'expected cards presenter to update after sections were marked dirty');
  assert.strictEqual(callCounts.player, 0, 'expected player presenter to stay idle when only dashboard and cards are dirty');
  assert.strictEqual(callCounts.skills, 0, 'expected skills presenter to stay idle when only dashboard and cards are dirty');

  const remainingDirty = invalidation.consumeDirty();
  assert.deepEqual(remainingDirty, {}, 'expected dirty registry to remain empty after targeted render');
});

test('renaming an asset refreshes dashboard quick actions and header suggestion immediately', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const { createAssetInstance } = harness.assetStateModule;
  const { getAssetState } = harness.stateModule;
  const { getAssetDefinition } = harness.registryModule;
  const definition = getAssetDefinition('vlog');
  const instance = createAssetInstance(definition, { status: 'active' }, { state });
  const assetState = getAssetState(definition.id, state);
  assetState.instances = [instance];
  state.money = 1000;
  state.timeLeft = 12;

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/core/events/invalidationBus.js');
  const todoStateModule = await import('../../src/ui/views/browser/widgets/todoState.js');
  const actionsModule = await import('../../src/game/assets/actions.js');

  const browserView = browserViewModule.default;
  const originalView = viewManager.getActiveView();
  viewManager.setActiveView(browserView, document);

  t.after(() => {
    invalidation.consumeDirty();
    viewManager.setActiveView(originalView ?? browserView, document);
  });

  invalidation.consumeDirty();
  updateModule.renderCards();
  updateModule.updateUI();

  const resolveLastModel = () => {
    if (typeof todoStateModule.getLastModel === 'function') {
      return todoStateModule.getLastModel();
    }
    if (todoStateModule.default && typeof todoStateModule.default.getLastModel === 'function') {
      return todoStateModule.default.getLastModel();
    }
    return null;
  };
  const getAssetTodoEntry = () => {
    const model = resolveLastModel();
    const entries = Array.isArray(model?.entries) ? model.entries : [];
    return entries.find(entry => typeof entry?.id === 'string' && entry.id.includes(instance.id));
  };

  const initialEntry = getAssetTodoEntry();
  assert.ok(initialEntry, 'expected quick action entry for the asset to appear in the to-do list');

  const headerButton = document.getElementById('browser-session-button');
  assert.ok(headerButton, 'expected to locate the header action button');

  const renameTo = 'Superstar Premiere';
  const renamed = actionsModule.setAssetInstanceName(definition.id, instance.id, renameTo);
  assert.strictEqual(renamed, true, 'expected asset rename to succeed');

  const refreshedEntry = getAssetTodoEntry();
  assert.ok(refreshedEntry, 'expected quick action entry to persist after rename');
  assert.ok(
    refreshedEntry.title.includes(renameTo),
    'expected dashboard quick action entry to reflect the new asset title'
  );

  const headerTitle = headerButton.title || '';
  assert.ok(headerTitle.includes(renameTo), 'expected header suggestion to reflect the renamed asset');
});

test('quality actions immediately refresh dashboard recommendations and header prompts', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const { createAssetInstance } = harness.assetStateModule;
  const { getAssetState } = harness.stateModule;
  const { getAssetDefinition } = harness.registryModule;
  const definition = getAssetDefinition('blog');
  const writePostAction = definition?.quality?.actions?.find(entry => entry.id === 'writePost');
  const originalDailyLimit = writePostAction?.dailyLimit;
  if (writePostAction) {
    writePostAction.dailyLimit = 3;
  }
  const instance = createAssetInstance(definition, { status: 'active' }, { state });
  instance.quality.progress.posts = 1;
  const assetState = getAssetState(definition.id, state);
  assetState.instances = [instance];
  state.money = 250;
  state.timeLeft = 12;

  const viewManager = await import('../../src/ui/viewManager.js');
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const updateModule = await import('../../src/ui/update.js');
  const invalidation = await import('../../src/core/events/invalidationBus.js');
  const todoStateModule = await import('../../src/ui/views/browser/widgets/todoState.js');
  const todoWidgetModule = await import('../../src/ui/views/browser/widgets/todoWidget.js');
  const qualityModule = await import('../../src/game/assets/quality.js');

  const browserView = browserViewModule.default;
  const originalView = viewManager.getActiveView();
  viewManager.setActiveView(browserView, document);

  t.after(() => {
    invalidation.consumeDirty();
    viewManager.setActiveView(originalView ?? browserView, document);
    if (writePostAction) {
      writePostAction.dailyLimit = originalDailyLimit;
    }
  });

  invalidation.consumeDirty();
  updateModule.renderCards();
  updateModule.updateUI();

  const resolveLastModel = () => {
    if (typeof todoStateModule.getLastModel === 'function') {
      return todoStateModule.getLastModel();
    }
    if (todoStateModule.default && typeof todoStateModule.default.getLastModel === 'function') {
      return todoStateModule.default.getLastModel();
    }
    return null;
  };

  const findQualityEntry = () => {
    const model = resolveLastModel();
    const entries = Array.isArray(model?.entries) ? model.entries : [];
    return entries.find(entry => typeof entry?.id === 'string' && entry.id.includes(instance.id));
  };

  const resolveNextTask = () => {
    if (typeof todoWidgetModule.peekNextTask === 'function') {
      return todoWidgetModule.peekNextTask();
    }
    if (todoWidgetModule.default && typeof todoWidgetModule.default.peekNextTask === 'function') {
      return todoWidgetModule.default.peekNextTask();
    }
    return null;
  };

  const initialEntry = findQualityEntry();
  assert.ok(initialEntry, 'expected quality recommendation to appear in quick actions');
  assert.match(initialEntry.meta || '', /2 posts to go/i, 'expected initial quick action meta to show remaining runs');
  assert.equal(initialEntry.remainingRuns, 2, 'expected quick action to report two runs remaining');

  const headerButton = document.getElementById('browser-session-button');
  assert.ok(headerButton, 'expected to locate the header action button');
  const initialTask = resolveNextTask();
  assert.ok(initialTask, 'expected header suggestion to identify the next quality task');
  assert.match(initialTask.meta || '', /2 posts to go/i, 'expected header to reflect initial quality progress');
  assert.equal(headerButton.dataset.actionId, initialTask.id, 'expected header button to point at the next quality task');

  qualityModule.performQualityAction(definition.id, instance.id, 'writePost');

  const refreshedEntry = findQualityEntry();
  assert.ok(refreshedEntry, 'expected quality recommendation to persist after running the action');
  assert.match(refreshedEntry.meta || '', /1 posts to go/i, 'expected quick action meta to update remaining runs immediately');
  assert.equal(refreshedEntry.remainingRuns, 1, 'expected quick action remaining runs to decrement immediately');

  const refreshedTask = resolveNextTask();
  assert.ok(refreshedTask, 'expected header suggestion to continue surfacing the quality task');
  assert.match(refreshedTask.meta || '', /1 posts to go/i, 'expected header to reflect the latest quality progress');
  assert.equal(
    headerButton.dataset.actionId,
    refreshedTask.id,
    'expected header button dataset to stay synced with updated task data'
  );
});
