import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const constantsModule = await import('../src/core/constants.js');
const knowledgeTracksModule = await import('../src/game/requirements/knowledgeTracks.js');
const knowledgeTrackDataModule = await import('../src/game/requirements/data/knowledgeTracks.js');
const maintenanceModule = await import('../src/game/requirements/maintenanceReserve.js');
const descriptorsModule = await import('../src/game/requirements/descriptors.js');
const orchestratorModule = await import('../src/game/requirements/orchestrator.js');
const invalidationModule = await import('../src/core/events/invalidationBus.js');
const actionsRegistryModule = await import('../src/ui/actions/registry.js');
const todoWidgetModule = await import('../src/ui/views/browser/widgets/todoWidget.js');
const actionsSliceModule = await import('../src/core/state/slices/actions/index.js');
const actionInstancesModule = await import('../src/core/state/slices/actions/instances.js');

const { DEFAULT_DAY_HOURS } = constantsModule;
const { default: tracksDefaultExport, KNOWLEDGE_TRACKS: tracksCatalog, KNOWLEDGE_REWARDS: rewardCatalog } = knowledgeTracksModule;
const knowledgeTrackData = knowledgeTrackDataModule.default;
const { estimateManualMaintenanceReserve } = maintenanceModule;
const {
  buildAssetRequirementDescriptor,
  formatAssetRequirementLabel,
  renderAssetRequirementDetail,
  updateAssetCardLock
} = descriptorsModule;
const { createRequirementsOrchestrator, STUDY_DIRTY_SECTIONS } = orchestratorModule;
const { consumeDirty } = invalidationModule;
const { normalizeActionEntries } = actionsRegistryModule;
const { __testables: todoWidgetTestables } = todoWidgetModule;
const { ensureSlice: ensureActionSlice } = actionsSliceModule;
const { COMPLETED_RETENTION_DAYS } = actionInstancesModule;

const actionsProgressModule = await import('../src/game/actions/progress/instances.js');
const { advanceActionInstance } = actionsProgressModule;

const harness = await getGameTestHarness();
const {
  stateModule,
  requirementsModule,
  registryModule,
  hustlesModule
} = harness;

const {
  getState,
  getUpgradeState,
  getAssetState,
  getActionState,
  ensureStateShape
} = stateModule;

const {
  KNOWLEDGE_TRACKS,
  getKnowledgeProgress,
  advanceKnowledgeTracks,
  allocateDailyStudy,
  enrollInKnowledgeTrack,
  dropKnowledgeTrack
} = requirementsModule;

