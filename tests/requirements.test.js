import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const knowledgeTracksModule = await import('../src/game/requirements/knowledgeTracks.js');
const maintenanceModule = await import('../src/game/requirements/maintenanceReserve.js');
const descriptorsModule = await import('../src/game/requirements/descriptors.js');
const orchestratorModule = await import('../src/game/requirements/orchestrator.js');
const invalidationModule = await import('../src/ui/invalidation.js');

const { default: tracksDefaultExport, KNOWLEDGE_TRACKS: tracksCatalog, KNOWLEDGE_REWARDS: rewardCatalog } = knowledgeTracksModule;
const { estimateManualMaintenanceReserve } = maintenanceModule;
const { buildAssetRequirementDescriptor } = descriptorsModule;
const { createRequirementsOrchestrator, MIN_MANUAL_BUFFER_HOURS } = orchestratorModule;
const { consumeDirty } = invalidationModule;

const harness = await getGameTestHarness();
const {
  stateModule,
  requirementsModule,
  registryModule
} = harness;

const {
  getState,
  getUpgradeState,
  getAssetState
} = stateModule;

const {
  KNOWLEDGE_TRACKS,
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock,
  getKnowledgeProgress,
  advanceKnowledgeTracks,
  allocateDailyStudy,
  enrollInKnowledgeTrack
} = requirementsModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('knowledge track catalog exports remain consistent', () => {
  assert.equal(tracksDefaultExport, tracksCatalog);
  assert.ok(tracksCatalog.outlineMastery);
  assert.equal(rewardCatalog.outlineMastery.baseXp, 120);
});

test('descriptor builder reports current asset progress', () => {
  const state = getState();
  const blogState = getAssetState('blog');
  blogState.instances = [{ status: 'active' }];

  const descriptor = buildAssetRequirementDescriptor(
    { type: 'experience', assetId: 'blog', count: 2 },
    state
  );

  assert.equal(descriptor.progress.have, 1);
  assert.equal(descriptor.progress.need, 2);
  assert.equal(descriptor.met, false);
});

test('manual maintenance reserve respects assistant support', () => {
  const state = getState();
  Object.values(state.assets || {}).forEach(assetState => {
    assetState.instances = [];
  });
  const assistantUpgrade = state.upgrades.assistant;
  assistantUpgrade.count = 0;
  state.assets.blog.instances = [{ status: 'active' }];
  state.assets.vlog.instances = [{ status: 'active' }];

  const baseline = estimateManualMaintenanceReserve(state);
  const expected =
    Number(registryModule.getAssetDefinition('blog').maintenance?.hours || 0) +
    Number(registryModule.getAssetDefinition('vlog').maintenance?.hours || 0);
  assert.equal(baseline.toFixed(2), expected.toFixed(2));

  assistantUpgrade.count = 1;

  const assisted = estimateManualMaintenanceReserve(state);
  assert.equal(assisted, 0);
});

test('requirement label reflects missing equipment and updates after unlock', () => {
  const labelBefore = formatAssetRequirementLabel('vlog');
  assert.match(labelBefore, /Requires/i);
  assert.ok(labelBefore.includes('Camera'));

  getUpgradeState('camera').purchased = true;
  const labelAfter = formatAssetRequirementLabel('vlog');
  assert.equal(labelAfter, 'Ready to Launch');
});

test('saas requirement includes server infrastructure gating', () => {
  const labelBefore = formatAssetRequirementLabel('saas');
  assert.match(labelBefore, /Cloud Cluster/);

  const automation = getKnowledgeProgress('automationCourse');
  automation.completed = true;
  getUpgradeState('serverRack').purchased = true;
  getUpgradeState('serverCluster').purchased = true;
  const dropshipping = getAssetState('dropshipping');
  dropshipping.instances = [{ status: 'active' }];
  const ebook = getAssetState('ebook');
  ebook.instances = [{ status: 'active' }];

  const labelAfter = formatAssetRequirementLabel('saas');
  assert.equal(labelAfter, 'Ready to Launch');
});

