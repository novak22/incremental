import { getState } from '../../core/state.js';
import { KNOWLEDGE_TRACKS } from './knowledgeTracks.js';

export function getKnowledgeProgress(id, target = getState()) {
  target.progress = target.progress || {};
  target.progress.knowledge = target.progress.knowledge || {};
  if (!target.progress.knowledge[id]) {
    const track = KNOWLEDGE_TRACKS[id];
    target.progress.knowledge[id] = {
      daysCompleted: 0,
      studiedToday: false,
      completed: false,
      enrolled: false,
      totalDays: track?.days ?? 0,
      hoursPerDay: track?.hoursPerDay ?? 0,
      tuitionCost: track?.tuition ?? 0,
      enrolledOnDay: null,
      skillRewarded: false
    };
  }
  const track = KNOWLEDGE_TRACKS[id];
  const progress = target.progress.knowledge[id];
  if (track) {
    progress.totalDays = track.days;
    progress.hoursPerDay = track.hoursPerDay;
    progress.tuitionCost = track.tuition ?? 0;
    progress.completed = progress.completed || progress.daysCompleted >= track.days;
  }
  progress.skillRewarded = Boolean(progress.skillRewarded);
  return progress;
}

export default getKnowledgeProgress;