const { getClaimedOffers } = hustlesModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('knowledge track catalog exports remain consistent', () => {
  assert.equal(tracksDefaultExport, tracksCatalog);
  assert.ok(tracksCatalog.outlineMastery);
  assert.equal(rewardCatalog.outlineMastery.baseXp, 120);
  assert.equal(tracksCatalog, knowledgeTrackData);
  assert.equal(KNOWLEDGE_TRACKS, knowledgeTrackData);
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

test('study allocation warns when maintenance reserve consumes focus', () => {
  resetState();
  consumeDirty();

  const state = getState();
  state.assets.blog.instances = [{ status: 'active' }];

  const manualReserve = estimateManualMaintenanceReserve(state);
  const bufferHours = Math.max(2, Math.round(((state.baseTime || DEFAULT_DAY_HOURS)) * 0.25));
  const track = KNOWLEDGE_TRACKS.outlineMastery;

  state.money = (track.tuition || 0) + 100;
  state.timeLeft = manualReserve + bufferHours - 0.25;

  const enrollResult = enrollInKnowledgeTrack(track.id);
  assert.ok(enrollResult?.success, 'enrollment should succeed even with tight schedule');

  consumeDirty();
  allocateDailyStudy({ trackIds: [track.id] });

  const lastLog = state.log.at(-1);
  assert.ok(lastLog, 'expected a warning log to be generated');
  assert.match(lastLog.message, /No focus left/i);
  assert.match(lastLog.message, /upkeep/i);
  assert.match(lastLog.message, /buffer/i);
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

  const studyDefinition = registryModule.getActionDefinition('study-outlineMastery');
  let studyInstance = stateModule.getActionState('study-outlineMastery').instances.at(-1);

  for (let dayOffset = 0; dayOffset < trackDef.days; dayOffset += 1) {
    const actionDay = state.day + dayOffset;
    advanceActionInstance(studyDefinition, studyInstance, {
      state,
      day: actionDay,
      hours: trackDef.hoursPerDay
    });
    state.day = actionDay;
    allocateDailyStudy();
    advanceKnowledgeTracks();
    studyInstance = stateModule.getActionState('study-outlineMastery').instances.at(-1);
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

  const studyDefinition = registryModule.getActionDefinition('study-photoLibrary');
  let studyInstance = stateModule.getActionState('study-photoLibrary').instances.at(-1);

  consumeDirty();

  const firstDay = state.day;
  advanceActionInstance(studyDefinition, studyInstance, {
    state,
    day: firstDay,
    hours: trackDef.hoursPerDay
  });
  allocateDailyStudy();
  advanceKnowledgeTracks();
  assert.equal(progress.daysCompleted, 1);
  assert.equal(progress.studiedToday, false);

  for (let day = 1; day < trackDef.days; day += 1) {
    const actionDay = firstDay + day;
    advanceActionInstance(studyDefinition, studyInstance, {
      state,
      day: actionDay,
      hours: trackDef.hoursPerDay
    });
    state.day = actionDay;
    allocateDailyStudy();
    advanceKnowledgeTracks();
    studyInstance = stateModule.getActionState('study-photoLibrary').instances.at(-1);
  }

  state.day += 1;
  allocateDailyStudy();
  advanceKnowledgeTracks();

  assert.ok(progress.completed);
  assert.match(state.log.at(-1).message, /Finished .*Photo Catalog Curation/i);
  const dirty = consumeDirty();
  STUDY_DIRTY_SECTIONS.forEach(section => {
    assert.ok(dirty[section]);
  });
});

test('completed knowledge studies retire after the retention window', () => {
  const state = getState();
  ensureActionSlice(state);

  const trackId = 'outlineMastery';
  const definitionId = `study-${trackId}`;
  const entry = getActionState(definitionId);

  assert.ok(entry, 'expected the study action entry to exist');
  assert.equal(entry.instances.length, 0, 'expected no baseline instances');

  const completionDay = state.day;
  entry.instances.push({
    id: 'legacy-study',
    definitionId,
    accepted: true,
    status: 'completed',
    completed: true,
    completedOnDay: completionDay,
    progress: {
      completed: true,
      completedOnDay: completionDay
    }
  });

  const progress = getKnowledgeProgress(trackId);
  progress.enrolled = true;
  progress.completed = true;
  progress.completedOnDay = completionDay;

  assert.equal(entry.instances.length, 1, 'expected the legacy instance to be seeded');

  state.day = completionDay + COMPLETED_RETENTION_DAYS + 1;

  ensureActionSlice(state);

  const refreshedEntry = getActionState(definitionId);
  assert.equal(
    refreshedEntry.instances.length,
    0,
    'completed legacy instances outside the retention window should not return'
  );
});

test('logging study hours updates daily study flags immediately', () => {
  resetState();
  consumeDirty();

  const state = getState();
  const track = KNOWLEDGE_TRACKS.photoLibrary;
  state.money = track.tuition + 200;
  state.timeLeft = track.hoursPerDay + 6;

  enrollInKnowledgeTrack(track.id);
  consumeDirty();

  const progress = getKnowledgeProgress(track.id);
  assert.equal(progress.studiedToday, false);

  const actionDefinition = registryModule.getActionDefinition(`study-${track.id}`);
  const actionState = stateModule.getActionState(`study-${track.id}`);
  const instance = actionState.instances.at(-1);

  assert.ok(actionDefinition, 'study action definition should exist');
  assert.ok(instance, 'study action instance should be active');
  assert.ok(todoWidgetTestables?.createProgressHandler, 'todo widget test hook should exist');

  const [entry] = normalizeActionEntries({
    entries: [
      {
        id: 'test-study-entry',
        title: actionDefinition.name || 'Study Session',
        durationHours: track.hoursPerDay,
        progress: {
          type: 'study',
          definitionId: actionDefinition.id,
          instanceId: instance.id,
          hoursRemaining: track.hoursPerDay,
          stepHours: track.hoursPerDay,
          completion: 'manual',
          metadata: { day: state.day }
        }
      }
    ]
  });

  assert.ok(entry, 'normalized entry should be created');
  entry.progress.metadata = { day: state.day };

  const handler = todoWidgetTestables.createProgressHandler(entry);
  assert.equal(typeof handler, 'function', 'study entry should provide a progress handler');

  const baselineLogIndex = state.log.length;
  const outcome = handler();
  assert.ok(outcome?.success, 'handler should advance the study progress');

  const dirty = consumeDirty();

  assert.equal(progress.studiedToday, true, 'studiedToday should flip immediately after logging hours');
  assert.ok(dirty.dashboard, 'dashboard should be marked dirty');
  assert.ok(dirty.player, 'player panel should be marked dirty');

  const newLogs = state.log.slice(baselineLogIndex);
  assert.ok(
    newLogs.some(entryLog => /Study time logged/i.test(entryLog?.message || '')),
    'study allocation should celebrate logged hours right away'
  );
});

test('legacy study progress seeds action instances during state ensure', () => {
  const state = getState();
  state.day = 6;

  const trackId = 'outlineMastery';
  const actionId = `study-${trackId}`;
  const progress = getKnowledgeProgress(trackId);
  progress.enrolled = true;
  progress.enrolledOnDay = 4;
  progress.daysCompleted = 2;
  progress.studiedToday = true;
  progress.completed = false;

  delete state.actions[actionId];
  state.hustles = {};

  ensureStateShape(state);

  const seeded = getActionState(actionId);
  const activeInstance = seeded.instances.find(instance => instance.accepted && !instance.completed);
  assert.ok(activeInstance, 'legacy knowledge enrollment should create an active study instance');
  assert.equal(activeInstance.acceptedOnDay, 4, 'enrollment day should persist on the seeded instance');
  assert.ok(
    activeInstance.progress.daysCompleted >= 2,
    'seeded instance should include recorded study days in its completion count'
  );
  assert.equal(activeInstance.progress.completed, false, 'partially completed study should remain active');
  assert.equal(
    activeInstance.progress.lastWorkedDay,
    state.day,
    'studying today should set the last worked day to the current day'
  );
  assert.ok(
    activeInstance.progress.dailyLog[state.day],
    'current day study log should persist on the seeded instance'
  );
});

test('study enrollment hooks charge tuition and enrich accepted metadata', () => {
  consumeDirty();

  const track = KNOWLEDGE_TRACKS.outlineMastery;
  const state = getState();
  state.money = (track.tuition || 0) + 400;
  state.timeLeft = Math.max(state.timeLeft || 0, (track.hoursPerDay || 0) + 4);

  const startingMoney = state.money;
  const logBaseline = state.log.length;

  const result = enrollInKnowledgeTrack(track.id);
  assert.ok(result?.success, 'enrollment should succeed when seats are available');

  const accepted = result.offer;
  assert.ok(accepted, 'acceptance should return a claimed offer');
  assert.ok(accepted.metadata, 'accepted offer should include metadata populated by hooks');

  if ((track.tuition || 0) > 0) {
    assert.equal(state.money, startingMoney - track.tuition, 'tuition should be deducted immediately');
    assert.equal(accepted.metadata.tuitionPaid, track.tuition, 'tuition payment should be recorded');
    assert.equal(
      accepted.metadata.tuitionPaidOnDay,
      state.day,
      'tuition payment day should align with acceptance'
    );
  } else {
    assert.equal(state.money, startingMoney, 'free tracks should not deduct tuition');
  }

  const progress = getKnowledgeProgress(track.id);
  assert.equal(progress.enrolled, true, 'enrollment flag should flip on progress');
  assert.equal(progress.enrolledOnDay, state.day, 'enrollment day should reflect acceptance');
  assert.equal(progress.studiedToday, false, 'daily study flag should reset on enrollment');
  assert.equal(progress.tuitionCost, track.tuition, 'tuition cost should mirror track config');

  assert.equal(accepted.metadata.progress.studyTrackId, track.id, 'metadata should tag the study track');
  assert.equal(
    accepted.metadata.enrollment.seatPolicy,
    track.tuition > 0 ? 'limited' : 'always-on',
    'enrollment metadata should document seat policy'
  );

  const newLogs = state.log.slice(logBaseline);
  const celebratoryLogs = newLogs.filter(entry => /claimed a seat/i.test(entry?.message || ''));
  assert.equal(celebratoryLogs.length, 1, 'enrollment should log the celebratory message exactly once');

  const dirty = consumeDirty();
  STUDY_DIRTY_SECTIONS.forEach(section => {
    assert.ok(dirty[section], `enrollment should mark ${section} dirty`);
  });
});

test('manual study reminders and completions trigger logs and rewards', () => {
  resetState();
  const state = getState();
  const track = tracksCatalog.photoLibrary;
  const reward = rewardCatalog[track.id];

  const rewardSkillIds = Array.isArray(reward?.skills)
    ? reward.skills.map(entry => (typeof entry === 'string' ? entry : entry?.id)).filter(Boolean)
    : [];
  const xpBefore = rewardSkillIds.reduce((total, id) => {
    return total + (state.skills?.[id]?.xp || 0);
  }, 0);

  state.money = track.tuition + 200;
  enrollInKnowledgeTrack(track.id);

  consumeDirty();
  allocateDailyStudy({ trackIds: [track.id] });
  assert.match(state.log.at(-1).message, /need study hours logged today/i);

  const definition = registryModule.getActionDefinition(`study-${track.id}`);
  let instance = stateModule.getActionState(`study-${track.id}`).instances.at(-1);

  for (let dayOffset = 0; dayOffset < track.days; dayOffset += 1) {
    const actionDay = state.day + dayOffset;
    advanceActionInstance(definition, instance, {
      state,
      day: actionDay,
      hours: track.hoursPerDay
    });
    state.day = actionDay;
    allocateDailyStudy({ trackIds: [track.id] });
    advanceKnowledgeTracks();
    instance = stateModule.getActionState(`study-${track.id}`).instances.at(-1);
  }

  state.day += 1;
  allocateDailyStudy({ trackIds: [track.id] });
  advanceKnowledgeTracks();

  const progress = getKnowledgeProgress(track.id);
  assert.ok(progress.completed, 'progress should complete after required days');
  assert.ok(progress.skillRewarded, 'skill reward should trigger once');
  assert.match(state.log.at(-1).message, /Finished/);
  assert.equal(reward.baseXp > 0, true, 'reward metadata should exist');

  const xpAfter = rewardSkillIds.reduce((total, id) => {
    return total + (state.skills?.[id]?.xp || 0);
  }, 0);
  assert.ok(xpAfter > xpBefore, 'completion hook should award skill experience');
});

test('study enrollment updates player and dashboard sections alongside cards', () => {
  consumeDirty();
  const trackId = 'outlineMastery';
  const track = KNOWLEDGE_TRACKS[trackId];
  const state = getState();
  state.money = (track.tuition || 0) + 500;
  state.timeLeft = Math.max(state.timeLeft || 0, track.hoursPerDay + 6);

  const enrollResult = enrollInKnowledgeTrack(trackId);
  assert.ok(enrollResult?.success, 'enrollment should succeed');
  const dirtyAfterEnroll = consumeDirty();
  assert.ok(dirtyAfterEnroll.cards && dirtyAfterEnroll.dashboard && dirtyAfterEnroll.player,
    'enrollment should dirty core dashboards');

  const dropResult = dropKnowledgeTrack(trackId);
  assert.ok(dropResult?.success, 'dropping should succeed');
  const dirtyAfterDrop = consumeDirty();
  assert.ok(dirtyAfterDrop.cards && dirtyAfterDrop.dashboard && dirtyAfterDrop.player,
    'dropping should dirty core dashboards');
});

test('dropping a knowledge track releases the claimed hustle offer', () => {
  consumeDirty();
  const trackId = 'outlineMastery';
  const track = KNOWLEDGE_TRACKS[trackId];
  const state = getState();
  state.money = (track.tuition || 0) + 500;
  state.timeLeft = Math.max(state.timeLeft || 0, (track.hoursPerDay || 0) + 4);

  const enrollResult = enrollInKnowledgeTrack(trackId);
  assert.ok(enrollResult?.success, 'enrollment should succeed');

  const claimedBefore = getClaimedOffers(state, { includeExpired: true });
  assert.ok(claimedBefore.some(entry => entry?.metadata?.studyTrackId === trackId),
    'enrollment should claim a matching study offer');

  const dropResult = dropKnowledgeTrack(trackId);
  assert.ok(dropResult?.success, 'dropping should succeed');

  const claimedAfter = getClaimedOffers(state, { includeExpired: true });
  assert.equal(
    claimedAfter.some(entry => entry?.metadata?.studyTrackId === trackId),
    false,
    'dropping should release the study offer seat'
  );

  const progressAfterDrop = getKnowledgeProgress(trackId);
  assert.equal(progressAfterDrop.enrolled, false, 'drop should clear enrollment flag');
  assert.equal(progressAfterDrop.studiedToday, false, 'drop should clear daily study flag');
  assert.equal(progressAfterDrop.enrolledOnDay, null, 'drop should reset enrollment day');
  const releaseLog = state.log.find(entry => /Released 1 seat/i.test(entry?.message || ''));
  assert.ok(releaseLog, 'dropping should log the seat release via the market manager');
  assert.ok(releaseLog.message.includes(track.name), 'seat release log should reference the track name');
  assert.match(state.log.at(-1)?.message || '', /You dropped/, 'final log should confirm the drop');
});

test('tuition enrollment deducts money, records contributions, and logs success messaging', () => {
  resetState();
  const state = getState();
  const track = KNOWLEDGE_TRACKS.outlineMastery;
  const enrollmentDay = state.day;
  state.money = track.tuition + 500;
  state.timeLeft = Math.max(state.timeLeft || 0, (track.hoursPerDay || 0) + 4);

  const startingMoney = state.money;
  const enrollResult = enrollInKnowledgeTrack(track.id);
  assert.ok(enrollResult?.success, 'enrollment should succeed with sufficient tuition');

  const progress = getKnowledgeProgress(track.id);
  assert.equal(progress.tuitionPaid, track.tuition, 'tuition should be tracked on progress state');
  assert.equal(progress.tuitionPaidOnDay, enrollmentDay, 'tuition day should match enrollment day');
  assert.equal(state.money, startingMoney - track.tuition, 'tuition should deduct from money immediately');

  const costKey = `study:${track.id}:tuition`;
  const dailyMetrics = state.metrics?.daily?.costs || {};
  assert.ok(dailyMetrics[costKey], 'daily metrics should include the tuition cost contribution');
  assert.equal(dailyMetrics[costKey].amount, track.tuition, 'tuition contribution should match the paid amount');

  const reservationLog = state.log.find(entry => /Reserved a seat/i.test(entry?.message || ''));
  assert.ok(reservationLog, 'market seat manager should log the seat reservation and tuition payment');
  const successLog = state.log.find(entry => /You claimed a seat/i.test(entry?.message || ''));
  assert.ok(successLog, 'tuition logger should emit an enrollment success message');
});

test('knowledge track rollover invalidates study panels for completions and stalls', () => {
  consumeDirty();
  const logs = [];
  const state = {
    day: 9,
    money: 150,
    timeLeft: 5,
    progress: {
      knowledge: {
        paidTrack: {
          daysCompleted: 2,
          studiedToday: true,
          completed: false,
          enrolled: true,
          enrolledOnDay: 3,
          skillRewarded: false
        },
        freeTrack: {
          daysCompleted: 1,
          studiedToday: false,
          completed: false,
          enrolled: true,
          enrolledOnDay: 7,
          skillRewarded: false
        }
      }
    },
    log: logs
  };

  const tracks = {
    paidTrack: {
      id: 'paidTrack',
      name: 'Tuition Strategy Sprint',
      days: 3,
      hoursPerDay: 2,
      tuition: 120
    },
    freeTrack: {
      id: 'freeTrack',
      name: 'Community Study Circle',
      days: 4,
      hoursPerDay: 1,
      tuition: 0
    }
  };

  const actionStates = {
    paidTrack: {
      instances: [
        {
          id: 'paid-instance',
          accepted: true,
          completed: true,
          progress: {
            type: 'study',
            completion: 'manual',
            hoursPerDay: tracks.paidTrack.hoursPerDay,
            daysRequired: tracks.paidTrack.days,
            daysCompleted: tracks.paidTrack.days,
            dailyLog: { [state.day]: tracks.paidTrack.hoursPerDay },
            completed: true
          }
        }
      ]
    },
    freeTrack: {
      instances: [
        {
          id: 'free-instance',
          accepted: true,
          completed: false,
          progress: {
            type: 'study',
            completion: 'manual',
            hoursPerDay: tracks.freeTrack.hoursPerDay,
            daysRequired: tracks.freeTrack.days,
            daysCompleted: 1,
            dailyLog: {},
            completed: false
          }
        }
      ]
    }
  };

  const actionDefinitions = {
    [`study-${tracks.paidTrack.id}`]: {
      id: `study-${tracks.paidTrack.id}`,
      progress: {
        type: 'study',
        completion: 'manual',
        hoursPerDay: tracks.paidTrack.hoursPerDay,
        daysRequired: tracks.paidTrack.days
      }
    },
    [`study-${tracks.freeTrack.id}`]: {
      id: `study-${tracks.freeTrack.id}`,
      progress: {
        type: 'study',
        completion: 'manual',
        hoursPerDay: tracks.freeTrack.hoursPerDay,
        daysRequired: tracks.freeTrack.days
      }
    }
  };

  const orchestrator = createRequirementsOrchestrator({
    getState: () => state,
    getActionState: id => {
      const key = id.replace('study-', '');
      return actionStates[key] || { instances: [] };
    },
    getActionDefinition: id => actionDefinitions[id] || null,
    abandonActionInstance: () => true,
    getKnowledgeProgress: id => state.progress.knowledge[id],
    knowledgeTracks: tracks,
    addLog: (message, level) => logs.push({ message, level })
  });

  orchestrator.advanceKnowledgeTracks();

  const dirty = consumeDirty();
  STUDY_DIRTY_SECTIONS.forEach(section => {
    assert.ok(dirty[section]);
  });

  assert.equal(state.progress.knowledge.paidTrack.completed, true);
  assert.equal(state.progress.knowledge.paidTrack.enrolled, false);
  assert.equal(state.progress.knowledge.paidTrack.studiedToday, false);
  assert.equal(state.progress.knowledge.freeTrack.studiedToday, false);
  assert.ok(
    logs.some(log => log.level === 'warning' && /did not get study hours logged today/.test(log.message))
  );
  STUDY_DIRTY_SECTIONS.forEach(section => {
    assert.ok(dirty[section]);
  });
});
