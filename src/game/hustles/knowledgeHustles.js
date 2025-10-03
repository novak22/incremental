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

export function createKnowledgeTrackPresenter(track) {
  let cachedSignature = null;
  let cachedViewModel = null;

  const compute = (state = getState()) => {
    const progress = getKnowledgeProgress(track.id, state);
    const availableMoney = Number(state?.money ?? 0);
    const signature = [
      Number(progress.daysCompleted) || 0,
      progress.enrolled ? '1' : '0',
      progress.completed ? '1' : '0',
      progress.studiedToday ? '1' : '0',
      Number.isFinite(availableMoney) ? availableMoney : 0
    ].join('|');

    if (cachedSignature !== signature) {
      cachedViewModel = buildTrackViewModel(track, state);
      cachedSignature = signature;
    }

    return cachedViewModel;
  };

  return {
    refresh(state = getState()) {
      cachedSignature = null;
      return compute(state);
    },
    getStatusLabel(state = getState()) {
      return compute(state)?.statusLabel;
    },
    getCtaLabel(state = getState()) {
      return compute(state)?.ctaLabel;
    },
    isEnrollable(state = getState()) {
      return Boolean(compute(state)?.canEnroll);
    },
    getViewModel(state = getState()) {
      return compute(state);
    },
    applyCardState(card, state = getState()) {
      if (!card) return;
      const snapshot = compute(state);
      if (!snapshot) return;

      const { progress, datasetFlags } = snapshot;
      card.classList.toggle('completed', Boolean(progress?.completed));
      card.dataset.inProgress = datasetFlags.inProgress ? 'true' : 'false';
      card.dataset.studiedToday = datasetFlags.studiedToday ? 'true' : 'false';
      card.dataset.enrolled = datasetFlags.enrolled ? 'true' : 'false';
    }
  };
}

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
  const orderedTracks = Object.values(KNOWLEDGE_TRACKS)
    .map((track, index) => ({ track, index }))
    .sort((a, b) => {
      const aFree = (Number(a.track.tuition) || 0) <= 0;
      const bFree = (Number(b.track.tuition) || 0) <= 0;
      if (aFree === bFree) {
        return a.index - b.index;
      }
      return aFree ? 1 : -1;
    })
    .map(entry => entry.track);

  return orderedTracks.map(track => {
    const presenter = createKnowledgeTrackPresenter(track);

    return {
      id: `study-${track.id}`,
      studyTrackId: track.id,
      name: track.name,
      tag: { label: 'Study', type: 'study' },
      description: track.description,
      details: [
        () => `🎓 Tuition: <strong>$${formatMoney(track.tuition)}</strong>`,
        () => `⏳ Study Load: <strong>${formatHours(track.hoursPerDay)} / day for ${formatDays(track.days)}</strong>`,
        () => presenter.getStatusLabel(),
        ...describeTrackEducationBonuses(track.id)
      ],
      action: {
        id: `enroll-${track.id}`,
        timeCost: 0,
        moneyCost: Number(track.tuition) || 0,
        label: () => presenter.getCtaLabel(),
        className: 'secondary',
        disabled: () => !presenter.isEnrollable(),
        onClick: () => {
          executeAction(() => {
            const { canEnroll } = presenter.refresh();
            if (!canEnroll) return;
            enrollInKnowledgeTrack(track.id);
          });
          checkDayEnd();
        }
      },
      cardState: (state, card) => presenter.applyCardState(card, state)
    };
  });
}
