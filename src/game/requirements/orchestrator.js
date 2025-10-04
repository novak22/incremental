import { DEFAULT_DAY_HOURS } from '../../core/constants.js';
import { formatList, formatMoney } from '../../core/helpers.js';
import { markDirty } from '../../ui/invalidation.js';

export const MIN_MANUAL_BUFFER_HOURS = Math.max(2, Math.round(DEFAULT_DAY_HOURS * 0.25));

export function createRequirementsOrchestrator({
  getState,
  getKnowledgeProgress,
  knowledgeTracks,
  knowledgeRewards,
  estimateMaintenanceReserve,
  spendMoney,
  spendTime,
  recordCostContribution,
  recordTimeContribution,
  awardSkillProgress,
  addLog
}) {
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
    progress.enrolledOnDay = state.day;
    progress.studiedToday = false;

    addLog(`You enrolled in ${track.name}! Tuition paid${tuition > 0 ? ` for $${formatMoney(tuition)}` : ''}.`, 'info');

    allocateDailyStudy({ trackIds: [id], triggeredByEnrollment: true });

    markDirty('cards');

    return { success: true };
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

    addLog(`You dropped ${track.name}. Tuition stays paid, but your schedule opens back up.`, 'warning');

    markDirty('cards');

    return { success: true };
  }

  function allocateDailyStudy({ trackIds, triggeredByEnrollment = false } = {}) {
    const state = getState();
    if (!state) return;

    const studied = [];
    const reserveSkipped = [];
    const timeSkipped = [];

    const tracks = trackIds
      ? trackIds.map(id => knowledgeTracks[id]).filter(Boolean)
      : Object.values(knowledgeTracks);

    const maintenanceReserve = estimateMaintenanceReserve(state);
    let availableStudyTime = Math.max(0, state.timeLeft - maintenanceReserve - MIN_MANUAL_BUFFER_HOURS);

    for (const track of tracks) {
      const progress = getKnowledgeProgress(track.id);
      if (!progress.enrolled || progress.completed) continue;
      if (progress.studiedToday) continue;

      const hours = Number(track.hoursPerDay) || 0;
      if (hours <= 0) {
        progress.studiedToday = true;
        continue;
      }

      if (availableStudyTime < hours) {
        reserveSkipped.push(track.name);
        continue;
      }

      if (state.timeLeft < hours) {
        timeSkipped.push(track.name);
        continue;
      }

      spendTime(hours);
      availableStudyTime = Math.max(0, availableStudyTime - hours);
      recordTimeContribution({
        key: `study:${track.id}:time`,
        label: `📘 ${track.name} study`,
        hours,
        category: 'study'
      });
      progress.studiedToday = true;
      studied.push(track.name);
    }

    if (studied.length) {
      const prefix = triggeredByEnrollment ? 'Class time booked today for' : 'Study sessions reserved for';
      addLog(`${prefix} ${formatList(studied)}.`, 'info');
    }

    if (studied.length || reserveSkipped.length || timeSkipped.length) {
      markDirty('cards');
    }

    if (reserveSkipped.length) {
      addLog(
        `${formatList(reserveSkipped)} were deferred to leave breathing room for upkeep commitments.`,
        'warning'
      );
    }

    if (timeSkipped.length) {
      addLog(`${formatList(timeSkipped)} could not fit into today's schedule.`, 'warning');
    }
  }

  function advanceKnowledgeTracks() {
    const state = getState();
    if (!state) return;

    const completedToday = [];
    const stalled = [];

    Object.entries(state.progress.knowledge || {}).forEach(([id, progress]) => {
      const track = knowledgeTracks[id];
      if (!track) {
        progress.studiedToday = false;
        return;
      }
      if (progress.completed) {
        progress.studiedToday = false;
        return;
      }

      if (!progress.enrolled) {
        progress.studiedToday = false;
        return;
      }

      if (progress.studiedToday) {
        const before = progress.daysCompleted;
        progress.daysCompleted = Math.min(track.days, before + 1);
        progress.studiedToday = false;
        if (progress.daysCompleted >= track.days) {
          progress.completed = true;
          progress.enrolled = false;
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
          }
          completedToday.push(track.name);
        }
      } else if (progress.daysCompleted > 0 || progress.enrolled) {
        stalled.push(track.name);
      }
    });

    if (completedToday.length) {
      addLog(`Finished ${formatList(completedToday)}! New opportunities unlocked.`, 'info');
    }
    if (stalled.length) {
      addLog(`${formatList(stalled)} did not get study time today. Progress paused.`, 'warning');
    }

    if (completedToday.length || stalled.length) {
      markDirty('cards');
    }
  }

  return {
    enrollInKnowledgeTrack,
    dropKnowledgeTrack,
    allocateDailyStudy,
    advanceKnowledgeTracks
  };
}

