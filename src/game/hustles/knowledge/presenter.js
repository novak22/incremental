import { formatMoney } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { getKnowledgeProgress } from '../../requirements.js';
import { resolveMarketSnapshot } from './offers.js';

export function buildTrackViewModel(
  track,
  state = getState(),
  marketSnapshot = resolveMarketSnapshot(track, state)
) {
  const progress = getKnowledgeProgress(track.id, state);
  const tuition = Number(track.tuition) || 0;
  const parsedDaysCompleted = Number(progress.daysCompleted);
  const daysCompleted = Number.isFinite(parsedDaysCompleted) ? parsedDaysCompleted : 0;
  const remainingDays = Math.max(0, Number(track.days) - daysCompleted);
  const inProgress = Boolean(progress.enrolled && !progress.completed);
  const isFree = tuition <= 0;

  const offer = marketSnapshot?.offer || null;
  const upcoming = marketSnapshot?.upcoming || null;
  const seatAvailable = Boolean(offer);

  let availabilityNote = '';
  if (progress.completed) {
    availabilityNote = '🪑 All done — diploma unlocked!';
  } else if (progress.enrolled) {
    availabilityNote = '🪑 Seat reserved — keep logging study hours.';
  } else if (seatAvailable) {
    availabilityNote = isFree
      ? '🪑 Always-on enrollment — grab a seat whenever you like.'
      : '🪑 Limited seat available today. Claim it before it disappears!';
  } else if (upcoming) {
    availabilityNote = `🪑 Next seat opens on day ${upcoming.availableOnDay}.`;
  } else {
    availabilityNote = '🪑 Seats are full today. Check back tomorrow!';
  }

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
  const canEnroll = !progress.completed && !progress.enrolled && canAfford && seatAvailable;

  const datasetFlags = {
    inProgress,
    studiedToday: Boolean(progress.studiedToday),
    enrolled: Boolean(progress.enrolled),
    seatAvailable
  };

  return {
    progress,
    statusLabel,
    ctaLabel,
    canEnroll,
    availabilityNote,
    datasetFlags,
    offer,
    upcoming,
    tuition,
    isFree
  };
}

export function createKnowledgeTrackPresenter(track) {
  let cachedSignature = null;
  let cachedViewModel = null;

  const compute = (state = getState()) => {
    const progress = getKnowledgeProgress(track.id, state);
    const availableMoney = Number(state?.money ?? 0);
    const { offer, upcoming } = resolveMarketSnapshot(track, state);
    const signature = [
      Number(progress.daysCompleted) || 0,
      progress.enrolled ? '1' : '0',
      progress.completed ? '1' : '0',
      progress.studiedToday ? '1' : '0',
      offer ? offer.id : 'none',
      upcoming ? upcoming.availableOnDay : 'none',
      Number.isFinite(availableMoney) ? availableMoney : 0
    ].join('|');

    if (cachedSignature !== signature) {
      cachedViewModel = buildTrackViewModel(track, state, { offer, upcoming });
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
      const snapshot = compute(state);
      return Boolean(snapshot?.canEnroll);
    },
    getViewModel(state = getState()) {
      return compute(state);
    },
    getAvailabilityNote(state = getState()) {
      return compute(state)?.availabilityNote || '';
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
      card.dataset.seatAvailable = datasetFlags.seatAvailable ? 'true' : 'false';
    }
  };
}