test('requirement detail renders dynamic knowledge progress', () => {
  const state = getState();
  const trackDef = KNOWLEDGE_TRACKS.outlineMastery;
  const detailBefore = renderAssetRequirementDetail('ebook');
  assert.ok(detailBefore.includes('Outline Mastery Workshop'));
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.completed, false);

  state.money = trackDef.tuition + 500;
  state.timeLeft = trackDef.hoursPerDay + 8;
  enrollInKnowledgeTrack('outlineMastery');

  for (let day = 0; day < trackDef.days; day += 1) {
    advanceKnowledgeTracks();
    state.timeLeft = trackDef.hoursPerDay + 6;
    allocateDailyStudy();
  }

  const detailAfter = renderAssetRequirementDetail('ebook');
  assert.ok(detailAfter.includes('✅'));
  assert.ok(getKnowledgeProgress('outlineMastery').completed);
});

test('updateAssetCardLock toggles class when requirements met', () => {
  const card = document.createElement('article');
  card.classList.add('card');

  updateAssetCardLock('dropshipping', card);
  assert.ok(card.classList.contains('locked'));

  getUpgradeState('camera').purchased = true;
  getUpgradeState('studio').purchased = true;
  const blogState = getAssetState('blog');
  blogState.instances = [{ status: 'active' }, { status: 'active' }];
  const knowledge = getKnowledgeProgress('ecomPlaybook');
  knowledge.completed = true;

  updateAssetCardLock('dropshipping', card);
  assert.ok(!card.classList.contains('locked'));
});

test('advancing knowledge logs completions and clears daily flags', () => {
  const state = getState();
  const trackDef = KNOWLEDGE_TRACKS.photoLibrary;
  const progress = getKnowledgeProgress('photoLibrary');

  state.money = trackDef.tuition + 200;
  state.timeLeft = trackDef.hoursPerDay + 6;
  enrollInKnowledgeTrack('photoLibrary');
  const logBaseline = state.log.length;

  advanceKnowledgeTracks();
  assert.equal(progress.daysCompleted, 1);
  assert.equal(progress.studiedToday, false);
  assert.equal(state.log.length, logBaseline, 'no completion yet');

  for (let day = 1; day < trackDef.days; day += 1) {
    state.timeLeft = trackDef.hoursPerDay + 6;
    allocateDailyStudy();
    advanceKnowledgeTracks();
  }

  assert.ok(progress.completed);
  assert.match(state.log.at(-1).message, /Finished .*Photo Catalog Curation/i);
});

test('requirements orchestrator honors reserves and rewards completions', () => {
  const track = tracksCatalog.outlineMastery;
  const logs = [];
  const contributions = [];
  let awardPayload = null;

  const state = {
    day: 1,
    money: 1000,
    timeLeft: 0,
    progress: { knowledge: {} },
    log: []
  };

  const ensureProgress = id => {
    if (!state.progress.knowledge[id]) {
      state.progress.knowledge[id] = {
        daysCompleted: 0,
        studiedToday: false,
        completed: false,
        enrolled: true,
        totalDays: track.days,
        hoursPerDay: track.hoursPerDay,
        tuitionCost: track.tuition,
        enrolledOnDay: state.day,
        skillRewarded: false
      };
    }
    return state.progress.knowledge[id];
  };

  const reserveHours = 3;
  const orchestrator = createRequirementsOrchestrator({
    getState: () => state,
    getKnowledgeProgress: ensureProgress,
    knowledgeTracks: { [track.id]: track },
    knowledgeRewards: { [track.id]: rewardCatalog[track.id] },
    estimateMaintenanceReserve: () => reserveHours,
    spendMoney: () => {},
    spendTime: hours => { state.timeLeft -= hours; },
    recordCostContribution: () => {},
    recordTimeContribution: entry => contributions.push(entry),
    awardSkillProgress: payload => { awardPayload = payload; },
    addLog: (message, level) => logs.push({ message, level })
  });

  const progress = ensureProgress(track.id);
  progress.daysCompleted = track.days - 1;

  state.timeLeft = reserveHours + MIN_MANUAL_BUFFER_HOURS + track.hoursPerDay - 0.1;
  orchestrator.allocateDailyStudy();
  assert.equal(contributions.length, 0);
  assert.ok(logs.some(log => log.level === 'warning' && log.message.includes('deferred')));
  assert.equal(progress.studiedToday, false);
  logs.length = 0;

  state.timeLeft = reserveHours + MIN_MANUAL_BUFFER_HOURS + track.hoursPerDay + 1;
  orchestrator.allocateDailyStudy();
  assert.equal(contributions.length, 1);
  assert.ok(progress.studiedToday);

  orchestrator.advanceKnowledgeTracks();
  assert.ok(progress.completed);
  assert.equal(progress.studiedToday, false);
  assert.ok(awardPayload);
  assert.equal(awardPayload.label, track.name);
  assert.ok(logs.some(log => log.message.includes('Finished')));
});

