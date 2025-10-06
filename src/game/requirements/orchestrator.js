import { formatHours, formatList, formatMoney, structuredClone } from '../../core/helpers.js';
import { markDirty } from '../../core/events/invalidationBus.js';
import { ensureDailyOffersForDay, getAvailableOffers, acceptHustleOffer } from '../hustles.js';
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

  function enrollInKnowledgeTrack(id) {
    const state = getState();
    const track = knowledgeTracks[id];
    if (!state || !track) return { success: false, reason: 'missing' };

    const progress = getKnowledgeProgress(id);
    if (progress.completed) {
      addLog(`${track.name} is already complete. Grab a celebratory pastry instead.`, 'info');
      return { success: false, reason: 'completed' };
    }
    if (progress.enrolled) {
      addLog(`You're already enrolled in ${track.name}.`, 'info');
      return { success: false, reason: 'enrolled' };
    }

    const tuition = Number(track.tuition) || 0;
    if (tuition > 0 && state.money < tuition) {
      addLog(`You need $${formatMoney(tuition)} ready to enroll in ${track.name}.`, 'warning');
      return { success: false, reason: 'money' };
    }

    const definitionId = getStudyActionId(track.id);
    const currentDay = Math.max(1, Math.floor(Number(state.day) || 1));

    ensureDailyOffersForDay({ state });

    const marketOffers = getAvailableOffers(state, { includeUpcoming: true }).filter(offer => {
      return offer.definitionId === definitionId && offer.claimed !== true;
    });

    const availableOffer = marketOffers
      .filter(offer => offer.availableOnDay <= currentDay)
      .sort((a, b) => a.availableOnDay - b.availableOnDay)[0] || null;
    const upcomingOffer = marketOffers
      .filter(offer => offer.availableOnDay > currentDay)
      .sort((a, b) => a.availableOnDay - b.availableOnDay)[0] || null;

    if (!availableOffer) {
      if (upcomingOffer) {
        addLog(
          `${track.name} opens new seats on day ${upcomingOffer.availableOnDay}. Save the date!`,
          'info'
        );
      } else {
        addLog(`Seats for ${track.name} are booked today. Check back tomorrow!`, 'warning');
      }
      return { success: false, reason: 'no_offer' };
    }

    const metadata = structuredClone(availableOffer.metadata || {});
    const baseProgress = typeof metadata.progress === 'object' && metadata.progress !== null
      ? metadata.progress
      : {};
    const seatPolicy = metadata.seatPolicy || (tuition > 0 ? 'limited' : 'always-on');

    metadata.studyTrackId = track.id;
    metadata.trackId = track.id;
    metadata.tuitionCost = tuition;
    metadata.tuitionDue = tuition;
    metadata.educationBonuses = structuredClone(track.instantBoosts || []);
    metadata.enrolledOnDay = currentDay;
    metadata.progress = {
      ...baseProgress,
      studyTrackId: track.id,
      trackId: track.id,
      label: baseProgress.label || `Study ${track.name}`,
      completion: baseProgress.completion || 'manual'
    };
    metadata.enrollment = {
      ...(typeof metadata.enrollment === 'object' && metadata.enrollment !== null
        ? metadata.enrollment
        : {}),
      seatPolicy,
      enrolledOnDay: currentDay
    };

    const acceptancePayload = {
      ...availableOffer,
      metadata
    };

    const accepted = acceptHustleOffer(acceptancePayload, { state });
    if (!accepted) {
      addLog(`Someone else snagged the last seat in ${track.name} moments before you.`, 'warning');
      return { success: false, reason: 'claim_failed' };
    }

    if (tuition > 0) {
      spendMoney(tuition);
      recordCostContribution({
        key: `study:${track.id}:tuition`,
        label: `🎓 ${track.name} tuition`,
        amount: tuition,
        category: 'investment'
      });
    }

    progress.enrolled = true;
    progress.enrolledOnDay = currentDay;
    progress.studiedToday = false;
    if (tuition > 0) {
      progress.tuitionPaid = (Number(progress.tuitionPaid) || 0) + tuition;
      progress.tuitionPaidOnDay = currentDay;
    }

    const acceptedMetadata = typeof accepted.metadata === 'object' && accepted.metadata !== null
      ? accepted.metadata
      : {};
    accepted.metadata = {
      ...acceptedMetadata,
      studyTrackId: track.id,
      trackId: track.id,
      tuitionCost: tuition,
      tuitionDue: tuition,
      tuitionPaid: tuition,
      tuitionPaidOnDay: currentDay,
      enrolledOnDay: currentDay,
      educationBonuses: structuredClone(track.instantBoosts || []),
      seatPolicy
    };
    accepted.metadata.progress = {
      ...(acceptedMetadata.progress || {}),
      ...metadata.progress
    };
    const acceptedEnrollment = typeof acceptedMetadata.enrollment === 'object' && acceptedMetadata.enrollment !== null
      ? acceptedMetadata.enrollment
      : {};
    accepted.metadata.enrollment = {
      ...acceptedEnrollment,
      ...metadata.enrollment
    };

    addLog(
      `You claimed a seat in ${track.name}! ${tuition > 0 ? `Tuition paid for $${formatMoney(tuition)}.` : 'No tuition due.'} ` +
        `Log ${formatHours(track.hoursPerDay)} each day from the action queue to progress.`,
      'info'
    );

    markDirty(STUDY_DIRTY_SECTIONS);

    return { success: true, offer: accepted };
  }

  function dropKnowledgeTrack(id) {
    const state = getState();
    const track = knowledgeTracks[id];
    if (!state || !track) {
      return { success: false, reason: 'missing' };
    }

    const progress = getKnowledgeProgress(id, state);
    if (!progress.enrolled || progress.completed) {
      addLog(`You're not currently enrolled in ${track.name}.`, 'info');
      return { success: false, reason: 'not_enrolled' };
    }

    progress.enrolled = false;
    progress.studiedToday = false;
    progress.enrolledOnDay = null;

    removeActiveStudyInstance(id, state);

    addLog(`You dropped ${track.name}. Tuition stays paid, but your schedule opens back up.`, 'warning');

    markDirty(STUDY_DIRTY_SECTIONS);

    return { success: true };
  }

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

