import { formatMoney } from '../../../core/helpers.js';

export function createStudyEnrollment({
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
}) {
  function enrollInKnowledgeTrack(id) {
    const state = getState();
    const track = knowledgeTracks[id];
    if (!state || !track) {
      return { success: false, reason: 'missing' };
    }

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
    const tuitionPaidBaseline = Number(progress.tuitionPaid) || 0;

    const seatResult = seatManager.claimSeat({
      track,
      tuition,
      currentDay,
      definitionId
    });

    if (!seatResult.success) {
      return { success: false, reason: seatResult.reason };
    }

    const tuitionAlreadyHandled = tuition > 0
      && progress.tuitionPaidOnDay === currentDay
      && (Number(progress.tuitionPaid) || 0) >= tuition
      && (Number(progress.tuitionPaid) || 0) > tuitionPaidBaseline;

    if (tuition > 0 && !tuitionAlreadyHandled) {
      tuitionLogging.payTuition({ track, tuition, progress, currentDay });
    }

    progress.enrolled = true;
    progress.enrolledOnDay = currentDay;
    progress.studiedToday = false;

    if (tuition <= 0 && typeof progress.tuitionPaid !== 'number') {
      progress.tuitionPaid = Number(progress.tuitionPaid) || 0;
    }

    tuitionLogging.logEnrollmentSuccess({ track, tuition });
    markDirty(STUDY_DIRTY_SECTIONS);

    return { success: true, offer: seatResult.offer };
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
    seatManager.releaseSeats({ trackId: track.id, trackName: track.name, state });

    addLog(`You dropped ${track.name}. Tuition stays paid, but your schedule opens back up.`, 'warning');
    markDirty(STUDY_DIRTY_SECTIONS);

    return { success: true };
  }

  return {
    enrollInKnowledgeTrack,
    dropKnowledgeTrack
  };
}
