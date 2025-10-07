import { structuredClone } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { getKnowledgeProgress } from '../../requirements.js';
import { settleTuition } from './tuition.js';
import { announceStudyEnrollment, markStudySectionsDirty } from './logging.js';
import { clampDay, ensureNestedObject } from './utils.js';

function seedStudyMetadata({ track, target, tuition, seatPolicy }) {
  if (!target || typeof target !== 'object') {
    return;
  }
  if (!target.templateCategory) {
    target.templateCategory = 'study';
  }
  target.studyTrackId = track.id;
  target.trackId = track.id;
  target.tuitionCost = tuition;
  target.tuitionDue = tuition;
  target.educationBonuses = structuredClone(track.instantBoosts || []);

  const progressMetadata = ensureNestedObject(target, 'progress');
  if (!progressMetadata.templateCategory) {
    progressMetadata.templateCategory = 'study';
  }
  progressMetadata.studyTrackId = track.id;
  progressMetadata.trackId = track.id;
  progressMetadata.label = progressMetadata.label || `Study ${track.name}`;
  progressMetadata.completion = progressMetadata.completion || 'manual';
  if (progressMetadata.hoursPerDay == null && track.hoursPerDay != null) {
    progressMetadata.hoursPerDay = track.hoursPerDay;
  }
  if (progressMetadata.daysRequired == null && track.days != null) {
    progressMetadata.daysRequired = track.days;
  }

  const enrollmentMetadata = ensureNestedObject(target, 'enrollment');
  enrollmentMetadata.seatPolicy = enrollmentMetadata.seatPolicy || seatPolicy;
}

function finalizeMetadata({ track, target, tuition, seatPolicy, acceptedDay }) {
  seedStudyMetadata({ track, target, tuition, seatPolicy });
  if (!target || typeof target !== 'object') {
    return;
  }
  if (tuition > 0) {
    target.tuitionPaid = (Number(target.tuitionPaid) || 0) + tuition;
    target.tuitionPaidOnDay = acceptedDay;
  }
  const enrollmentMetadata = ensureNestedObject(target, 'enrollment');
  enrollmentMetadata.enrolledOnDay = acceptedDay;
}

function syncInstanceProgress({ instance, track }) {
  if (!instance || typeof instance !== 'object') {
    return;
  }
  if (instance.progress && typeof instance.progress === 'object') {
    instance.progress.studyTrackId = track.id;
    instance.progress.trackId = track.id;
    if (!instance.progress.label) {
      instance.progress.label = `Study ${track.name}`;
    }
    if (instance.progress.hoursPerDay == null && track.hoursPerDay != null) {
      instance.progress.hoursPerDay = track.hoursPerDay;
    }
    if (instance.progress.daysRequired == null && track.days != null) {
      instance.progress.daysRequired = track.days;
    }
  }
}

export function createStudyAcceptHook(track) {
  const tuition = Math.max(0, Number(track.tuition) || 0);
  const seatPolicy = tuition > 0 ? 'limited' : 'always-on';

  return ({ state = getState(), metadata = {}, instance } = {}) => {
    const workingState = state || getState();
    if (!workingState) return;

    const acceptedDay = clampDay(instance?.acceptedOnDay, workingState.day);

    const finalizeAcceptance = ({ state: finalizeState = workingState, acceptedEntry } = {}) => {
      const targetState = finalizeState || getState();
      if (!targetState) return;

      const progress = getKnowledgeProgress(track.id, targetState);

      settleTuition({ track, tuition, acceptedDay, progress });

      progress.enrolled = true;
      progress.completed = false;
      progress.enrolledOnDay = acceptedDay;
      progress.studiedToday = false;
      progress.totalDays = track.days;
      progress.hoursPerDay = track.hoursPerDay;
      progress.tuitionCost = tuition;

      finalizeMetadata({ track, target: metadata, tuition, seatPolicy, acceptedDay });
      if (acceptedEntry && acceptedEntry.metadata) {
        finalizeMetadata({
          track,
          target: acceptedEntry.metadata,
          tuition,
          seatPolicy,
          acceptedDay
        });
      }

      const orchestratorHandlesMessaging = Boolean(
        metadata?.enrollment?.orchestratorHandlesMessaging
          || acceptedEntry?.metadata?.enrollment?.orchestratorHandlesMessaging
      );

      syncInstanceProgress({ instance, track });

      if (!orchestratorHandlesMessaging) {
        announceStudyEnrollment(track, tuition);
      }
      markStudySectionsDirty();

      if (instance && typeof instance === 'object') {
        delete instance.__finalizeStudyAcceptance;
        delete instance.__cancelStudyAcceptance;
      }
    };

    const cancelAcceptance = () => {
      if (instance && typeof instance === 'object') {
        delete instance.__finalizeStudyAcceptance;
        delete instance.__cancelStudyAcceptance;
      }
    };

    seedStudyMetadata({ track, target: metadata, tuition, seatPolicy });

    if (instance && typeof instance === 'object') {
      instance.__finalizeStudyAcceptance = finalizeAcceptance;
      instance.__cancelStudyAcceptance = cancelAcceptance;
    }
  };
}
