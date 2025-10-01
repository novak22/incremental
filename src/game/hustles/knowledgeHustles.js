import { formatDays, formatHours, formatMoney } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import {
  KNOWLEDGE_TRACKS,
  enrollInKnowledgeTrack,
  getKnowledgeProgress
} from '../requirements.js';
import { describeTrackEducationBonuses } from '../educationEffects.js';

export function buildTrackViewModel(track, state = getState()) {
  const progress = getKnowledgeProgress(track.id, state);
  const tuition = Number(track.tuition) || 0;
  const parsedDaysCompleted = Number(progress.daysCompleted);
  const daysCompleted = Number.isFinite(parsedDaysCompleted) ? parsedDaysCompleted : 0;
  const remainingDays = Math.max(0, Number(track.days) - daysCompleted);
  const inProgress = Boolean(progress.enrolled && !progress.completed);

  let statusLabel = '🚀 Status: <strong>Ready to enroll</strong>';
  let ctaLabel = tuition > 0 ? `Enroll for $${formatMoney(tuition)}` : 'Enroll Now';

  if (progress.completed) {
    statusLabel = '✅ Status: <strong>Complete</strong>';
    ctaLabel = 'Course Complete';
  } else if (progress.enrolled) {
    statusLabel = `📚 Status: <strong>${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining</strong>`;
    ctaLabel =
      remainingDays === 0
        ? 'Graduation Pending'
        : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`;
  }

  const availableMoney = Number(state?.money ?? 0);
  const canAfford = tuition === 0 || availableMoney >= tuition;
  const canEnroll = !progress.completed && !progress.enrolled && canAfford;

  const datasetFlags = {
    inProgress,
    studiedToday: Boolean(progress.studiedToday),
    enrolled: Boolean(progress.enrolled)
  };

  return {
    progress,
    statusLabel,
    ctaLabel,
    canEnroll,
    datasetFlags
  };
}

export function createKnowledgeHustles() {
  return Object.values(KNOWLEDGE_TRACKS).map(track => ({
    id: `study-${track.id}`,
    studyTrackId: track.id,
    name: track.name,
    tag: { label: 'Study', type: 'study' },
    description: track.description,
    details: [
      () => `🎓 Tuition: <strong>$${formatMoney(track.tuition)}</strong>`,
      () => `⏳ Study Load: <strong>${formatHours(track.hoursPerDay)} / day for ${formatDays(track.days)}</strong>`,
      () => buildTrackViewModel(track).statusLabel,
      ...describeTrackEducationBonuses(track.id)
    ],
    action: {
      id: `enroll-${track.id}`,
      timeCost: 0,
      moneyCost: Number(track.tuition) || 0,
      label: () => buildTrackViewModel(track).ctaLabel,
      className: 'secondary',
      disabled: () => !buildTrackViewModel(track).canEnroll,
      onClick: () => {
        executeAction(() => {
          const { progress, canEnroll } = buildTrackViewModel(track);
          if (!canEnroll) return;
          enrollInKnowledgeTrack(track.id);
        });
        checkDayEnd();
      }
    },
    cardState: (_state, card) => {
      if (!card) return;
      const { progress, datasetFlags } = buildTrackViewModel(track);
      card.classList.toggle('completed', progress.completed);
      card.dataset.inProgress = datasetFlags.inProgress ? 'true' : 'false';
      card.dataset.studiedToday = datasetFlags.studiedToday ? 'true' : 'false';
      card.dataset.enrolled = datasetFlags.enrolled ? 'true' : 'false';
    }
  }));
}