test('study enrollment updates player and dashboard sections alongside cards', () => {
  consumeDirty();
  const state = {
    day: 1,
    money: 500,
    timeLeft: 12,
    progress: { knowledge: {} },
    log: []
  };

  const track = {
    id: 'paidTrack',
    name: 'Tuition Strategy Sprint',
    days: 2,
    hoursPerDay: 3,
    tuition: 150
  };

  const ensureProgress = id => {
    if (!state.progress.knowledge[id]) {
      state.progress.knowledge[id] = {
        daysCompleted: 0,
        studiedToday: false,
        completed: false,
        enrolled: false,
        enrolledOnDay: null
      };
    }
    return state.progress.knowledge[id];
  };

  const orchestrator = createRequirementsOrchestrator({
    getState: () => state,
    getKnowledgeProgress: ensureProgress,
    knowledgeTracks: { [track.id]: track },
    knowledgeRewards: {},
    estimateMaintenanceReserve: () => 0,
    spendMoney: amount => {
      state.money -= amount;
    },
    spendTime: hours => {
      state.timeLeft -= hours;
    },
    recordCostContribution: () => {},
    recordTimeContribution: () => {},
    awardSkillProgress: () => {},
    addLog: () => {}
  });

  const enrollResult = orchestrator.enrollInKnowledgeTrack(track.id);
  assert.ok(enrollResult.success);
  assert.deepEqual(consumeDirty(), { cards: true, dashboard: true, player: true });

  const dropResult = orchestrator.dropKnowledgeTrack(track.id);
  assert.ok(dropResult.success);
  assert.deepEqual(consumeDirty(), { cards: true, dashboard: true, player: true });
});

test('zero-hour study allocations still refresh dashboard and player views', () => {
  consumeDirty();
  const state = {
    day: 4,
    money: 200,
    timeLeft: 6,
    progress: { knowledge: {} },
    log: []
  };

  const track = {
    id: 'freeTrack',
    name: 'Flash Study Jam',
    days: 1,
    hoursPerDay: 0,
    tuition: 0
  };

  const ensureProgress = id => {
    if (!state.progress.knowledge[id]) {
      state.progress.knowledge[id] = {
        daysCompleted: 0,
        studiedToday: false,
        completed: false,
        enrolled: false,
        enrolledOnDay: null
      };
    }
    return state.progress.knowledge[id];
  };

  const orchestrator = createRequirementsOrchestrator({
    getState: () => state,
    getKnowledgeProgress: ensureProgress,
    knowledgeTracks: { [track.id]: track },
    knowledgeRewards: {},
    estimateMaintenanceReserve: () => 0,
    spendMoney: () => {},
    spendTime: () => {},
    recordCostContribution: () => {},
    recordTimeContribution: () => {},
    awardSkillProgress: () => {},
    addLog: () => {}
  });

  orchestrator.enrollInKnowledgeTrack(track.id);
  consumeDirty();
  const progress = ensureProgress(track.id);
  progress.studiedToday = false;

  orchestrator.allocateDailyStudy({ trackIds: [track.id] });
  assert.equal(progress.studiedToday, true);
  assert.deepEqual(consumeDirty(), { cards: true, dashboard: true, player: true });
});
