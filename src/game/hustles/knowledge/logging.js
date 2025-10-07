import { addLog } from '../../../core/log.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import { STUDY_DIRTY_SECTIONS } from './constants.js';
import { formatHours, formatMoney } from '../../../core/helpers.js';

export function announceStudyEnrollment(track, tuition) {
  addLog(
    `You claimed a seat in ${track.name}! ${
      tuition > 0 ? `Tuition paid for $${formatMoney(tuition)}.` : 'No tuition due.'
    } Log ${formatHours(track.hoursPerDay)} each day from the action queue to progress.`,
    'info'
  );
}

export function announceStudyCompletion(track) {
  addLog(`Finished ${track.name} after logging every session. Stellar dedication!`, 'info');
}

export function markStudySectionsDirty() {
  markDirty(STUDY_DIRTY_SECTIONS);
}
