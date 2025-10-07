import { getState } from '../../../core/state.js';
import { getKnowledgeProgress } from '../../requirements.js';
import { KNOWLEDGE_REWARDS } from '../../requirements/knowledgeTracks.js';
import { awardSkillProgress } from '../../skills/index.js';
import { announceStudyCompletion, markStudySectionsDirty } from './logging.js';
import { clampDay } from './utils.js';

export function createStudyCompletionHook(track) {
  const reward = KNOWLEDGE_REWARDS[track.id];
  return ({ state = getState(), instance } = {}) => {
    const workingState = state || getState();
    if (!workingState) return;

    const progress = getKnowledgeProgress(track.id, workingState);
    const wasCompleted = Boolean(progress.completed);

    const completionDay = clampDay(instance?.completedOnDay, workingState.day);
    const completedDays = Math.max(
      Number(instance?.progress?.daysCompleted) || 0,
      Number(progress.daysCompleted) || 0
    );

    progress.completed = true;
    progress.enrolled = false;
    progress.studiedToday = false;
    progress.totalDays = track.days;
    progress.hoursPerDay = track.hoursPerDay;
    progress.daysCompleted = Math.min(track.days, completedDays || track.days || 0);
    progress.completedOnDay = completionDay;

    if (!progress.skillRewarded) {
      if (reward) {
        const xpAwarded = awardSkillProgress({
          skills: reward.skills,
          baseXp: reward.baseXp,
          label: track.name,
          state: workingState
        });
        if (instance && xpAwarded > 0) {
          instance.skillXpAwarded = xpAwarded;
        }
      }
      progress.skillRewarded = true;
    }

    if (!wasCompleted) {
      announceStudyCompletion(track);
    }

    markStudySectionsDirty();
  };
}
