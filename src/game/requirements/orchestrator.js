import { formatHours, formatList } from '../../core/helpers.js';
import { markDirty } from '../../core/events/invalidationBus.js';
import { createStudyEnrollment } from './orchestrator/studyEnrollment.js';
import { createMarketSeatManager } from './orchestrator/marketSeats.js';
import { createTuitionLogging } from './orchestrator/tuitionLogging.js';
export const STUDY_DIRTY_SECTIONS = Object.freeze(['cards', 'dashboard', 'player']);

export function createRequirementsOrchestrator({
  getState,
  getActionState,
  getActionDefinition,
  abandonActionInstance,
  getKnowledgeProgress,
  knowledgeTracks,
  knowledgeRewards,
  spendMoney,
  recordCostContribution,
  awardSkillProgress,
  addLog
}) {
  function getStudyActionId(trackId) {
    return `study-${trackId}`;
  }

  function getStudyActionSnapshot(trackId, state = getState()) {
    if (!state) {
      return { entry: null, instances: [], active: null, completed: null };
    }

    const entry = getActionState(getStudyActionId(trackId), state);
    const instances = Array.isArray(entry?.instances) ? entry.instances : [];
    const active = instances.find(instance => instance?.accepted && !instance?.completed) || null;
    const completed = instances.find(instance => instance?.completed) || null;

    return { entry, instances, active, completed };
  }

  function removeActiveStudyInstance(trackId, state = getState()) {
    const workingState = state || getState();
    if (!workingState) return false;
    const definition = getActionDefinition(getStudyActionId(trackId));
    if (!definition) return false;

    const { active } = getStudyActionSnapshot(trackId, workingState);
    if (!active) return false;

    return abandonActionInstance(definition, active.id, { state: workingState });
  }

  function evaluateStudyProgress(track, state = getState()) {
    const progress = getKnowledgeProgress(track.id, state);
    const { active, completed } = getStudyActionSnapshot(track.id, state);
    const source = active?.progress || completed?.progress || null;
    const existingProgress = progress || {};
    const hoursPerDay = Number(track.hoursPerDay) || Number(source?.hoursPerDay) || 0;
    const daysRequired = Number(track.days) || Number(source?.daysRequired) || 0;
    const dayKey = Number(state?.day);

    let studiedToday = Boolean(existingProgress.studiedToday);
    if (Number.isFinite(dayKey)) {
      const logSource = source?.dailyLog || existingProgress.dailyLog || {};
      const logged = Number(logSource[dayKey]) || 0;
      const threshold = hoursPerDay > 0 ? hoursPerDay - 0.0001 : 0.1;
      studiedToday = logged >= threshold;
    }

    const resolvedDaysCompleted = source?.daysCompleted ?? existingProgress.daysCompleted;
    const daysCompleted = Math.min(daysRequired || Infinity, Number(resolvedDaysCompleted) || 0);
    const completedFlag = Boolean(completed?.completed || source?.completed || existingProgress.completed);

    return {
      progress,
      studiedToday,
      daysCompleted,
      completedFlag,
      activeInstance: active,
      completedInstance: completed
    };
  }

  const seatManager = createMarketSeatManager({ getState, addLog });
  const tuitionLogging = createTuitionLogging({ spendMoney, recordCostContribution, addLog });
  const { enrollInKnowledgeTrack, dropKnowledgeTrack } = createStudyEnrollment({
    getState,
    getKnowledgeProgress,
    knowledgeTracks,
    addLog,
    markDirty,
    seatManager,
    tuitionLogging,
    getStudyActionId,
    removeActiveStudyInstance,
    STUDY_DIRTY_SECTIONS
  });

  function allocateDailyStudy({ trackIds, triggeredByEnrollment = false } = {}) {
    const state = getState();
    if (!state) return;

    const tracks = trackIds
      ? trackIds.map(id => knowledgeTracks[id]).filter(Boolean)
      : Object.values(knowledgeTracks);

    if (!tracks.length) return;

    const celebrated = [];
    const awaiting = [];
    let dirty = false;

    for (const track of tracks) {
      const { progress, studiedToday } = evaluateStudyProgress(track, state);
      if (!progress) continue;

      const isActive = Boolean(progress.enrolled && !progress.completed);
      const nextStudied = Boolean(studiedToday && isActive);

      if (progress.studiedToday !== nextStudied) {
        progress.studiedToday = nextStudied;
        dirty = true;
      }

      if (!isActive) continue;

      if (nextStudied) {
        celebrated.push(track.name);
      } else if (!triggeredByEnrollment) {
        awaiting.push(track.name);
      }
    }

    if (!triggeredByEnrollment && celebrated.length) {
      addLog(`Study time logged for ${formatList(celebrated)}. Keep that momentum going!`, 'info');
    }

    if (!triggeredByEnrollment && awaiting.length) {
      addLog(`${formatList(awaiting)} still need study hours logged today.`, 'warning');
    }

    if (dirty) {
      markDirty(STUDY_DIRTY_SECTIONS);
    }
  }

  function advanceKnowledgeTracks() {
    const state = getState();
    if (!state) return;

    const completedToday = [];
    const awaiting = [];
    let dirty = false;

    Object.entries(state.progress.knowledge || {}).forEach(([id, progress]) => {
      const track = knowledgeTracks[id];
      if (!track) {
        if (progress) {
          progress.studiedToday = false;
        }
        return;
      }

      const { studiedToday, daysCompleted, completedFlag } = evaluateStudyProgress(track, state);
      const isActive = Boolean(progress.enrolled && !progress.completed);

      const previousDaysCompleted = Number(progress.daysCompleted) || 0;
      const nextDaysCompleted = Math.min(track.days, daysCompleted);

      if (progress.daysCompleted !== nextDaysCompleted) {
        progress.daysCompleted = nextDaysCompleted;
        dirty = true;
      }

      if (progress.totalDays !== track.days) {
        progress.totalDays = track.days;
        dirty = true;
      }

      if (progress.hoursPerDay !== track.hoursPerDay) {
        progress.hoursPerDay = track.hoursPerDay;
        dirty = true;
      }

      const participated = Boolean(studiedToday && isActive);
      const advancedToday = nextDaysCompleted > previousDaysCompleted;
      const nextStudiedToday = advancedToday ? false : participated;

      if (progress.studiedToday !== nextStudiedToday) {
        progress.studiedToday = nextStudiedToday;
        dirty = true;
      }

      if (completedFlag) {
        if (!progress.completed) {
          progress.completed = true;
          progress.enrolled = false;
          progress.studiedToday = false;
          dirty = true;
          completedToday.push(track.name);
        }

        if (!progress.skillRewarded) {
          const reward = knowledgeRewards[id];
          if (reward) {
            awardSkillProgress({
              skills: reward.skills,
              baseXp: reward.baseXp,
              label: track.name
            });
          }
          progress.skillRewarded = true;
          dirty = true;
        }
      } else if (isActive && !participated) {
        awaiting.push(track.name);
      }

      if (!isActive && !completedFlag) {
        progress.studiedToday = false;
      }
    });

    if (completedToday.length) {
      addLog(`Finished ${formatList(completedToday)} after logging every session. Stellar dedication!`, 'info');
    }

    if (awaiting.length) {
      addLog(`${formatList(awaiting)} did not get study hours logged today. Progress pauses until you dive back in.`, 'warning');
    }

    if (dirty || completedToday.length || awaiting.length) {
      markDirty(STUDY_DIRTY_SECTIONS);
    }
  }

  return {
    enrollInKnowledgeTrack,
    dropKnowledgeTrack,
    allocateDailyStudy,
    advanceKnowledgeTracks
  };
}

